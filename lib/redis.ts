/**
 * Redis client for ElastiCache.
 * In production (ECS) REDIS_URL points to the ElastiCache endpoint.
 * In local dev the variable is absent and all cache calls are no-ops.
 */

let client: import("ioredis").Redis | null = null;

async function getClient() {
  if (!process.env.REDIS_URL) return null; // local dev — skip cache
  if (client) return client;

  try {
    // Dynamic import so the build doesn't fail when ioredis isn't installed locally
    const { default: Redis } = await import("ioredis");
    client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    await client.connect();
    return client;
  } catch {
    client = null;
    return null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    const r = await getClient();
    if (!r) return null;
    return await r.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds = 3600): Promise<void> {
  try {
    const r = await getClient();
    if (!r) return;
    await r.setex(key, ttlSeconds, value);
  } catch {
    // Silently ignore cache write failures
  }
}
