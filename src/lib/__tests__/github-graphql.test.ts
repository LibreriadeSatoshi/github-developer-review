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

function makeRepoTopics(topics: string[]) {
  return { nodes: topics.map((name) => ({ topic: { name } })) };
}

function makeRepoEntry(
  nameWithOwner: string,
  count: number,
  description?: string,
  topics?: string[],
  commitNodes: { occurredAt: string; commitCount: number }[] = []
) {
  return {
    repository: {
      nameWithOwner,
      url: `https://github.com/${nameWithOwner}`,
      description: description ?? null,
      repositoryTopics: makeRepoTopics(topics ?? []),
    },
    contributions: { totalCount: count, nodes: commitNodes },
  };
}

function makePRRepoEntry(
  nameWithOwner: string,
  prs: { occurredAt?: string; additions: number; deletions: number; merged: boolean }[],
  description?: string,
  topics?: string[]
) {
  return {
    repository: {
      nameWithOwner,
      url: `https://github.com/${nameWithOwner}`,
      description: description ?? null,
      repositoryTopics: makeRepoTopics(topics ?? []),
    },
    contributions: {
      totalCount: prs.length,
      nodes: prs.map((pr) => ({
        occurredAt: pr.occurredAt ?? "2024-06-01T00:00:00Z",
        pullRequest: {
          additions: pr.additions,
          deletions: pr.deletions,
          merged: pr.merged,
        },
      })),
    },
  };
}

function makeIssueRepoEntry(
  nameWithOwner: string,
  count: number,
  issueOccurredAts: string[] = [],
  description?: string,
  topics?: string[]
) {
  return {
    repository: {
      nameWithOwner,
      url: `https://github.com/${nameWithOwner}`,
      description: description ?? null,
      repositoryTopics: makeRepoTopics(topics ?? []),
    },
    contributions: {
      totalCount: count,
      nodes: issueOccurredAts.map((occurredAt) => ({ occurredAt })),
    },
  };
}

function makeReviewRepoEntry(
  nameWithOwner: string,
  count: number,
  reviewOccurredAts: string[] = [],
  description?: string,
  topics?: string[]
) {
  return {
    repository: {
      nameWithOwner,
      url: `https://github.com/${nameWithOwner}`,
      description: description ?? null,
      repositoryTopics: makeRepoTopics(topics ?? []),
    },
    contributions: {
      totalCount: count,
      nodes: reviewOccurredAts.map((occurredAt) => ({ occurredAt })),
    },
  };
}

