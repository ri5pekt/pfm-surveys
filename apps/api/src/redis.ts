import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);

let client: Redis | null = null;

/**
 * Get or create the Redis client. Used for nonce replay protection and BullMQ.
 */
export function getRedis(): Redis {
  if (!client) {
    client = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD || undefined,
      db: REDIS_DB,
      maxRetriesPerRequest: null,
    });
  }
  return client;
}

const NONCE_PREFIX = 'nonce:';
const DEFAULT_NONCE_TTL_SECONDS = 600; // 10 minutes per plan

/**
 * Set nonce only if not already present (replay protection).
 * @returns true if nonce was set (first use), false if already used (replay)
 */
export async function setNonceOnce(
  nonce: string,
  ttlSeconds: number = DEFAULT_NONCE_TTL_SECONDS
): Promise<boolean> {
  const redis = getRedis();
  const key = `${NONCE_PREFIX}${nonce}`;
  const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}
