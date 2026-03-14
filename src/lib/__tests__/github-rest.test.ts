import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchContributions,
  fetchPRDetail,
  buildSearchQuery,
  mapSearchItem,
  repoNameFromUrl,
} from "@/lib/github-rest";
import type { GitHubSearchItem } from "@/lib/github-rest";

// Mock githubFetch
vi.mock("@/lib/github-search", () => ({
  githubFetch: vi.fn(),
}));

import { githubFetch } from "@/lib/github-search";
const mockGithubFetch = vi.mocked(githubFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildSearchQuery", () => {
  it("builds PR query for author", () => {
    const q = buildSearchQuery("alice", { tab: "prs" });
    expect(q).toBe("author:alice type:pr");
  });

  it("builds review query with reviewed-by", () => {
    const q = buildSearchQuery("alice", { tab: "reviews" });
    expect(q).toBe("reviewed-by:alice type:pr");
  });

  it("builds issue query", () => {
    const q = buildSearchQuery("alice", { tab: "issues" });
    expect(q).toBe("author:alice type:issue");
  });

  it("adds date range", () => {
    const q = buildSearchQuery("alice", {
      tab: "prs",
      from: "2024-01-01",
      to: "2024-12-31",
    });
    expect(q).toContain("created:2024-01-01..2024-12-31");
  });

  it("adds project filter", () => {
    const q = buildSearchQuery("alice", {
      tab: "prs",
      project: "bitcoin/bitcoin",
    });
    expect(q).toContain("repo:bitcoin/bitcoin");
  });

  it("adds merged status", () => {
    const q = buildSearchQuery("alice", { tab: "prs", status: "merged" });
    expect(q).toContain("is:merged");
  });

  it("adds open/closed status", () => {
    const q = buildSearchQuery("alice", { tab: "prs", status: "open" });
    expect(q).toContain("is:open");
  });

  it("skips status when 'all'", () => {
    const q = buildSearchQuery("alice", { tab: "prs", status: "all" });
    expect(q).not.toContain("is:");
  });
});

describe("repoNameFromUrl", () => {
  it("extracts owner/repo from API URL", () => {
    expect(repoNameFromUrl("https://api.github.com/repos/bitcoin/bitcoin")).toBe(
      "bitcoin/bitcoin"
    );
  });

  it("returns input if no match", () => {
    expect(repoNameFromUrl("unknown")).toBe("unknown");
  });
});

describe("mapSearchItem", () => {
  const baseItem: GitHubSearchItem = {
    id: 1,
    number: 42,
    title: "Fix bug",
    state: "closed",
    created_at: "2024-01-01T00:00:00Z",
    closed_at: "2024-01-02T00:00:00Z",
    html_url: "https://github.com/bitcoin/bitcoin/pull/42",
    repository_url: "https://api.github.com/repos/bitcoin/bitcoin",
    pull_request: { merged_at: "2024-01-02T00:00:00Z" },
  };

  it("maps PR with merged state", () => {
    const result = mapSearchItem(baseItem, "prs");
    expect(result.type).toBe("pr");
    expect(result.state).toBe("merged");
    expect(result.repoNameWithOwner).toBe("bitcoin/bitcoin");
  });

  it("maps review type", () => {
    const result = mapSearchItem(baseItem, "reviews");
    expect(result.type).toBe("review");
  });

  it("maps issue type", () => {
    const item = { ...baseItem, pull_request: undefined };
    const result = mapSearchItem(item, "issues");
    expect(result.type).toBe("issue");
    expect(result.state).toBe("closed");
  });

  it("maps open state", () => {
    const item = { ...baseItem, state: "open", pull_request: undefined };
    const result = mapSearchItem(item, "prs");
    expect(result.state).toBe("open");
  });
});

describe("searchContributions", () => {
  it("fetches and maps search results", async () => {
    mockGithubFetch.mockResolvedValue({
      total_count: 2,
      items: [
        {
          id: 1,
          number: 10,
          title: "PR one",
          state: "closed",
          created_at: "2024-06-01T00:00:00Z",
          closed_at: "2024-06-02T00:00:00Z",
          html_url: "https://github.com/bitcoin/bitcoin/pull/10",
          repository_url: "https://api.github.com/repos/bitcoin/bitcoin",
          pull_request: { merged_at: "2024-06-02T00:00:00Z" },
        },
        {
          id: 2,
          number: 11,
          title: "PR two",
          state: "open",
          created_at: "2024-06-03T00:00:00Z",
          closed_at: null,
          html_url: "https://github.com/bitcoin/bitcoin/pull/11",
          repository_url: "https://api.github.com/repos/bitcoin/bitcoin",
        },
      ],
    });

    const result = await searchContributions("alice", "token", {
      tab: "prs",
    });

    expect(result.items).toHaveLength(2);
    expect(result.totalCount).toBe(2);
    expect(result.hasMore).toBe(false);
    expect(result.page).toBe(1);
    expect(result.items[0].state).toBe("merged");
    expect(result.items[1].state).toBe("open");
  });

  it("caps totalCount at 1000", async () => {
    mockGithubFetch.mockResolvedValue({
      total_count: 5000,
      items: [],
    });

    const result = await searchContributions("alice", "token", {
      tab: "prs",
    });

    expect(result.totalCount).toBe(1000);
  });

  it("sets hasMore correctly", async () => {
    mockGithubFetch.mockResolvedValue({
      total_count: 60,
      items: Array(30).fill({
        id: 1,
        number: 1,
        title: "t",
        state: "open",
        created_at: "2024-01-01T00:00:00Z",
        closed_at: null,
        html_url: "https://github.com/x/y/pull/1",
        repository_url: "https://api.github.com/repos/x/y",
      }),
    });

    const result = await searchContributions(
      "alice",
      "token",
      { tab: "prs" },
      1
    );
    expect(result.hasMore).toBe(true);
  });
});

describe("fetchPRDetail", () => {
  it("fetches PR and reviews in parallel", async () => {
    mockGithubFetch.mockImplementation(async (path: string) => {
      if (path.includes("/reviews")) {
        return [{ id: 1, state: "APPROVED" }, { id: 2, state: "CHANGES_REQUESTED" }];
      }
      return {
        additions: 100,
        deletions: 20,
        changed_files: 5,
        commits: 3,
        merged_at: "2024-06-02T00:00:00Z",
        created_at: "2024-06-01T00:00:00Z",
      };
    });

    const result = await fetchPRDetail("bitcoin", "bitcoin", 42, "token");

    expect(result.number).toBe(42);
    expect(result.repoNameWithOwner).toBe("bitcoin/bitcoin");
    expect(result.additions).toBe(100);
    expect(result.deletions).toBe(20);
    expect(result.changedFiles).toBe(5);
    expect(result.commits).toBe(3);
    expect(result.reviewCount).toBe(2);
    expect(result.mergedAt).toBe("2024-06-02T00:00:00Z");
    expect(result.timeToMerge).toBe(86400000); // 1 day in ms
  });

  it("sets timeToMerge to null when not merged", async () => {
    mockGithubFetch.mockImplementation(async (path: string) => {
      if (path.includes("/reviews")) return [];
      return {
        additions: 10,
        deletions: 5,
        changed_files: 1,
        commits: 1,
        merged_at: null,
        created_at: "2024-06-01T00:00:00Z",
      };
    });

    const result = await fetchPRDetail("bitcoin", "bitcoin", 42, "token");
    expect(result.timeToMerge).toBeNull();
    expect(result.mergedAt).toBeNull();
  });
});
