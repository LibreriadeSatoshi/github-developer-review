import type { DeveloperOverview, ContributionCalendarWeek, RepoClassification } from "./types";
import { AGGREGATED_SENTINEL } from "./types";

export interface OverviewStats {
  totalPRs: number;
  totalCommits: number;
  totalReviews: number;
  totalIssues: number;
  projectCount: number;
  linesAdded: number;
}

export function computeStats(
  overview: DeveloperOverview,
  bitcoinOnly?: boolean
): OverviewStats {
  const bitcoinRepoNames = bitcoinOnly
    ? new Set(overview.bitcoinRepos.map((r: RepoClassification) => r.nameWithOwner))
    : null;

  let totalPRs = 0;
  let totalCommits = 0;
  let totalReviews = 0;
  let totalIssues = 0;
  const repos = new Set<string>();

  for (const c of overview.contributions) {
    const isAggregated = c.repoNameWithOwner === AGGREGATED_SENTINEL;
    // When filtering to Bitcoin-only, skip contributions not in classified repos
    // Always include aggregated contributions (issues) since they can't be filtered per-repo
    if (bitcoinRepoNames && !isAggregated && !bitcoinRepoNames.has(c.repoNameWithOwner)) {
      continue;
    }

    if (!isAggregated) repos.add(c.repoNameWithOwner);

    switch (c.type) {
      case "pr":
        totalPRs += c.count;
        break;
      case "commit":
        totalCommits += c.count;
        break;
      case "review":
        totalReviews += c.count;
        break;
      case "issue":
        totalIssues += c.count;
        break;
    }
  }

  return {
    totalPRs,
    totalCommits,
    totalReviews,
    totalIssues,
    projectCount: repos.size,
    linesAdded: overview.linesAdded,
  };
}

export interface MonthlyData {
  month: string;
  count: number;
}

export function aggregateMonthly(weeks: ContributionCalendarWeek[]): MonthlyData[] {
  const buckets = new Map<string, number>();

  for (const week of weeks) {
    for (const day of week.contributionDays) {
      // day.date is "YYYY-MM-DD"
      const month = day.date.slice(0, 7); // "YYYY-MM"
      buckets.set(month, (buckets.get(month) ?? 0) + day.contributionCount);
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}
