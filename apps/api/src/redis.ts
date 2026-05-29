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

const SURVEY_CACHE_PREFIX = 'surveys:v1:';
const SURVEY_CACHE_TTL_SECONDS = 300; // 5 minutes — invalidated immediately on any survey mutation

/**
 * Cache the public survey payload for a site. Uses the internal site UUID as the key.
 */
export async function cacheSurveys(siteUuid: string, payload: unknown): Promise<void> {
  const redis = getRedis();
  await redis.set(
    `${SURVEY_CACHE_PREFIX}${siteUuid}`,
    JSON.stringify(payload),
    'EX',
    SURVEY_CACHE_TTL_SECONDS
  );
}

/**
 * Retrieve cached survey payload. Returns null on miss.
 */
export async function getCachedSurveys(siteUuid: string): Promise<unknown | null> {
  const redis = getRedis();
  const raw = await redis.get(`${SURVEY_CACHE_PREFIX}${siteUuid}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/**
 * Invalidate cached surveys for a site. Call on any survey mutation.
 */
export async function invalidateSurveyCache(siteUuid: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`${SURVEY_CACHE_PREFIX}${siteUuid}`);
}
