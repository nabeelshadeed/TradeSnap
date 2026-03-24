let _redis: import('@upstash/redis').Redis | null = null

export function getRedis() {
  if (_redis) return _redis
  const { Redis } = require('@upstash/redis')
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
  return _redis!
}
