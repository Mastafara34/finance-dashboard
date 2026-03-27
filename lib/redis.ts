import { Redis } from '@upstash/redis';

/**
 * lib/redis.ts — High Speed Global State (Upstash)
 * ===============================================
 * Client instance for high-speed persistent state:
 *   - Rate limiting (Global)
 *   - Whitelist caching (Across Vercel instances)
 *   - Telegram deduplication (Low latency idempotency)
 */

// Warn instead of crashing at module evaluation time so Next.js can compile.
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn('⚠️ Missing UPSTASH_REDIS_REST_URL or TOKEN. Webhook security features will fail but dev server can run.');
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://placeholder.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'placeholder',
});

// Cache keys prefixes (standardized)
export const KEY_PREFIX = {
  WHITELIST: 'wl:',       // wl:{chatId}
  RATE_LIMIT: 'rl:',      // rl:{chatId}
  DEDUPE: 'dedupe:',      // dedupe:{updateId}
  BLOCKED: 'blocked:',    // blocked:{chatId}
};
