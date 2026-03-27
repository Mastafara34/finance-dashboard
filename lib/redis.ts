import { Redis } from '@upstash/redis';

/**
 * lib/redis.ts — High Speed Global State (Upstash)
 * ===============================================
 * Client instance for high-speed persistent state:
 *   - Rate limiting (Global)
 *   - Whitelist caching (Across Vercel instances)
 *   - Telegram deduplication (Low latency idempotency)
 */

// We use a Lazy Proxy to bypass Next.js Turbopack evaluating process.env at compile time.
// This ensures Redis is only instantiated at runtime when the webhook actually fires,
// at which point process.env.UPSTASH_REDIS_REST_URL is fully loaded from .env.local.
export const redis: Redis = new Proxy({} as any, {
  get: (target, prop) => {
    // Ignore native module system properties during Next.js SSR build
    if (prop === 'then' || prop === '__esModule' || typeof prop === 'symbol') {
      return undefined;
    }

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      return () => { throw new Error('Redis is disabled (Missing UPSTASH_REDIS variables in runtime).'); }
    }

    if (!target.__real) {
       target.__real = new Redis({ url, token });
    }

    const value = target.__real[prop];
    return typeof value === 'function' ? value.bind(target.__real) : value;
  }
}) as Redis;

// Cache keys prefixes (standardized)
export const KEY_PREFIX = {
  WHITELIST: 'wl:',       // wl:{chatId}
  RATE_LIMIT: 'rl:',      // rl:{chatId}
  DEDUPE: 'dedupe:',      // dedupe:{updateId}
  BLOCKED: 'blocked:',    // blocked:{chatId}
};
