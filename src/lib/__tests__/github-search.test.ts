import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type GithubFetch = Awaited<ReturnType<typeof import("@/lib/github-search")>>["githubFetch"];
let githubFetch: GithubFetch;

const originalFetch = globalThis.fetch;

describe("github-search", () => {
  beforeEach(async () => {
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
    ({ githubFetch } = await import("@/lib/github-search"));
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("sends Bearer auth header", async () => {
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

    const fetchPromise = githubFetch("/test", "retry-token");
    await vi.advanceTimersByTimeAsync(15_000);
    const result = await fetchPromise;

    expect(result).toEqual({ items: ["retried"] });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("stops retrying after MAX_RETRIES (3) attempts on repeated 403", async () => {
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
          "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) - 1),
        }),
      } as Response;
    });

    await expect(githubFetch("/test", "max-retry-token")).rejects.toThrow(
      "Rate limit"
    );
    expect(callCount).toBe(4);

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

    await expect(githubFetch("/test", "token-500")).rejects.toThrow(
      "GitHub API error: 500 Internal Server Error"
    );
  });

  it("uses safe defaults for missing rate limit headers", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
      headers: new Headers({}),
    } as Response);

    await expect(githubFetch("/test", "no-headers-token")).resolves.toBeDefined();
  });
});
