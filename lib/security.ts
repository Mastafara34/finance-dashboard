/**
 * security.ts — Professional Security Gate (Upgraded with Redis)
 * ==============================================================
 * Implements 5 security layers, using Upstash Redis for global state:
 *   1. Webhook secret validation    (Header based)
 *   2. Whitelist check              (Supabase + Redis L2 Cache)
 *   3. Rate limiting                (Atomic Global Redis INCR)
 *   4. Input sanitization           (Regex + Prompt Injection guard)
 *   5. Async audit logging          (Supabase)
 */

import { createClient } from '@supabase/supabase-js';
import { redis, KEY_PREFIX } from './redis';

// ─── Supabase client (SERVICE ROLE) ──────────────────────────────────────────
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
  replyMessage?: string;
  context?: SecurityContext;
}

// ─── Caches & Config ──────────────────────────────────────────────────────────
const whitelistCache = new Map<number, { role: UserRole; expiry: number }>();
const WHITELIST_TTL_S = 300; // 5 minutes

const blockedCache = new Map<number, number>();
const BLOCKED_TTL_S = 600; // 10 minutes

const RATE_CONFIG = {
  windowS: 60,
  maxPerMinute: 10,
  burstAllowance: 3,
};

// ─── Layer 1: Webhook Secret Validation ───────────────────────────────────────
export function validateWebhookSecret(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return true;
  const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
  return headerSecret === secret;
}

// ─── Layer 2: Whitelist Check ─────────────────────────────────────────────────
export async function checkWhitelist(
  chatId: number,
  username?: string
): Promise<{ allowed: boolean; role?: UserRole; reason?: string }> {
  const now = Date.now();

  // ① L1 Cache (Memory)
  const blockedUntil = blockedCache.get(chatId);
  if (blockedUntil && now < blockedUntil) return { allowed: false, reason: 'blocked' };
  
  const cached = whitelistCache.get(chatId);
  if (cached && now < cached.expiry) return { allowed: true, role: cached.role };

  // ② L2 Cache (Redis)
  const redisKey = `${KEY_PREFIX.WHITELIST}${chatId}`;
  const blockKey = `${KEY_PREFIX.BLOCKED}${chatId}`;
  
  const [redisRole, redisBlocked] = await Promise.all([
    redis.get<UserRole>(redisKey),
    redis.get<number>(blockKey),
  ]);

  if (redisBlocked && now < redisBlocked) {
    blockedCache.set(chatId, redisBlocked);
    return { allowed: false, reason: 'blocked' };
  }

  if (redisRole) {
    whitelistCache.set(chatId, { role: redisRole, expiry: now + WHITELIST_TTL_S * 1000 });
    return { allowed: true, role: redisRole };
  }

  // ③ DB (Supabase)
  const [whitelistResult, userResult, blockedResult] = await Promise.all([
    supabase.from('whitelisted_users').select('role').eq('chat_id', chatId).eq('is_active', true).maybeSingle(),
    supabase.from('users').select('role').eq('telegram_chat_id', chatId).maybeSingle(),
    supabase.from('blocked_users').select('blocked_until').eq('chat_id', chatId).maybeSingle(),
  ]);

  if (blockedResult.data) {
    const until = blockedResult.data.blocked_until ? new Date(blockedResult.data.blocked_until).getTime() : Infinity;
    await redis.set(blockKey, until, { ex: BLOCKED_TTL_S });
    blockedCache.set(chatId, until);
    if (now < until) return { allowed: false, reason: 'blocked' };
  }

  const role = (whitelistResult.data?.role || userResult.data?.role) as UserRole | undefined;
  if (!role) return { allowed: false, reason: 'not_whitelisted' };

  // Sync to caches
  await redis.set(redisKey, role, { ex: WHITELIST_TTL_S });
  whitelistCache.set(chatId, { role, expiry: now + WHITELIST_TTL_S * 1000 });

  return { allowed: true, role };
}

