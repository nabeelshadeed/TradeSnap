import { getRedis } from '@/lib/redis'

/**
 * Sliding-window rate limiter backed by Upstash Redis.
 * Returns { ok: true } when under limit, { ok: false } when limit exceeded.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; remaining: number; reset: number }> {
  const redis = getRedis()
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, windowSeconds)
  const ttl = await redis.ttl(key)
  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    reset: ttl,
  }
}

/** Rate-limit by IP address. 60 req / 60 s for public endpoints. */
export async function rateLimitByIp(
  req: import('next/server').NextRequest,
  namespace: string,
  limit = 60,
  windowSeconds = 60,
) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  return rateLimit(`rl:${namespace}:${ip}`, limit, windowSeconds)
}
