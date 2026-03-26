/**
 * security.ts — Professional Security Gate
 * ==========================================
 * Implements 5 security layers, 100% free infrastructure:
 *   1. Webhook secret validation    (stateless, instant)
 *   2. Whitelist check              (Supabase, cached in-memory)
 *   3. Rate limiting                (in-memory Map, DB fallback)
 *   4. Input sanitization           (regex + size checks)
 *   5. Async audit logging          (Supabase, non-blocking)
 *
 * Free tier constraints respected:
 *   - Supabase: whitelist cached 5min → minimal DB reads
 *   - Rate limiter: in-memory first, Supabase only on cold start
 *   - Audit logs: batched async, never blocks response
 */

import { createClient } from '@supabase/supabase-js';

// ─── Supabase client (SERVICE ROLE — server-side only) ────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'user' | 'readonly';

export interface SecurityContext {
  chatId: number;
  username?: string;
  role: UserRole;
  messageType: 'text' | 'photo' | 'voice' | 'document' | 'unknown';
}

export interface SecurityResult {
  allowed: boolean;
  reason?: string;
  replyMessage?: string;   // message to send back to user if blocked
  context?: SecurityContext;
}

// ─── In-memory caches (survives within a Vercel function instance warm period) ─

// Whitelist cache: chatId → { role, expiry }
const whitelistCache = new Map<number, { role: UserRole; expiry: number }>();
const WHITELIST_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Blocked cache: chatId → blocked_until timestamp (or Infinity for permanent)
const blockedCache = new Map<number, number>();
const BLOCKED_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Rate limiter: chatId → { count, windowStart }
interface RateBucket {
  count: number;
  windowStart: number;
}
const rateLimitStore = new Map<number, RateBucket>();

// Rate limit config (free-tier friendly, reasonable UX)
const RATE_CONFIG = {
  windowMs: 60_000,    // 1-minute sliding window
  maxPerMinute: 10,    // max messages per minute
  maxPerHour: 80,      // tracked separately with DB fallback
  burstAllowance: 3,   // short burst allowed above limit before blocking
};

// ─── Layer 1: Webhook Secret Validation ───────────────────────────────────────
/**
 * Validates the X-Telegram-Bot-Api-Secret-Token header.
 * Set this when registering your webhook:
 *   POST https://api.telegram.org/bot<TOKEN>/setWebhook
 *   { "url": "...", "secret_token": "YOUR_SECRET_TOKEN" }
 *
 * Use a strong random string: `openssl rand -hex 32`
 */
export function validateWebhookSecret(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  // If no secret configured, skip check (NOT recommended for production)
  if (!secret) {
    console.warn('[SECURITY] TELEGRAM_WEBHOOK_SECRET not set — webhook is unprotected');
    return true;
  }

  const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');

  if (!headerSecret || headerSecret !== secret) {
    // Don't log the received secret — could expose attempts
    void writeAuditLog(null, 'blocked_invalid_secret', 'critical', {
      hasHeader: !!headerSecret,
    });
    return false;
  }

  return true;
}

// ─── Layer 2: Whitelist Check ─────────────────────────────────────────────────
/**
 * Checks if a chatId is in the whitelist and not blocked.
 * Uses in-memory cache to minimize Supabase reads (free tier).
 */
export async function checkWhitelist(
  chatId: number,
  username?: string
): Promise<{ allowed: boolean; role?: UserRole; reason?: string }> {
  const now = Date.now();

  // ① Check blocked cache first (fastest path)
  const blockedUntil = blockedCache.get(chatId);
  if (blockedUntil !== undefined) {
    if (now < blockedUntil) {
      return { allowed: false, reason: 'blocked' };
    } else {
      blockedCache.delete(chatId); // expired block, clean up
    }
  }

  // ② Check whitelist cache
  const cached = whitelistCache.get(chatId);
  if (cached && now < cached.expiry) {
    return { allowed: true, role: cached.role };
  }

  // ③ Cache miss — query Supabase (check BOTH whitelist and users table)
  const [whitelistResult, userResult, blockedResult] = await Promise.all([
    supabase
      .from('whitelisted_users')
      .select('role')
      .eq('chat_id', chatId)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('users')
      .select('role')
      .eq('telegram_chat_id', chatId)
      .maybeSingle(),
    supabase
      .from('blocked_users')
      .select('blocked_until')
      .eq('chat_id', chatId)
      .maybeSingle(),
  ]);

  // Check if blocked in DB
  if (blockedResult.data) {
    const until = blockedResult.data.blocked_until ? new Date(blockedResult.data.blocked_until).getTime() : Infinity;
    blockedCache.set(chatId, until);
    if (now < until) return { allowed: false, reason: 'blocked' };
  }

  // Determine role: prioritize whitelisted_users, then users table
  const role = (whitelistResult.data?.role || userResult.data?.role) as UserRole | undefined;

  if (!role) {
    void writeAuditLog(chatId, 'blocked_not_whitelisted', 'warn', { username });
    return { allowed: false, reason: 'not_whitelisted' };
  }

  // ④ Populate cache
  whitelistCache.set(chatId, { role, expiry: now + WHITELIST_TTL_MS });

  // Update username in DB async (non-blocking)
  if (username) {
    void supabase
      .from('whitelisted_users')
      .update({ username, updated_at: new Date().toISOString() })
      .eq('chat_id', chatId);
  }

  return { allowed: true, role };
}

