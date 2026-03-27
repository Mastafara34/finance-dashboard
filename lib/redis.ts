import { Redis } from '@upstash/redis';

/**
 * lib/redis.ts — High Speed Global State (Upstash)
 * ===============================================
 * Client instance for high-speed persistent state:
 *   - Rate limiting (Global)
 *   - Whitelist caching (Across Vercel instances)
 *   - Telegram deduplication (Low latency idempotency)
 */

let _client: Redis | null = null;

function getClient(): Redis {
  if (!_client) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error('Redis is disabled (Missing UPSTASH_REDIS variables at runtime).');
    }
    _client = new Redis({ url, token });
  }
  return _client;
}

// Forward exactly the methods we use to avoid any Proxy "this" binding issues 
// within the internal structure of the @upstash/redis SDK.
export const redis = {
  get: <T>(k: string) => getClient().get<T>(k),
  set: (k: string, v: any, opts?: any) => getClient().set(k, v, opts),
  incr: (k: string) => getClient().incr(k),
  expire: (k: string, ttl: number) => getClient().expire(k, ttl),
  ttl: (k: string) => getClient().ttl(k),
} as unknown as Redis;

// Cache keys prefixes (standardized)
export const KEY_PREFIX = {
  WHITELIST: 'wl:',       // wl:{chatId}
  RATE_LIMIT: 'rl:',      // rl:{chatId}
  DEDUPE: 'dedupe:',      // dedupe:{updateId}
  BLOCKED: 'blocked:',    // blocked:{chatId}
};
