import type { ContributionItem, DateRange } from "./types";
import { getYearRanges } from "./date-utils";

const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const MAX_CONCURRENT_REQUESTS = 3;

const CONTRIBUTIONS_QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    login
    name
    avatarUrl
    bio
    createdAt
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      commitContributionsByRepository {
        repository {
          nameWithOwner
          description
          repositoryTopics(first: 10) {
            nodes { topic { name } }
          }
        }
        contributions {
          totalCount
        }
      }
      issueContributions {
        totalCount
      }
      pullRequestContributions {
        totalCount
      }
      pullRequestReviewContributions {
        totalCount
      }
    }
  }
}`;

interface RepositoryTopic {
  topic: { name: string };
}

interface GraphQLContributionsResponse {
  data: {
    user: {
      login: string;
      name: string | null;
      avatarUrl: string;
      bio: string | null;
      createdAt: string;
      contributionsCollection: {
        totalCommitContributions: number;
        commitContributionsByRepository: {
          repository: {
            nameWithOwner: string;
            description: string | null;
            repositoryTopics: { nodes: RepositoryTopic[] };
          };
          contributions: { totalCount: number };
        }[];
        issueContributions: { totalCount: number };
        pullRequestContributions: { totalCount: number };
        pullRequestReviewContributions: { totalCount: number };
      };
    } | null;
  };
  errors?: { message: string }[];
}

export interface RepoMetadata {
  nameWithOwner: string;
  description?: string;
  topics?: string[];
}

interface FetchContributionsResult {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  createdAt: string;
  totalContributions: number;
  contributions: ContributionItem[];
  repoMetadata: RepoMetadata[];
}

export async function fetchContributions(
  login: string,
  token: string,
  dateRange: DateRange
): Promise<FetchContributionsResult> {
  const response = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: {
        login,
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
    }),
  });

  // C3: Check HTTP status before parsing
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("GitHub authentication failed — invalid or expired token");
    }
    if (response.status === 403) {
      throw new Error("GitHub API rate limit exceeded");
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const json: GraphQLContributionsResponse = await response.json();

  // M3: Join all error messages
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }

  if (!json.data.user) {
    throw new Error(`User "${login}" not found`);
  }

  const user = json.data.user;
  const collection = user.contributionsCollection;

  // C1: Map all contribution types
  const contributions: ContributionItem[] = [];

  for (const repo of collection.commitContributionsByRepository) {
    contributions.push({
      repoNameWithOwner: repo.repository.nameWithOwner,
      type: "commit",
      count: repo.contributions.totalCount,
      dateRange,
    });
  }

  if (collection.issueContributions.totalCount > 0) {
    contributions.push({
      repoNameWithOwner: "_aggregated",
      type: "issue",
      count: collection.issueContributions.totalCount,
      dateRange,
    });
  }

  if (collection.pullRequestContributions.totalCount > 0) {
    contributions.push({
      repoNameWithOwner: "_aggregated",
      type: "pr",
      count: collection.pullRequestContributions.totalCount,
      dateRange,
    });
  }

  if (collection.pullRequestReviewContributions.totalCount > 0) {
    contributions.push({
      repoNameWithOwner: "_aggregated",
      type: "review",
      count: collection.pullRequestReviewContributions.totalCount,
      dateRange,
    });
  }

  // C1: Sum all contribution types
  const totalContributions =
    collection.totalCommitContributions +
    collection.issueContributions.totalCount +
    collection.pullRequestContributions.totalCount +
    collection.pullRequestReviewContributions.totalCount;

  // I3: Extract repo metadata for classification
  const repoMetadata: RepoMetadata[] =
    collection.commitContributionsByRepository.map((repo) => ({
      nameWithOwner: repo.repository.nameWithOwner,
      description: repo.repository.description ?? undefined,
      topics: repo.repository.repositoryTopics?.nodes.map(
        (n) => n.topic.name
      ),
    }));

  return {
    login: user.login,
    name: user.name,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    createdAt: user.createdAt,
    totalContributions,
    contributions,
    repoMetadata,
  };
}

// D1: Simple concurrency limiter (avoids adding p-limit dependency)
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

export async function fetchAllContributions(
  login: string,
  token: string,
  accountCreatedAt: Date
): Promise<FetchContributionsResult> {
  const ranges = getYearRanges(accountCreatedAt);

  // I7: Guard against empty ranges
  if (ranges.length === 0) {
    return {
      login,
      name: null,
      avatarUrl: "",
      bio: null,
      createdAt: accountCreatedAt.toISOString(),
      totalContributions: 0,
      contributions: [],
      repoMetadata: [],
    };
  }

  // D1: Limit concurrency to avoid secondary rate limits
  const results = await mapWithConcurrency(
    ranges,
    MAX_CONCURRENT_REQUESTS,
    (range) => fetchContributions(login, token, range)
  );

  // Merge results
  const merged: FetchContributionsResult = {
    login: results[0].login,
    name: results[0].name,
    avatarUrl: results[0].avatarUrl,
    bio: results[0].bio,
    createdAt: results[0].createdAt,
    totalContributions: results.reduce(
      (sum, r) => sum + r.totalContributions,
      0
    ),
    contributions: results.flatMap((r) => r.contributions),
    repoMetadata: deduplicateMetadata(results.flatMap((r) => r.repoMetadata)),
  };

  return merged;
}

function deduplicateMetadata(metadata: RepoMetadata[]): RepoMetadata[] {
  const seen = new Map<string, RepoMetadata>();
  for (const m of metadata) {
    if (!seen.has(m.nameWithOwner)) {
      seen.set(m.nameWithOwner, m);
    }
  }
  return Array.from(seen.values());
}
