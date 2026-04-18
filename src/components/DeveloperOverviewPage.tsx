"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useOverview } from "@/hooks/use-overview";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { computeStats, aggregateMonthly } from "@/lib/stats";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ProfileCard } from "@/components/ProfileCard";
import { SaveDeveloperModal } from "@/components/SaveDeveloperModal";
import { StatsGrid } from "@/components/StatsGrid";
import { ContributionHeatmap } from "@/components/ContributionHeatmap";
import { ContributionTimeline } from "@/components/ContributionTimeline";
import { TopProjects } from "@/components/TopProjects";
import { ContributionDrillDown } from "@/components/ContributionDrillDown";
import { RateLimitBadge } from "@/components/RateLimitBadge";
import { Button } from "@/components/ui/button";
import {
  ProfileCardSkeleton,
  StatsGridSkeleton,
  HeatmapSkeleton,
  TimelineSkeleton,
} from "@/components/Skeletons";

const LOADING_MESSAGES = [
  "Fetching GitHub profile…",
  "Analysing contributions…",
  "Counting lines of code…",
  "Almost there…",
];

function useLoadingMessage(active: boolean) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    timerRef.current = setTimeout(() => {
      setIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, index]);

  return LOADING_MESSAGES[index];
}

interface DeveloperOverviewPageProps {
  username: string;
}

export function DeveloperOverviewPage({ username }: DeveloperOverviewPageProps) {
  const { data, error, isLoading, mutate } = useOverview(username);
  const { addSearch } = useRecentSearches();
  const [showAdjacent, setShowAdjacent] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const loadingMessage = useLoadingMessage(isLoading);

  // Record search once data loads
  useEffect(() => {
    if (data) {
      addSearch(data.login, data.avatarUrl);
    }
  }, [data, data?.login, data?.avatarUrl, addSearch]);

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
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to search
          </Link>
          <RateLimitBadge />
        </div>

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
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-400" />
              </span>
              {loadingMessage}
            </div>
            <ProfileCardSkeleton />
            <StatsGridSkeleton />
            <HeatmapSkeleton />
            <TimelineSkeleton />
          </div>
        )}

        {data && (
          <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <ProfileCard
                  login={data.login}
                  name={data.name}
                  avatarUrl={data.avatarUrl}
                  bio={data.bio}
                  createdAt={data.createdAt}
                />
              </div>
              <Button
                variant="outline"
                className="mt-1 shrink-0"
                onClick={() => setSaveOpen(true)}
              >
                Save
              </Button>
            </div>
            <SaveDeveloperModal
              username={data.login}
              open={saveOpen}
              onOpenChange={setSaveOpen}
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

            <ContributionDrillDown
              username={username}
              bitcoinRepos={data.bitcoinRepos}
            />
          </div>
        )}
      </div>
    </div>
  );
}
