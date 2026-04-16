import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCached, setCache } from "@/lib/cache";
import { fetchAllContributions } from "@/lib/github-graphql";
import { classifyRepos } from "@/lib/bitcoin-repos";
import { GITHUB_USERNAME_RE } from "@/lib/utils";
import { RateLimitError } from "@/lib/types";
import type { DeveloperOverview } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await params;

  // I5: Validate username
  if (!GITHUB_USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Invalid GitHub username" },
      { status: 400 }
    );
  }

  // I4: Normalize cache key to lowercase
  // Cache key v2: bumped to invalidate old entries that used /stats/contributors (returned 0)
  const cacheKey = `overview:2:${username.toLowerCase()}`;

  const cached = await getCached<DeveloperOverview>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    // C2: First fetch a single recent range to get real createdAt
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);

    const initial = await fetchAllContributions(
      username,
      session.accessToken,
      oneYearAgo
    );

    // Use real createdAt for full history fetch
    const accountCreatedAt = new Date(initial.createdAt);

    // Only fetch remaining history if account is older than 1 year
    let result = initial;
    if (accountCreatedAt < oneYearAgo) {
      result = await fetchAllContributions(
        username,
        session.accessToken,
        accountCreatedAt
      );
    }

    // I3: Pass repo metadata (description, topics) to classifyRepos
    const classifications = classifyRepos(result.repoMetadata);

    const overview: DeveloperOverview = {
      login: result.login,
      name: result.name,
      avatarUrl: result.avatarUrl,
      bio: result.bio,
      createdAt: result.createdAt,
      totalContributions: result.totalContributions,
      bitcoinRepos: Array.from(classifications.values()),
      contributions: result.contributions,
      calendarWeeks: result.calendarWeeks,
      linesAdded: result.linesAdded,
      linesDeleted: result.linesDeleted,
    };

    await setCache(cacheKey, overview);
    return NextResponse.json(overview);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Rate limit exceeded", resetAt: error.resetAt },
        { status: 429 }
      );
    }
    if (error instanceof Error && /not found/i.test(error.message)) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "GitHub API error" },
      { status: 502 }
    );
  }
}
