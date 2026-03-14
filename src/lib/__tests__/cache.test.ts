import { describe, it, expect, vi, beforeEach } from "vitest";

const mockKv = new Map<string, unknown>();

vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(async (key: string) => mockKv.get(key) ?? null),
    // opts (ex/TTL) not used in test; signature matches @vercel/kv
    set: vi.fn(async (key: string, value: unknown) => {
      mockKv.set(key, value);
    }),
  },
}));

import { getCached, setCache } from "@/lib/cache";
import { kv } from "@vercel/kv";

describe("cache", () => {
  beforeEach(() => {
    mockKv.clear();
    vi.clearAllMocks();
  });

  it("returns null when key does not exist", async () => {
    const result = await getCached("missing-key");
    expect(result).toBeNull();
  });

  it("returns data when key exists", async () => {
    mockKv.set("existing-key", { foo: "bar" });
    const result = await getCached("existing-key");
    expect(result).toEqual({ foo: "bar" });
  });

  it("calls kv.set with TTL 3600", async () => {
    await setCache("my-key", { data: 123 });
    expect(kv.set).toHaveBeenCalledWith("my-key", { data: 123 }, { ex: 3600 });
  });

  it("round-trip: set then get returns same data", async () => {
    const data = { login: "satoshi", contributions: 42 };
    await setCache("round-trip", data);
    const result = await getCached("round-trip");
    expect(result).toEqual(data);
  });

  it("returns null when kv.get throws", async () => {
    vi.mocked(kv.get).mockRejectedValueOnce(new Error("Redis connection failed"));
    const result = await getCached("any-key");
    expect(result).toBeNull();
  });

  it("does not throw when kv.set throws", async () => {
    vi.mocked(kv.set).mockRejectedValueOnce(new Error("Redis connection failed"));
    await expect(setCache("any-key", { data: 1 })).resolves.toBeUndefined();
  });
});
