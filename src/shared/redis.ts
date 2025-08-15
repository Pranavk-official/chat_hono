import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redis = new Redis(redisUrl);

redis.on("error", (err) => {
  console.error("Redis:", err.name, err.message);
});

export const getCache = async (key: string) => {
  if (redis.status !== "ready") {
    return null;
  }
  return await redis.get(key);
};

export const setCacheTTL = async (
  key: string,
  seconds: number,
  value: string
) => {
  if (redis.status !== "ready") {
    throw new Error("Redis is not ready");
  }
  await redis.setex(key, seconds, value);
};

export const invalidateCache = async (key: string) => {
  if (redis.status !== "ready") {
    throw new Error("Redis is not ready");
  }
  await redis.del(key);
};

export const invalidateCaches = async (pattern: string) => {
  if (redis.status !== "ready") {
    throw new Error("Redis is not ready");
  }
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};

export const incrementCache = async (key: string, incrementBy: number = 1) => {
  if (redis.status !== "ready") {
    throw new Error("Redis is not ready");
  }
  return await redis.incrby(key, incrementBy);
};

export default redis;
