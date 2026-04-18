import type { PresetKey } from "./date-utils";

export type RelevanceTier = "core" | "ecosystem" | "adjacent";

export interface RepoClassification {
  nameWithOwner: string;
  url?: string;
  tier: RelevanceTier;
  reason: string;
}

export interface ContributionCalendarDay {
  date: string;
  contributionCount: number;
  color: string;
}

export interface ContributionCalendarWeek {
  contributionDays: ContributionCalendarDay[];
}

export interface DeveloperOverview {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  createdAt: string;
  totalContributions: number;
  bitcoinRepos: RepoClassification[];
  contributions: ContributionItem[];
  calendarWeeks: ContributionCalendarWeek[];
  linesAdded: number;
  linesDeleted: number;
  linesAddedAll: number;
  linesDeletedAll: number;
  linesResolved?: boolean;
}

export interface ContributionItem {
  repoNameWithOwner: string;
  type: "commit" | "issue" | "pr" | "review";
  count: number;
  dateRange: DateRange;
}

export interface RateLimitState {
  remaining: number;
  resetAt: number; // ms timestamp
}

export class RateLimitError extends Error {
  public readonly resetAt: number;

  constructor(message: string, resetAt: number) {
    super(message);
    this.name = "RateLimitError";
    this.resetAt = resetAt;
  }
}

export interface DateRange {
  from: Date;
  to: Date;
}

/** Sentinel repo name for contributions not broken down per-repo (e.g. issues). */
export const AGGREGATED_SENTINEL = "__github_aggregated__";

// --- Phase 3: Drill-Down Types ---

export interface ContributionDetail {
  id: number;
  number: number;
  title: string;
  repoNameWithOwner: string;
  type: "pr" | "issue" | "review";
  state: "open" | "closed" | "merged";
  createdAt: string;
  closedAt: string | null;
  url: string;
}

export interface PRDetail {
  number: number;
  repoNameWithOwner: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  commits: number;
  mergedAt: string | null;
  timeToMerge: number | null; // milliseconds
  reviewCount: number;
}

export interface PaginatedContributions {
  items: ContributionDetail[];
  totalCount: number;
  hasMore: boolean;
  page: number;
}

export type DrillDownTab = "prs" | "reviews" | "issues";

export interface ContributionFilters {
  tab: DrillDownTab;
  preset: PresetKey | "custom";
  from?: string;
  to?: string;
  project?: string;
  status?: "open" | "closed" | "merged" | "all";
  tier?: RelevanceTier | "all";
}
