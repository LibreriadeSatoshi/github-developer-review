import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

const redis = Redis.fromEnv();
const DEFAULT_TTL = 3600; // 1 hour

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    return await redis.get<T>(key);
  } catch (err) {
    logger.error(`Cache read failed for key "${key}"`, err);
    return null;
  }
}

export async function setCache<T>(key: string, data: T, ttl?: number): Promise<void> {
  try {
    await redis.set(key, data, { ex: ttl ?? DEFAULT_TTL });
  } catch (err) {
    logger.error(`Cache write failed for key "${key}"`, err);
  }
}