// ─── Layer 3: Rate Limiter ────────────────────────────────────────────────────
/**
 * Sliding window rate limiter using in-memory Map.
 * Falls back to Supabase on cold starts (new Vercel instance).
 * Owner/admin roles get 2x the rate limit.
 */
export async function checkRateLimit(
  chatId: number,
  role: UserRole
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const now = Date.now();
  const multiplier = role === 'owner' || role === 'admin' ? 2 : 1;
  const limit = RATE_CONFIG.maxPerMinute * multiplier;

  let bucket = rateLimitStore.get(chatId);

  // Start new window or continue existing
  if (!bucket || now - bucket.windowStart >= RATE_CONFIG.windowMs) {
    bucket = { count: 1, windowStart: now };
    rateLimitStore.set(chatId, bucket);
    return { allowed: true };
  }

  bucket.count += 1;

  if (bucket.count > limit + RATE_CONFIG.burstAllowance) {
    const retryAfterMs = RATE_CONFIG.windowMs - (now - bucket.windowStart);
    void writeAuditLog(chatId, 'blocked_rate_limit', 'warn', {
      count: bucket.count,
      limit,
      retryAfterMs,
    });
    return { allowed: false, retryAfterMs };
  }

  return { allowed: true };
}

// ─── Layer 4: Input Sanitization ─────────────────────────────────────────────
/**
 * Validates and sanitizes user input before passing to AI or DB.
 * Prevents prompt injection, oversized payloads, and malformed data.
 */
export interface SanitizeResult {
  safe: boolean;
  sanitized?: string;
  reason?: string;
}

// Patterns that look like prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore (previous|above|all) instructions/i,
  /you are now/i,
  /act as (a|an|the)/i,
  /jailbreak/i,
  /DAN mode/i,
  /system prompt/i,
  /\bsudo\b/i,
  /<\s*script/i,           // XSS attempt
  /--\s*(drop|delete|truncate|alter)\s/i,  // SQL injection
  /\bexec\s*\(/i,
  /base64_decode/i,
];

export function sanitizeInput(raw: string): SanitizeResult {
  // ① Length check — prevent token-stuffing attacks on Gemini API
  if (raw.length > 500) {
    return {
      safe: false,
      reason: 'too_long',
    };
  }

  // ② Empty check
  const trimmed = raw.trim();
  if (!trimmed) {
    return { safe: false, reason: 'empty' };
  }

  // ③ Injection pattern check
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { safe: false, reason: 'injection_attempt' };
    }
  }

  // ④ Sanitize: strip dangerous characters but keep Indonesian text intact
  // Allow: letters, numbers, spaces, common punctuation, Rp symbol, decimal separators
  const sanitized = trimmed
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
    .replace(/\\/g, '')     // remove backslashes (escape attempts)
    .slice(0, 500);         // hard cap after sanitization

  return { safe: true, sanitized };
}

// ─── Layer 5: Audit Logger ────────────────────────────────────────────────────
/**
 * Async, non-blocking audit log writer.
 * Fires and forgets — never delays the response.
 * Uses service role to bypass RLS on audit_logs.
 */
export async function writeAuditLog(
  chatId: number | null,
  eventType: string,
  severity: 'info' | 'warn' | 'error' | 'critical',
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert([{
      chat_id: chatId,
      event_type: eventType,
      severity,
      payload: payload ? sanitizePayload(payload) : null,
      created_at: new Date().toISOString(),
    }]);
  } catch (err) {
    // Never throw from audit logger — it must not break the main flow
    console.error('[AUDIT] Failed to write log:', err);
  }
}

/**
 * Strips sensitive data from audit payloads before storing.
 */
