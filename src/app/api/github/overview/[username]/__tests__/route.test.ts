import { describe, it, expect, vi, beforeEach } from "vitest";

let mockSession: { user?: object; accessToken?: string } | null = null;
let mockCacheData: unknown = null;

describe("GET /api/github/overview/[username]", () => {
  beforeEach(() => {
    mockSession = null;
    mockCacheData = null;
    vi.clearAllMocks();
    vi.resetModules();

    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn(async () => mockSession),
    }));

    vi.doMock("@/lib/cache", () => ({
      getCached: vi.fn(async () => mockCacheData),
      setCache: vi.fn(async () => {}),
    }));

    vi.doMock("@/lib/github-graphql", () => ({
      fetchAllContributions: vi.fn(async () => ({
        login: "testuser",
        name: "Test User",
        avatarUrl: "https://avatar.example.com",
        bio: "Developer",
        createdAt: "2020-01-01T00:00:00Z",
        totalContributions: 100,
        contributions: [
          {
            repoNameWithOwner: "bitcoin/bitcoin",
            type: "commit",
            count: 50,
            dateRange: {
              from: new Date("2024-01-01"),
              to: new Date("2025-01-01"),
            },
          },
        ],
        repoMetadata: [
          {
            nameWithOwner: "bitcoin/bitcoin",
            description: "Bitcoin Core",
            topics: ["bitcoin"],
          },
        ],
      })),
    }));

    vi.doMock("@/lib/bitcoin-repos", () => ({
      classifyRepos: vi.fn(
        () =>
          new Map([
            [
              "bitcoin/bitcoin",
              {
                nameWithOwner: "bitcoin/bitcoin",
                tier: "core",
                reason: "curated",
              },
            ],
          ])
      ),
    }));
  });

  async function callRoute(username: string) {
    const { GET } = await import(
      "@/app/api/github/overview/[username]/route"
    );
    const request = new Request(
      `http://localhost:3000/api/github/overview/${username}`
    );
    return GET(request, { params: Promise.resolve({ username }) });
  }

  it("returns 401 when no session", async () => {
    const response = await callRoute("testuser");
    expect(response.status).toBe(401);
  });

  it("returns 401 when session has no accessToken", async () => {
    mockSession = { user: { name: "Test" } };
    const response = await callRoute("testuser");
    expect(response.status).toBe(401);
  });

  it("returns cached data when available", async () => {
    mockSession = { user: { name: "Test" }, accessToken: "token" };
    mockCacheData = { login: "cached-user", totalContributions: 42, linesAdded: 0, linesDeleted: 0 };

    const response = await callRoute("testuser");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.login).toBe("cached-user");
  });

  it("fetches, classifies, caches, and returns DeveloperOverview on cache miss", async () => {
    mockSession = { user: { name: "Test" }, accessToken: "token" };

    const response = await callRoute("testuser");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.login).toBe("testuser");
    expect(data.bitcoinRepos).toBeDefined();
  });

  it("returns 404 when user not found", async () => {
    mockSession = { user: { name: "Test" }, accessToken: "token" };

    vi.doMock("@/lib/github-graphql", () => ({
      fetchAllContributions: vi.fn(async () => {
        throw new Error("User not found");
      }),
    }));

    const response = await callRoute("nonexistent");
    expect(response.status).toBe(404);
  });

  it("returns 429 on rate limit error", async () => {
    mockSession = { user: { name: "Test" }, accessToken: "token" };

    vi.doMock("@/lib/github-graphql", () => ({
      fetchAllContributions: vi.fn(async () => {
        const { RateLimitError } = await import("@/lib/types");
        throw new RateLimitError("Rate limit exceeded", Date.now() + 60000);
      }),
    }));

    const response = await callRoute("testuser");
    expect(response.status).toBe(429);
  });

  it("returns 502 on GitHub API error", async () => {
    mockSession = { user: { name: "Test" }, accessToken: "token" };

    vi.doMock("@/lib/github-graphql", () => ({
      fetchAllContributions: vi.fn(async () => {
        throw new Error("GitHub API error");
      }),
    }));

    const response = await callRoute("testuser");
    expect(response.status).toBe(502);
  });

  it("returns 400 for invalid username", async () => {
    mockSession = { user: { name: "Test" }, accessToken: "token" };

    const response1 = await callRoute("invalid--user");
    expect(response1.status).toBe(400);

    // Reset modules so we get a fresh import for the second call
    vi.resetModules();

    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn(async () => mockSession),
    }));
    vi.doMock("@/lib/cache", () => ({
      getCached: vi.fn(async () => mockCacheData),
      setCache: vi.fn(async () => {}),
    }));

    const response2 = await callRoute("a".repeat(40));
    expect(response2.status).toBe(400);
  });

  it("normalizes cache key to lowercase", async () => {
    mockSession = { user: { name: "Test" }, accessToken: "token" };

    const response = await callRoute("TestUser");
    expect(response.status).toBe(200);

    const { getCached } = await import("@/lib/cache");
    expect(getCached).toHaveBeenCalledWith("overview:testuser");
  });
});
