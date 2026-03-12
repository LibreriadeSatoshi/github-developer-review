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
