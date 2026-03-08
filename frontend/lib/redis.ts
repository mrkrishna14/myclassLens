import { Redis } from '@upstash/redis'

// Prefer env vars (required for Vercel). Fallback for local dev only.
const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

export const redis = new Redis({
  url: url || '',
  token:
    token ||
    '',
})
