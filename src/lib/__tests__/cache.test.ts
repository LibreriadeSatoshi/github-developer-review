import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const mockStore = new Map<string, unknown>();

const { mockRedis } = vi.hoisted(() => ({
  mockRedis: {
    get: vi.fn(async (key: string) => mockStore.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      mockStore.set(key, value);
    }),
  },
}));

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: vi.fn(() => mockRedis),
  },
}));

import { getCached, setCache } from "@/lib/cache";
import { logger } from "@/lib/logger";

describe("cache", () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
    mockRedis.get.mockImplementation(async (key: string) => mockStore.get(key) ?? null);
    mockRedis.set.mockImplementation(async (key: string, value: unknown) => {
      mockStore.set(key, value);
    });
  });

  it("returns null when key does not exist", async () => {
    const result = await getCached("missing-key");
    expect(result).toBeNull();
  });

  it("returns data when key exists", async () => {
    mockStore.set("existing-key", { foo: "bar" });
    const result = await getCached("existing-key");
    expect(result).toEqual({ foo: "bar" });
  });

  it("calls redis.set with TTL 3600", async () => {
    await setCache("my-key", { data: 123 });
    expect(mockRedis.set).toHaveBeenCalledWith("my-key", { data: 123 }, { ex: 3600 });
  });

  it("round-trip: set then get returns same data", async () => {
    const data = { login: "satoshi", contributions: 42 };
    await setCache("round-trip", data);
    const result = await getCached("round-trip");
    expect(result).toEqual(data);
  });

  it("returns null when redis.get throws", async () => {
    const err = new Error("Redis connection failed");
    mockRedis.get.mockRejectedValueOnce(err);
    const result = await getCached("any-key");
    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith('Cache read failed for key "any-key"', err);
  });

  it("does not throw when redis.set throws", async () => {
    const err = new Error("Redis connection failed");
    mockRedis.set.mockRejectedValueOnce(err);
    await expect(setCache("any-key", { data: 1 })).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith('Cache write failed for key "any-key"', err);
  });
});
