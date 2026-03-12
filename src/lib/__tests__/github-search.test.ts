import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalFetch = globalThis.fetch;

describe("github-search", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
        headers: new Headers({
          "x-ratelimit-remaining": "50",
          "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
        }),
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("sends Bearer auth header", async () => {
    const { githubFetch, _resetForTesting } = await import(
      "@/lib/github-search"
    );
    _resetForTesting();

    await githubFetch("/search/repositories?q=bitcoin", "test-token");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/search/repositories"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("updates rate limit state from response headers", async () => {
    const resetTime = Math.floor(Date.now() / 1000) + 1800;
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
      headers: new Headers({
        "x-ratelimit-remaining": "25",
        "x-ratelimit-reset": String(resetTime),
      }),
    } as Response);

    const { githubFetch, getRateLimitState, _resetForTesting } = await import(
      "@/lib/github-search"
    );
    _resetForTesting();

    await githubFetch("/search/repositories?q=bitcoin", "token-a");

    const state = getRateLimitState("token-a");
    expect(state.remaining).toBe(25);
    expect(state.resetAt).toBe(resetTime * 1000);
  });

  it("delays when remaining < 5 with future reset", async () => {
    const futureReset = Math.floor(Date.now() / 1000) + 30;
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
      headers: new Headers({
        "x-ratelimit-remaining": "50",
        "x-ratelimit-reset": String(futureReset),
      }),
    } as Response);

    const { githubFetch, _resetForTesting, _setRateLimitState } = await import(
      "@/lib/github-search"
    );
    _resetForTesting();

    _setRateLimitState("delay-token", {
      remaining: 3,
      resetAt: (futureReset + 10) * 1000,
    });

    const fetchPromise = githubFetch("/test", "delay-token");
    await vi.advanceTimersByTimeAsync(60_000);
    await fetchPromise;

    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it("proceeds immediately when remaining >= 5", async () => {
    const { githubFetch, _resetForTesting, _setRateLimitState } = await import(
      "@/lib/github-search"
    );
    _resetForTesting();

    _setRateLimitState("ok-token", {
      remaining: 10,
      resetAt: Date.now() + 60_000,
    });

    await githubFetch("/test", "ok-token");
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it("throws RateLimitError on 403 when wait > 60s", async () => {
    const farFuture = Math.floor(Date.now() / 1000) + 120;
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: "rate limit exceeded" }),
      headers: new Headers({
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(farFuture),
      }),
    } as Response);

    const { githubFetch, _resetForTesting } = await import(
      "@/lib/github-search"
    );
    _resetForTesting();

    await expect(
      githubFetch("/test", "rate-limited-token")
    ).rejects.toThrow("Rate limit");
  });

  it("auto-retries on 403 when wait < 60s", async () => {
    const nearReset = Math.floor(Date.now() / 1000) + 10;
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: "rate limit exceeded" }),
        headers: new Headers({
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(nearReset),
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: ["retried"] }),
        headers: new Headers({
          "x-ratelimit-remaining": "50",
          "x-ratelimit-reset": String(nearReset + 3600),
        }),
      } as Response);

    const { githubFetch, _resetForTesting } = await import(
      "@/lib/github-search"
    );
    _resetForTesting();

    const fetchPromise = githubFetch("/test", "retry-token");
    await vi.advanceTimersByTimeAsync(15_000);
    const result = await fetchPromise;

    expect(result).toEqual({ items: ["retried"] });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("isolates rate limit state per token", async () => {
    const { getRateLimitState, _resetForTesting, _setRateLimitState } =
      await import("@/lib/github-search");
    _resetForTesting();

    _setRateLimitState("token-a", { remaining: 5, resetAt: 1000 });
    _setRateLimitState("token-b", { remaining: 20, resetAt: 2000 });

    expect(getRateLimitState("token-a").remaining).toBe(5);
    expect(getRateLimitState("token-b").remaining).toBe(20);
  });

  it("stops retrying after MAX_RETRIES (3) attempts on repeated 403", async () => {
    // Use real timers for this test to avoid unhandled rejection with fake timer interactions
    vi.useRealTimers();

    let callCount = 0;
    vi.mocked(globalThis.fetch).mockImplementation(async () => {
      callCount++;
      return {
        ok: false,
        status: 403,
        json: async () => ({ message: "rate limit exceeded" }),
        headers: new Headers({
          "x-ratelimit-remaining": "0",
          // Reset in the past so waitForReset is a no-op
          "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) - 1),
        }),
      } as Response;
    });

    const { githubFetch, _resetForTesting } = await import(
      "@/lib/github-search"
    );
    _resetForTesting();

    await expect(githubFetch("/test", "max-retry-token")).rejects.toThrow(
      "Rate limit"
    );
    // 1 initial + 3 retries = 4 total fetch calls
    expect(callCount).toBe(4);

    // Restore fake timers for other tests
    vi.useFakeTimers();
  });

  it("throws on 404 response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ message: "Not Found" }),
      headers: new Headers({
        "x-ratelimit-remaining": "50",
        "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
      }),
    } as Response);

    const { githubFetch, _resetForTesting } = await import(
      "@/lib/github-search"
    );
    _resetForTesting();

    await expect(githubFetch("/test", "token-404")).rejects.toThrow(
      "GitHub API error: 404 Not Found"
    );
  });

  it("throws on 500 response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ message: "Internal Server Error" }),
      headers: new Headers({
        "x-ratelimit-remaining": "50",
        "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
      }),
    } as Response);

    const { githubFetch, _resetForTesting } = await import(
      "@/lib/github-search"
    );
    _resetForTesting();

    await expect(githubFetch("/test", "token-500")).rejects.toThrow(
      "GitHub API error: 500 Internal Server Error"
    );
  });

  it("uses safe defaults for missing headers", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
      headers: new Headers({}),
    } as Response);

    const { githubFetch, getRateLimitState, _resetForTesting } = await import(
      "@/lib/github-search"
    );
    _resetForTesting();

    await githubFetch("/test", "no-headers-token");
    const state = getRateLimitState("no-headers-token");
    expect(state.remaining).toBeGreaterThan(0);
  });
});
