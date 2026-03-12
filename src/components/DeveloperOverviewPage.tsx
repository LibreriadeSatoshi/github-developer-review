"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useOverview } from "@/hooks/use-overview";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { computeStats, aggregateMonthly } from "@/lib/stats";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ProfileCard } from "@/components/ProfileCard";
import { StatsGrid } from "@/components/StatsGrid";
import { ContributionHeatmap } from "@/components/ContributionHeatmap";
import { ContributionTimeline } from "@/components/ContributionTimeline";
import { TopProjects } from "@/components/TopProjects";
import {
  ProfileCardSkeleton,
  StatsGridSkeleton,
  HeatmapSkeleton,
  TimelineSkeleton,
} from "@/components/Skeletons";

interface DeveloperOverviewPageProps {
  username: string;
}

export function DeveloperOverviewPage({ username }: DeveloperOverviewPageProps) {
  const { data, error, isLoading, mutate } = useOverview(username);
  const { addSearch } = useRecentSearches();
  const [showAdjacent, setShowAdjacent] = useState(false);

  // Record search once data loads
  useEffect(() => {
    if (data) {
      addSearch(data.login, data.avatarUrl);
    }
  }, [data?.login, data?.avatarUrl, addSearch]);

  const errorVariant = error
    ? error.status === 429
      ? ("rate-limit" as const)
      : error.status === 404
        ? ("not-found" as const)
        : ("error" as const)
    : undefined;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>

        {error && (
          <ErrorBanner
            variant={errorVariant}
            resetAt={error.resetAt}
            onRetry={errorVariant === "error" ? () => mutate() : undefined}
            message={
              errorVariant === "not-found"
                ? `User "${username}" not found on GitHub.`
                : undefined
            }
          />
        )}

        {isLoading && (
          <div className="space-y-8">
            <ProfileCardSkeleton />
            <StatsGridSkeleton />
            <HeatmapSkeleton />
            <TimelineSkeleton />
          </div>
        )}

        {data && (
          <div className="space-y-8">
            <ProfileCard
              login={data.login}
              name={data.name}
              avatarUrl={data.avatarUrl}
              bio={data.bio}
              createdAt={data.createdAt}
            />

            <StatsGrid stats={computeStats(data, true)} />

            <ContributionHeatmap calendarWeeks={data.calendarWeeks} />

            <ContributionTimeline data={aggregateMonthly(data.calendarWeeks)} />

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Bitcoin Projects</h2>
              <label className="flex items-center gap-2 text-sm text-zinc-500">
                <input
                  type="checkbox"
                  checked={showAdjacent}
                  onChange={(e) => setShowAdjacent(e.target.checked)}
                  className="rounded"
                />
                Show adjacent
              </label>
            </div>

            <TopProjects
              bitcoinRepos={data.bitcoinRepos}
              contributions={data.contributions}
              showAdjacent={showAdjacent}
            />
          </div>
        )}
      </div>
    </div>
  );
}
