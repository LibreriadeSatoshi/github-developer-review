import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DateRange, ContributionItem } from "@/lib/types";

const originalFetch = globalThis.fetch;

vi.mock("@/lib/date-utils", () => ({
  getYearRanges: vi.fn((): DateRange[] => [
    {
      from: new Date("2024-01-01T00:00:00Z"),
      to: new Date("2025-01-01T00:00:00Z"),
    },
    {
      from: new Date("2025-01-01T00:00:00Z"),
      to: new Date("2025-06-15T00:00:00Z"),
    },
  ]),
}));

function makeRepoEntry(nameWithOwner: string, count: number, description?: string, topics?: string[]) {
  return {
    repository: {
      nameWithOwner,
      url: `https://github.com/${nameWithOwner}`,
      description: description ?? null,
      repositoryTopics: {
        nodes: (topics ?? []).map((name) => ({ topic: { name } })),
      },
    },
    contributions: { totalCount: count },
  };
}

function makeGraphQLResponse(login: string, overrides?: {
  commits?: ReturnType<typeof makeRepoEntry>[];
  prs?: ReturnType<typeof makeRepoEntry>[];
  reviews?: ReturnType<typeof makeRepoEntry>[];
  issues?: number;
}) {
  return {
    data: {
      user: {
        login,
        name: "Test User",
        avatarUrl: "https://avatar.example.com",
        bio: "Developer",
        createdAt: "2020-01-01T00:00:00Z",
        contributionsCollection: {
          totalCommitContributions: 100,
          commitContributionsByRepository: overrides?.commits ?? [
            makeRepoEntry("bitcoin/bitcoin", 50, "Bitcoin Core integration/staging tree", ["bitcoin", "cryptocurrency"]),
          ],
          issueContributions: { totalCount: overrides?.issues ?? 10 },
          pullRequestContributionsByRepository: overrides?.prs ?? [
            makeRepoEntry("bitcoin/bitcoin", 5, "Bitcoin Core integration/staging tree", ["bitcoin", "cryptocurrency"]),
          ],
          pullRequestReviewContributionsByRepository: overrides?.reviews ?? [
            makeRepoEntry("bitcoin/bitcoin", 3, "Bitcoin Core integration/staging tree", ["bitcoin", "cryptocurrency"]),
          ],
          contributionCalendar: {
            weeks: [
              {
                contributionDays: [
                  { date: "2024-06-01", contributionCount: 3, color: "#40c463" },
                  { date: "2024-06-02", contributionCount: 0, color: "#ebedf0" },
                ],
              },
            ],
          },
        },
      },
    },
  };
}