// ─── Layer 3: Rate Limiter ────────────────────────────────────────────────────
export async function checkRateLimit(
  chatId: number,
  role: UserRole
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const multiplier = role === 'owner' || role === 'admin' ? 2 : 1;
  const limit = RATE_CONFIG.maxPerMinute * multiplier;
  const key = `${KEY_PREFIX.RATE_LIMIT}${chatId}`;
  
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, RATE_CONFIG.windowS);

  if (current > limit + RATE_CONFIG.burstAllowance) {
    const ttl = await redis.ttl(key);
    return { allowed: false, retryAfterMs: (ttl > 0 ? ttl : 1) * 1000 };
  }

  return { allowed: true };
}

// ─── Layer 4: Input Sanitization ─────────────────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore (previous|above|all) instructions/i,
  /you are now/i,
  /jailbreak/i,
  /system prompt/i,
  /<\s*script/i,
  /--\s*(drop|delete|truncate|alter)\s/i,
];

export function sanitizeInput(raw: string): { safe: boolean; sanitized?: string; reason?: string } {
  if (raw.length > 500) return { safe: false, reason: 'too_long' };
  const trimmed = raw.trim();
  if (!trimmed) return { safe: false, reason: 'empty' };
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) return { safe: false, reason: 'injection_attempt' };
  }
  const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\\/g, '').slice(0, 500);
  return { safe: true, sanitized };
}

// ─── Layer 5: Audit Logger ────────────────────────────────────────────────────
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
    console.error('[AUDIT ERROR]', err);
  }
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE_KEYS = ['token', 'key', 'secret', 'password', 'auth'];
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    clean[k] = SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s)) ? '[redacted]' : v;
  }
  return clean;
}

// ─── Telegram reply helper ─────────────────────────────────────────────────────
export async function sendSecurityReply(chatId: number, reason: string, retryAfterMs?: number): Promise<void> {
  const messages: Record<string, string> = {
    not_whitelisted: '🔒 Privat. Masukkan ID Anda di Dashboard Web.',
    blocked: '🚫 Akun diblokir.',
    rate_limit: `⏳ Tunggu ${Math.ceil((retryAfterMs ?? 0) / 1000)} detik.`,
    too_long: '⚠️ Pesan terlalu panjang.',
    injection_attempt: '⚠️ Format tidak valid.',
    empty: '⚠️ Pesan kosong.',
  };
  const text = messages[reason] ?? '⚠️ Error keamanan.';
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// ─── Master Security Gate ─────────────────────────────────────────────────────
export async function runSecurityGate(request: Request, body: any): Promise<SecurityResult> {
  if (!validateWebhookSecret(request)) return { allowed: false, reason: 'invalid_secret' };

  const chatId = body.message?.chat?.id;
  if (!chatId) return { allowed: false, reason: 'no_chat_id' };

  const username = body.message?.from?.username;
  const rawText = body.message?.text ?? '';
  const messageType = body.message?.photo ? 'photo' : body.message?.voice ? 'voice' : body.message?.document ? 'document' : body.message?.text ? 'text' : 'unknown';

  const wl = await checkWhitelist(chatId, username);
  if (!wl.allowed && rawText !== '/id') {
    void sendSecurityReply(chatId, wl.reason ?? 'not_whitelisted');
    return { allowed: false, reason: wl.reason };
  }

  const role = wl.role ?? 'user';
  const rl = await checkRateLimit(chatId, role);
  if (!rl.allowed) {
    void sendSecurityReply(chatId, 'rate_limit', rl.retryAfterMs);
    return { allowed: false, reason: 'rate_limit' };
  }

  if (messageType === 'text') {
    const san = sanitizeInput(rawText);
    if (!san.safe) {
      void sendSecurityReply(chatId, san.reason ?? 'invalid_input');
      return { allowed: false, reason: san.reason };
    }
  }

  return { allowed: true, context: { chatId, username, role, messageType } };
}