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
const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

if (!hasRedis) {
  console.warn('⚠️ Missing UPSTASH_REDIS_REST_URL or TOKEN. Webhook security features will fail but dev server can run.');
}

// If variables are missing, export a dummy proxy so the app doesn't crash on boot.
export const redis: Redis = hasRedis 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : new Proxy({} as any, {
      get: (target, prop) => {
        if (prop === 'then' || prop === '__esModule' || typeof prop === 'symbol') {
          return undefined;
        }
        return () => { throw new Error(`Redis is disabled (Missing UPSTASH_REDIS variables). Cannot call method: ${String(prop)}`); }
      }
    }) as Redis;


// Cache keys prefixes (standardized)
export const KEY_PREFIX = {
  WHITELIST: 'wl:',       // wl:{chatId}
  RATE_LIMIT: 'rl:',      // rl:{chatId}
  DEDUPE: 'dedupe:',      // dedupe:{updateId}
  BLOCKED: 'blocked:',    // blocked:{chatId}
};
