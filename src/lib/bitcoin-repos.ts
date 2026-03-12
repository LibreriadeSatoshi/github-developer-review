import type { RepoClassification, RelevanceTier } from "./types";
import curatedData from "../../config/bitcoin-repos.json";

interface RepoMetadata {
  description?: string;
  topics?: string[];
}

const curated: Record<string, RelevanceTier> = curatedData.curated as Record<
  string,
  RelevanceTier
>;
const keywords: Record<string, string[]> = curatedData.keywords;

// I2: Pre-compile word-boundary regexes at module load
const keywordRegexes: Record<string, { keyword: string; regex: RegExp }[]> = {};
for (const tier of Object.keys(keywords)) {
  keywordRegexes[tier] = keywords[tier].map((kw) => ({
    keyword: kw,
    regex: new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
  }));
}

export function classifyRepo(
  nameWithOwner: string,
  metadata?: RepoMetadata
): RepoClassification | null {
  // Layer 1: Curated list
  if (curated[nameWithOwner]) {
    return {
      nameWithOwner,
      tier: curated[nameWithOwner],
      reason: "curated",
    };
  }

  // Layer 2: Keyword matching with word boundaries
  const searchableText = [
    nameWithOwner.toLowerCase(),
    (metadata?.description ?? "").toLowerCase(),
    ...(metadata?.topics ?? []).map((t) => t.toLowerCase()),
  ].join(" ");

  for (const tier of ["core", "ecosystem", "adjacent"] as RelevanceTier[]) {
    const tierPatterns = keywordRegexes[tier];
    if (!tierPatterns) continue;
    for (const { keyword, regex } of tierPatterns) {
      if (regex.test(searchableText)) {
        return {
          nameWithOwner,
          tier,
          reason: `keyword: ${keyword}`,
        };
      }
    }
  }

  return null;
}

export function classifyRepos(
  repos: { nameWithOwner: string; description?: string; topics?: string[] }[]
): Map<string, RepoClassification> {
  const result = new Map<string, RepoClassification>();
  for (const repo of repos) {
    const classification = classifyRepo(repo.nameWithOwner, {
      description: repo.description,
      topics: repo.topics,
    });
    if (classification) {
      result.set(repo.nameWithOwner, classification);
    }
  }
  return result;
}