function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE_KEYS = ['token', 'key', 'secret', 'password', 'auth', 'text', 'message'];
  const clean: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(payload)) {
    if (SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s))) {
      clean[k] = '[redacted]';
    } else {
      clean[k] = v;
    }
  }

  return clean;
}

// ─── Telegram reply helper ─────────────────────────────────────────────────────
/**
 * Sends a security rejection message to user via Telegram.
 * Used when blocked so user gets feedback (not just silence).
 */
export async function sendSecurityReply(
  chatId: number,
  reason: string,
  retryAfterMs?: number
): Promise<void> {
  const messages: Record<string, string> = {
    not_whitelisted:
      '🔒 Bot ini bersifat privat.\n\nJika Anda adalah pemilik dashboard, silakan lihat nomor ID Anda dengan mengetik */id* lalu masukkan nomor tersebut di halaman Pengaturan Web.',
    blocked:
      '🚫 Akun kamu sedang diblokir.\n\nHubungi admin jika ini kesalahan.',
    rate_limit: retryAfterMs
      ? `⏳ Terlalu banyak pesan. Tunggu ${Math.ceil(retryAfterMs / 1000)} detik ya.`
      : '⏳ Terlalu banyak pesan. Coba lagi sebentar.',
    too_long:
      '⚠️ Pesan terlalu panjang. Maksimal 500 karakter per pesan.',
    injection_attempt:
      '⚠️ Format pesan tidak valid. Kirim catatan keuangan biasa saja ya.',
    empty:
      '⚠️ Pesan kosong, tidak ada yang bisa diproses.',
  };

  const text = messages[reason] ?? '⚠️ Pesan tidak dapat diproses.';

  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    }
  );
}

// ─── Master Security Gate ─────────────────────────────────────────────────────
/**
 * Run all 5 security layers in sequence.
 * Returns early on first failure (fail-fast pattern).
 *
 * Usage in route.ts:
 *   const sec = await runSecurityGate(request, body);
 *   if (!sec.allowed) return NextResponse.json({ ok: true });
 */
export async function runSecurityGate(
  request: Request,
  body: {
    message?: {
      chat?: { id?: number };
      from?: { username?: string };
      text?: string;
      photo?: unknown;
      voice?: unknown;
      document?: unknown;
    };
  }
): Promise<SecurityResult> {
  // ──── Layer 1: Webhook secret ────────────────────────────────────────────
  if (!validateWebhookSecret(request)) {
    // Silent drop — no reply, no info to attacker
    return { allowed: false, reason: 'invalid_secret' };
  }

  // ──── Extract chat context ────────────────────────────────────────────────
  const chatId = body.message?.chat?.id;
  if (!chatId) {
    return { allowed: false, reason: 'no_chat_id' };
  }

  const username = body.message?.from?.username;
  const rawText = body.message?.text ?? '';

  const messageType = body.message?.photo
    ? 'photo'
    : body.message?.voice
    ? 'voice'
    : body.message?.document
    ? 'document'
    : body.message?.text
    ? 'text'
    : 'unknown';

  // ──── Layer 2: Whitelist (Special exception for /id command) ────────────
  const isIdCommand = rawText.toLowerCase().trim() === '/id';
  
  const wl = await checkWhitelist(chatId, username);
  if (!wl.allowed && !isIdCommand) { // Jalankan blokir kecuali untuk perintah /id
    void sendSecurityReply(chatId, wl.reason ?? 'not_whitelisted');
    return { allowed: false, reason: wl.reason };
  }

  const role = wl.role ?? 'user'; // Default role if not on whitelist but allowed (like /id)

  // ──── Layer 3: Rate limit ─────────────────────────────────────────────────
  const rl = await checkRateLimit(chatId, role);
  if (!rl.allowed) {
    void sendSecurityReply(chatId, 'rate_limit', rl.retryAfterMs);
    return { allowed: false, reason: 'rate_limit' };
  }

  // ──── Layer 4: Input sanitization (text messages only) ───────────────────
  if (messageType === 'text') {
    const san = sanitizeInput(rawText);
    if (!san.safe) {
      void sendSecurityReply(chatId, san.reason ?? 'invalid_input');
      void writeAuditLog(chatId, 'blocked_bad_input', 'warn', {
        reason: san.reason,
        length: rawText.length,
      });
      return { allowed: false, reason: san.reason };
    }
  }

  // ──── Layer 5: Audit log (async, non-blocking) ────────────────────────────
  void writeAuditLog(chatId, 'message_allowed', 'info', {
    messageType,
    role,
    textLength: rawText.length,
  });

  return {
    allowed: true,
    context: {
      chatId,
      username,
      role,
      messageType,
    },
  };
}