describe("github-graphql", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => makeGraphQLResponse("satoshi"),
      })
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("POSTs to GitHub GraphQL endpoint with correct headers", async () => {
    const { fetchContributions } = await import("@/lib/github-graphql");

    await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.github.com/graphql",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("sends correct variables in request body", async () => {
    const { fetchContributions } = await import("@/lib/github-graphql");

    await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01T00:00:00Z"),
      to: new Date("2025-01-01T00:00:00Z"),
    });

    const callArgs = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse(callArgs[1]!.body as string);
    expect(body.variables.login).toBe("satoshi");
    expect(body.variables.from).toBe("2024-01-01T00:00:00.000Z");
    expect(body.variables.to).toBe("2025-01-01T00:00:00.000Z");
  });

  it("transforms response to internal types", async () => {
    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    expect(result.contributions).toBeInstanceOf(Array);
    expect(result.contributions.length).toBeGreaterThan(0);
    expect(result.contributions[0]).toHaveProperty("repoNameWithOwner");
    expect(result.contributions[0]).toHaveProperty("type");
    expect(result.contributions[0]).toHaveProperty("count");
  });

  it("handles empty contributions", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          user: {
            login: "newuser",
            name: "New User",
            avatarUrl: "https://avatar.example.com",
            bio: null,
            createdAt: "2025-01-01T00:00:00Z",
            contributionsCollection: {
              totalCommitContributions: 0,
              commitContributionsByRepository: [],
              issueContributions: { totalCount: 0 },
              pullRequestContributionsByRepository: [],
              pullRequestReviewContributionsByRepository: [],
              contributionCalendar: { weeks: [] },
            },
          },
        },
      }),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("newuser", "test-token", {
      from: new Date("2025-01-01"),
      to: new Date("2025-06-15"),
    });

    expect(result.contributions).toEqual([]);
    expect(result.totalContributions).toBe(0);
  });

  it("fetches all contributions by merging year ranges", async () => {
    const commits = [makeRepoEntry("bitcoin/bitcoin", 30, "Bitcoin Core", ["bitcoin"])];
    const prs = [makeRepoEntry("bitcoin/bitcoin", 2, "Bitcoin Core", ["bitcoin"])];
    const reviews = [makeRepoEntry("bitcoin/bitcoin", 1, "Bitcoin Core", ["bitcoin"])];

    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => makeGraphQLResponse("satoshi", { commits, prs, reviews }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => makeGraphQLResponse("satoshi", { commits: [makeRepoEntry("bitcoin/bitcoin", 20, "Bitcoin Core", ["bitcoin"])], prs, reviews }),
      } as Response);

    const { fetchAllContributions } = await import("@/lib/github-graphql");

    const result = await fetchAllContributions(
      "satoshi",
      "test-token",
      new Date("2020-01-01T00:00:00Z")
    );

    expect(result.contributions.length).toBeGreaterThan(0);
    const bitcoinContribs = result.contributions.filter(
      (c: ContributionItem) => c.repoNameWithOwner === "bitcoin/bitcoin"
    );
    expect(bitcoinContribs.length).toBeGreaterThanOrEqual(1);
  });

  it("throws on GraphQL errors", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        errors: [{ message: "Something went wrong" }],
      }),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    await expect(
      fetchContributions("satoshi", "test-token", {
        from: new Date("2024-01-01"),
        to: new Date("2025-01-01"),
      })
    ).rejects.toThrow("Something went wrong");
  });

  it("includes commit, issue, PR, and review contributions with per-repo data", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () =>
        makeGraphQLResponse("satoshi", {
          commits: [makeRepoEntry("bitcoin/bitcoin", 50, "Bitcoin Core", ["bitcoin"])],
          prs: [makeRepoEntry("lightning/lnd", 3, "Lightning Network Daemon", ["lightning"])],
          reviews: [makeRepoEntry("bitcoin/bitcoin", 2, "Bitcoin Core", ["bitcoin"])],
          issues: 10,
        }),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    const types = result.contributions.map((c) => c.type);
    expect(types).toContain("commit");
    expect(types).toContain("issue");
    expect(types).toContain("pr");
    expect(types).toContain("review");

    // PR and review contributions should be per-repo, not aggregated
    const prContrib = result.contributions.find((c) => c.type === "pr");
    expect(prContrib?.repoNameWithOwner).toBe("lightning/lnd");

    const reviewContrib = result.contributions.find((c) => c.type === "review");
    expect(reviewContrib?.repoNameWithOwner).toBe("bitcoin/bitcoin");
  });

  it("sums all contribution types in totalContributions", async () => {
    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    // totalCommitContributions=100 + issues=10 + PRs=5 + reviews=3
    expect(result.totalContributions).toBe(118);
  });

  it("throws on HTTP 401", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({}),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    await expect(
      fetchContributions("satoshi", "bad-token", {
        from: new Date("2024-01-01"),
        to: new Date("2025-01-01"),
      })
    ).rejects.toThrow(/authentication failed/i);
  });

  it("throws on HTTP 403", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: async () => ({}),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    await expect(
      fetchContributions("satoshi", "test-token", {
        from: new Date("2024-01-01"),
        to: new Date("2025-01-01"),
      })
    ).rejects.toThrow(/rate limit/i);
  });

  it("throws on HTTP 500", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({}),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    await expect(
      fetchContributions("satoshi", "test-token", {
        from: new Date("2024-01-01"),
        to: new Date("2025-01-01"),
      })
    ).rejects.toThrow(/500 Internal Server Error/);
  });

  it("joins multiple GraphQL errors", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        errors: [
          { message: "First error" },
          { message: "Second error" },
        ],
      }),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    await expect(
      fetchContributions("satoshi", "test-token", {
        from: new Date("2024-01-01"),
        to: new Date("2025-01-01"),
      })
    ).rejects.toThrow("First error; Second error");
  });

  it("returns empty result for empty ranges", async () => {
    const { getYearRanges } = await import("@/lib/date-utils");
    vi.mocked(getYearRanges).mockReturnValueOnce([]);

    const { fetchAllContributions } = await import("@/lib/github-graphql");

    const result = await fetchAllContributions(
      "satoshi",
      "test-token",
      new Date("2030-01-01T00:00:00Z")
    );

    expect(result.totalContributions).toBe(0);
    expect(result.contributions).toEqual([]);
    expect(result.repoMetadata).toEqual([]);
    expect(result.login).toBe("satoshi");
  });

  it("includes repo metadata from commits, PRs, and reviews", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () =>
        makeGraphQLResponse("satoshi", {
          commits: [makeRepoEntry("bitcoin/bitcoin", 50, "Bitcoin Core", ["bitcoin"])],
          prs: [makeRepoEntry("lightning/lnd", 3, "Lightning Network Daemon", ["lightning"])],
          reviews: [makeRepoEntry("bitcoin/bitcoin", 2, "Bitcoin Core", ["bitcoin"])],
          issues: 0,
        }),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    expect(result.repoMetadata).toBeInstanceOf(Array);
    expect(result.repoMetadata.length).toBe(2); // bitcoin/bitcoin + lightning/lnd

    const bitcoinMeta = result.repoMetadata.find((m) => m.nameWithOwner === "bitcoin/bitcoin");
    expect(bitcoinMeta).toEqual({
      nameWithOwner: "bitcoin/bitcoin",
      url: "https://github.com/bitcoin/bitcoin",
      description: "Bitcoin Core",
      topics: ["bitcoin"],
    });

    const lndMeta = result.repoMetadata.find((m) => m.nameWithOwner === "lightning/lnd");
    expect(lndMeta).toBeDefined();
    expect(lndMeta?.url).toBe("https://github.com/lightning/lnd");
  });

  it("throws specific error when user not found", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: { user: null },
      }),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    await expect(
      fetchContributions("nonexistent", "test-token", {
        from: new Date("2024-01-01"),
        to: new Date("2025-01-01"),
      })
    ).rejects.toThrow(/not found/i);
  });

  it("uses __github_aggregated__ sentinel for issues only", async () => {
    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    const aggregated = result.contributions.filter(
      (c) => c.repoNameWithOwner === "__github_aggregated__"
    );
    // Only issues should use the aggregated sentinel
    expect(aggregated.every((c) => c.type === "issue")).toBe(true);

    // PRs and reviews should have real repo names
    const prs = result.contributions.filter((c) => c.type === "pr");
    expect(prs.every((c) => c.repoNameWithOwner !== "__github_aggregated__")).toBe(true);
    const reviews = result.contributions.filter((c) => c.type === "review");
    expect(reviews.every((c) => c.repoNameWithOwner !== "__github_aggregated__")).toBe(true);
  });
});
