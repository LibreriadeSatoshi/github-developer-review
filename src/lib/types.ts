export type RelevanceTier = "core" | "ecosystem" | "adjacent";

export interface RepoClassification {
  nameWithOwner: string;
  tier: RelevanceTier;
  reason: string;
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
