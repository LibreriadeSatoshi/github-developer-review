import { kv } from "@vercel/kv";

const DEFAULT_TTL = 3600; // 1 hour

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    return await kv.get<T>(key);
  } catch {
    console.error(`Cache read failed for key "${key}"`);
    return null;
  }
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    await kv.set(key, data, { ex: DEFAULT_TTL });
  } catch {
    console.error(`Cache write failed for key "${key}"`);
  }
}
