import { Redis } from '@upstash/redis';

/**
 * lib/redis.ts — High Speed Global State (Upstash)
 * ===============================================
 * Client instance for high-speed persistent state:
 *   - Rate limiting (Global)
 *   - Whitelist caching (Across Vercel instances)
 *   - Telegram deduplication (Low latency idempotency)
 */

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Missing UPSTASH_REDIS_REST environment variables');
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Cache keys prefixes (standardized)
export const KEY_PREFIX = {
  WHITELIST: 'wl:',       // wl:{chatId}
  RATE_LIMIT: 'rl:',      // rl:{chatId}
  DEDUPE: 'dedupe:',      // dedupe:{updateId}
  BLOCKED: 'blocked:',    // blocked:{chatId}
};