function makeGraphQLResponse(
  login: string,
  overrides?: {
    commits?: ReturnType<typeof makeRepoEntry>[];
    issuesByRepo?: ReturnType<typeof makeIssueRepoEntry>[];
    prs?: ReturnType<typeof makePRRepoEntry | typeof makeRepoEntry>[];
    reviews?: ReturnType<typeof makeReviewRepoEntry | typeof makeRepoEntry>[];
  }
) {
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
          issueContributionsByRepository: overrides?.issuesByRepo ?? [
            makeIssueRepoEntry("bitcoin/bitcoin", 10, [], "Bitcoin Core integration/staging tree", ["bitcoin", "cryptocurrency"]),
          ],
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
              issueContributionsByRepository: [],
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
          issuesByRepo: [makeIssueRepoEntry("bitcoin/bitcoin", 10, [], "Bitcoin Core", ["bitcoin"])],
          prs: [makeRepoEntry("lightning/lnd", 3, "Lightning Network Daemon", ["lightning"])],
          reviews: [makeRepoEntry("bitcoin/bitcoin", 2, "Bitcoin Core", ["bitcoin"])],
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

    // Issues are now per-repo too
    const issueContrib = result.contributions.find((c) => c.type === "issue");
    expect(issueContrib?.repoNameWithOwner).toBe("bitcoin/bitcoin");
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
    expect(result.commitNodes).toEqual([]);
    expect(result.prNodes).toEqual([]);
    expect(result.issueNodes).toEqual([]);
    expect(result.reviewNodes).toEqual([]);
  });

  it("includes repo metadata from commits, PRs, reviews, and issues", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () =>
        makeGraphQLResponse("satoshi", {
          commits: [makeRepoEntry("bitcoin/bitcoin", 50, "Bitcoin Core", ["bitcoin"])],
          issuesByRepo: [],
          prs: [makeRepoEntry("lightning/lnd", 3, "Lightning Network Daemon", ["lightning"])],
          reviews: [makeRepoEntry("bitcoin/bitcoin", 2, "Bitcoin Core", ["bitcoin"])],
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

  it("sums additions/deletions from merged PRs into linesAdded/linesDeleted", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () =>
        makeGraphQLResponse("satoshi", {
          prs: [
            makePRRepoEntry("bitcoin/bitcoin", [
              { additions: 300, deletions: 50, merged: true },
              { additions: 100, deletions: 10, merged: true },
              { additions: 999, deletions: 999, merged: false }, // not merged — excluded
            ]),
            makePRRepoEntry("lightning/lnd", [
              { additions: 200, deletions: 30, merged: true },
            ]),
          ],
        }),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    expect(result.linesAdded).toBe(600);   // 300 + 100 + 200
    expect(result.linesDeleted).toBe(90);  // 50 + 10 + 30
  });

  it("returns linesAdded: 0 when there are no merged PRs", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () =>
        makeGraphQLResponse("satoshi", {
          prs: [
            makePRRepoEntry("bitcoin/bitcoin", [
              { additions: 500, deletions: 100, merged: false },
            ]),
          ],
        }),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    expect(result.linesAdded).toBe(0);
    expect(result.linesDeleted).toBe(0);
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

  it("issues use real repo names, not the aggregated sentinel", async () => {
    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    // No contributions should use the aggregated sentinel
    const aggregated = result.contributions.filter(
      (c) => c.repoNameWithOwner === "__github_aggregated__"
    );
    expect(aggregated).toHaveLength(0);

    // Issues have real repo names
    const issues = result.contributions.filter((c) => c.type === "issue");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((c) => c.repoNameWithOwner !== "__github_aggregated__")).toBe(true);

    // PRs and reviews also have real repo names
    const prs = result.contributions.filter((c) => c.type === "pr");
    expect(prs.every((c) => c.repoNameWithOwner !== "__github_aggregated__")).toBe(true);
    const reviews = result.contributions.filter((c) => c.type === "review");
    expect(reviews.every((c) => c.repoNameWithOwner !== "__github_aggregated__")).toBe(true);
  });

  // --- Per-node data tests (tasks 4.2–4.7) ---

  it("commitNodes are populated with occurredAt and commitCount", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () =>
        makeGraphQLResponse("satoshi", {
          commits: [
            makeRepoEntry("bitcoin/bitcoin", 3, "Bitcoin Core", ["bitcoin"], [
              { occurredAt: "2024-03-01T00:00:00Z", commitCount: 2 },
              { occurredAt: "2024-03-02T00:00:00Z", commitCount: 1 },
            ]),
            makeRepoEntry("lightning/lnd", 1, "LND", [], [
              { occurredAt: "2024-03-05T00:00:00Z", commitCount: 1 },
            ]),
          ],
        }),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    expect(result.commitNodes).toHaveLength(3);
    expect(result.commitNodes[0]).toEqual({
      repoNameWithOwner: "bitcoin/bitcoin",
      occurredAt: "2024-03-01T00:00:00Z",
      commitCount: 2,
    });
    expect(result.commitNodes[2]).toEqual({
      repoNameWithOwner: "lightning/lnd",
      occurredAt: "2024-03-05T00:00:00Z",
      commitCount: 1,
    });
  });

  it("commitNodes is empty when no commit nodes in fixture", async () => {
    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    // Default fixture uses makeRepoEntry with no commit nodes
    expect(result.commitNodes).toEqual([]);
  });

  it("prNodes include occurredAt alongside additions/deletions/merged", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () =>
        makeGraphQLResponse("satoshi", {
          prs: [
            makePRRepoEntry("bitcoin/bitcoin", [
              { occurredAt: "2024-04-10T00:00:00Z", additions: 100, deletions: 20, merged: true },
              { occurredAt: "2024-04-15T00:00:00Z", additions: 50, deletions: 5, merged: false },
            ]),
          ],
        }),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    expect(result.prNodes).toHaveLength(2);
    expect(result.prNodes[0]).toEqual({
      repoNameWithOwner: "bitcoin/bitcoin",
      occurredAt: "2024-04-10T00:00:00Z",
      additions: 100,
      deletions: 20,
      merged: true,
    });
    expect(result.prNodes[1].merged).toBe(false);
    expect(result.prNodes[1].occurredAt).toBe("2024-04-15T00:00:00Z");
  });

  it("issueNodes are populated per repo and totalContributions is unchanged", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () =>
        makeGraphQLResponse("satoshi", {
          issuesByRepo: [
            makeIssueRepoEntry("bitcoin/bitcoin", 3, [
              "2024-05-01T00:00:00Z",
              "2024-05-10T00:00:00Z",
              "2024-06-01T00:00:00Z",
            ]),
            makeIssueRepoEntry("lightning/lnd", 2, [
              "2024-07-01T00:00:00Z",
              "2024-07-15T00:00:00Z",
            ]),
          ],
        }),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    expect(result.issueNodes).toHaveLength(5);

    const bitcoinIssues = result.issueNodes.filter(
      (n) => n.repoNameWithOwner === "bitcoin/bitcoin"
    );
    expect(bitcoinIssues).toHaveLength(3);
    expect(bitcoinIssues[0].occurredAt).toBe("2024-05-01T00:00:00Z");

    const lndIssues = result.issueNodes.filter(
      (n) => n.repoNameWithOwner === "lightning/lnd"
    );
    expect(lndIssues).toHaveLength(2);

    // totalContributions = 100 (commits) + 5 (issues) + 5 (PRs) + 3 (reviews)
    expect(result.totalContributions).toBe(113);
  });

  it("issueNodes is empty when no issues", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () =>
        makeGraphQLResponse("satoshi", {
          issuesByRepo: [],
        }),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    expect(result.issueNodes).toEqual([]);
  });

  it("reviewNodes are populated with repoNameWithOwner and occurredAt", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () =>
        makeGraphQLResponse("satoshi", {
          reviews: [
            makeReviewRepoEntry("bitcoin/bitcoin", 2, [
              "2024-08-01T00:00:00Z",
              "2024-08-20T00:00:00Z",
            ]),
          ],
        }),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    expect(result.reviewNodes).toHaveLength(2);
    expect(result.reviewNodes[0]).toEqual({
      repoNameWithOwner: "bitcoin/bitcoin",
      occurredAt: "2024-08-01T00:00:00Z",
    });
    expect(result.reviewNodes[1].occurredAt).toBe("2024-08-20T00:00:00Z");
  });

  it("empty window returns all node arrays as empty", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          user: {
            login: "satoshi",
            name: null,
            avatarUrl: "",
            bio: null,
            createdAt: "2025-01-01T00:00:00Z",
            contributionsCollection: {
              totalCommitContributions: 0,
              commitContributionsByRepository: [],
              issueContributionsByRepository: [],
              pullRequestContributionsByRepository: [],
              pullRequestReviewContributionsByRepository: [],
              contributionCalendar: { weeks: [] },
            },
          },
        },
      }),
    } as Response);

    const { fetchContributions } = await import("@/lib/github-graphql");

    const result = await fetchContributions("satoshi", "test-token", {
      from: new Date("2024-01-01"),
      to: new Date("2025-01-01"),
    });

    expect(result.commitNodes).toEqual([]);
    expect(result.prNodes).toEqual([]);
    expect(result.issueNodes).toEqual([]);
    expect(result.reviewNodes).toEqual([]);
  });

  it("commitNodes from two year windows are concatenated in fetchAllContributions", async () => {
    const window1Commits = [
      makeRepoEntry("bitcoin/bitcoin", 2, "Bitcoin Core", [], [
        { occurredAt: "2023-06-01T00:00:00Z", commitCount: 2 },
      ]),
    ];
    const window2Commits = [
      makeRepoEntry("bitcoin/bitcoin", 1, "Bitcoin Core", [], [
        { occurredAt: "2024-06-01T00:00:00Z", commitCount: 1 },
      ]),
    ];

    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => makeGraphQLResponse("satoshi", { commits: window1Commits }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => makeGraphQLResponse("satoshi", { commits: window2Commits }),
      } as Response);

    const { fetchAllContributions } = await import("@/lib/github-graphql");

    const result = await fetchAllContributions(
      "satoshi",
      "test-token",
      new Date("2020-01-01T00:00:00Z")
    );

    expect(result.commitNodes).toHaveLength(2);
    const dates = result.commitNodes.map((n) => n.occurredAt);
    expect(dates).toContain("2023-06-01T00:00:00Z");
    expect(dates).toContain("2024-06-01T00:00:00Z");
  });
});
