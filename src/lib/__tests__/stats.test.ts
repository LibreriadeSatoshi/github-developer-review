import { describe, it, expect } from "vitest";
import { computeStats, aggregateMonthly } from "@/lib/stats";
import type { DeveloperOverview, ContributionCalendarWeek } from "@/lib/types";

function makeOverview(
  contributions: DeveloperOverview["contributions"] = [],
  bitcoinRepos: DeveloperOverview["bitcoinRepos"] = []
): DeveloperOverview {
  return {
    login: "testuser",
    name: "Test User",
    avatarUrl: "https://avatar.example.com",
    bio: null,
    createdAt: "2020-01-01T00:00:00Z",
    totalContributions: 0,
    bitcoinRepos,
    contributions,
    calendarWeeks: [],
    linesAdded: 0,
    linesDeleted: 0,
  };
}

describe("computeStats", () => {
  it("sums contributions by type", () => {
    const overview = makeOverview([
      { repoNameWithOwner: "a/b", type: "commit", count: 10, dateRange: { from: new Date(), to: new Date() } },
      { repoNameWithOwner: "c/d", type: "commit", count: 5, dateRange: { from: new Date(), to: new Date() } },
      { repoNameWithOwner: "a/b", type: "pr", count: 3, dateRange: { from: new Date(), to: new Date() } },
      { repoNameWithOwner: "a/b", type: "review", count: 7, dateRange: { from: new Date(), to: new Date() } },
      { repoNameWithOwner: "__github_aggregated__", type: "issue", count: 2, dateRange: { from: new Date(), to: new Date() } },
    ]);

    const stats = computeStats(overview);

    expect(stats.totalCommits).toBe(15);
    expect(stats.totalPRs).toBe(3);
    expect(stats.totalReviews).toBe(7);
    expect(stats.totalIssues).toBe(2);
  });

  it("counts unique projects (excluding __github_aggregated__)", () => {
    const overview = makeOverview([
      { repoNameWithOwner: "a/b", type: "commit", count: 10, dateRange: { from: new Date(), to: new Date() } },
      { repoNameWithOwner: "a/b", type: "commit", count: 5, dateRange: { from: new Date(), to: new Date() } },
      { repoNameWithOwner: "c/d", type: "commit", count: 3, dateRange: { from: new Date(), to: new Date() } },
      { repoNameWithOwner: "__github_aggregated__", type: "issue", count: 1, dateRange: { from: new Date(), to: new Date() } },
    ]);

    const stats = computeStats(overview);
    expect(stats.projectCount).toBe(2);
  });

  it("returns zeros for empty contributions", () => {
    const stats = computeStats(makeOverview([]));

    expect(stats.totalCommits).toBe(0);
    expect(stats.totalPRs).toBe(0);
    expect(stats.totalReviews).toBe(0);
    expect(stats.totalIssues).toBe(0);
    expect(stats.projectCount).toBe(0);
  });

  it("filters to Bitcoin-only contributions when bitcoinOnly is true", () => {
    const overview = makeOverview(
      [
        { repoNameWithOwner: "bitcoin/bitcoin", type: "commit", count: 50, dateRange: { from: new Date(), to: new Date() } },
        { repoNameWithOwner: "bitcoin/bitcoin", type: "pr", count: 10, dateRange: { from: new Date(), to: new Date() } },
        { repoNameWithOwner: "unrelated/repo", type: "commit", count: 200, dateRange: { from: new Date(), to: new Date() } },
        { repoNameWithOwner: "unrelated/repo", type: "pr", count: 100, dateRange: { from: new Date(), to: new Date() } },
        { repoNameWithOwner: "__github_aggregated__", type: "issue", count: 5, dateRange: { from: new Date(), to: new Date() } },
      ],
      [{ nameWithOwner: "bitcoin/bitcoin", tier: "core", reason: "curated" }]
    );

    const stats = computeStats(overview, true);

    expect(stats.totalCommits).toBe(50);
    expect(stats.totalPRs).toBe(10);
    // Issues are aggregated, so they're always included
    expect(stats.totalIssues).toBe(5);
    expect(stats.projectCount).toBe(1);
  });

  it("includes all contributions when bitcoinOnly is false", () => {
    const overview = makeOverview(
      [
        { repoNameWithOwner: "bitcoin/bitcoin", type: "commit", count: 50, dateRange: { from: new Date(), to: new Date() } },
        { repoNameWithOwner: "unrelated/repo", type: "commit", count: 200, dateRange: { from: new Date(), to: new Date() } },
      ],
      [{ nameWithOwner: "bitcoin/bitcoin", tier: "core", reason: "curated" }]
    );

    const stats = computeStats(overview, false);

    expect(stats.totalCommits).toBe(250);
    expect(stats.projectCount).toBe(2);
  });
});

describe("aggregateMonthly", () => {
  it("aggregates days into monthly buckets", () => {
    const weeks: ContributionCalendarWeek[] = [
      {
        contributionDays: [
          { date: "2024-01-15", contributionCount: 3, color: "#green" },
          { date: "2024-01-16", contributionCount: 2, color: "#green" },
        ],
      },
      {
        contributionDays: [
          { date: "2024-02-01", contributionCount: 5, color: "#green" },
        ],
      },
    ];

    const monthly = aggregateMonthly(weeks);

    expect(monthly).toEqual([
      { month: "2024-01", count: 5 },
      { month: "2024-02", count: 5 },
    ]);
  });

  it("sorts months chronologically", () => {
    const weeks: ContributionCalendarWeek[] = [
      {
        contributionDays: [
          { date: "2024-03-01", contributionCount: 1, color: "#green" },
          { date: "2024-01-01", contributionCount: 2, color: "#green" },
        ],
      },
    ];

    const monthly = aggregateMonthly(weeks);
    expect(monthly[0].month).toBe("2024-01");
    expect(monthly[1].month).toBe("2024-03");
  });

  it("returns empty array for empty weeks", () => {
    expect(aggregateMonthly([])).toEqual([]);
  });
});
