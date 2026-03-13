"use client";

import { useMemo } from "react";
import { useContributionFilters } from "@/hooks/use-contribution-filters";
import { useContributions } from "@/hooks/use-contributions";
import { DateFilterBar } from "@/components/DateFilterBar";
import { ContributionFilters } from "@/components/ContributionFilters";
import { ContributionTable } from "@/components/ContributionTable";
import { ContributionCard } from "@/components/ContributionCard";
import { ContributionTableSkeleton } from "@/components/Skeletons";
import { ErrorBanner } from "@/components/ErrorBanner";
import { EmptyState } from "@/components/EmptyState";
import { MobileFilterSheet } from "@/components/MobileFilterSheet";
import { Button } from "@/components/ui/button";
import type { RepoClassification, RelevanceTier } from "@/lib/types";

interface ContributionDrillDownProps {
  username: string;
  bitcoinRepos: RepoClassification[];
}

const tabLabels = {
  prs: "Pull Requests",
  reviews: "Reviews",
  issues: "Issues",
} as const;

const tabs = ["prs", "reviews", "issues"] as const;

export function ContributionDrillDown({
  username,
  bitcoinRepos,
}: ContributionDrillDownProps) {
  const {
    filters,
    setTab,
    setPreset,
    setProject,
    setStatus,
    setTier,
  } = useContributionFilters();

  const { items, totalCount, hasMore, error, isLoading, isLoadingMore, loadMore } =
    useContributions(username, filters);

  // Client-side tier filtering
  const filteredItems = useMemo(() => {
    if (!filters.tier || filters.tier === "all") return items;
    const tierRepos = new Set(
      bitcoinRepos
        .filter((r) => r.tier === filters.tier)
        .map((r) => r.nameWithOwner)
    );
    return items.filter((item) => tierRepos.has(item.repoNameWithOwner));
  }, [items, filters.tier, bitcoinRepos]);

  const filterProps = {
    bitcoinRepos,
    activePreset: filters.preset,
    onPresetChange: setPreset,
    project: filters.project,
    status: (filters.status ?? "all") as "open" | "closed" | "merged" | "all",
    tier: (filters.tier ?? "all") as RelevanceTier | "all",
    onProjectChange: setProject,
    onStatusChange: setStatus,
    onTierChange: setTier,
  };

  const errorVariant = error
    ? error.status === 429
      ? ("rate-limit" as const)
      : ("error" as const)
    : undefined;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Contributions</h2>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={filters.tab === tab}
            onClick={() => setTab(tab)}
            className={`whitespace-nowrap flex-shrink-0 px-4 py-2 text-sm font-medium transition-colors ${
              filters.tab === tab
                ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Filters — desktop */}
      <div className="hidden md:block space-y-3">
        <DateFilterBar
          activePreset={filterProps.activePreset}
          onPresetChange={filterProps.onPresetChange}
        />
        <ContributionFilters {...filterProps} />
      </div>

      {/* Filters — mobile */}
      <div className="md:hidden">
        <MobileFilterSheet {...filterProps} />
      </div>

      {/* Error */}
      {error && (
        <ErrorBanner
          variant={errorVariant}
          resetAt={error.resetAt}
        />
      )}

      {/* Results count */}
      {!isLoading && !error && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {totalCount >= 1000
            ? "Showing first 1,000 results — try narrowing your filters"
            : `${totalCount} result${totalCount !== 1 ? "s" : ""}`}
        </p>
      )}

      {/* Loading */}
      {isLoading && <ContributionTableSkeleton />}

      {/* Table (desktop) */}
      {!isLoading && <ContributionTable items={filteredItems} />}

      {/* Cards (mobile) */}
      {!isLoading && (
        <div className="md:hidden space-y-3">
          {filteredItems.length === 0 && !error && <EmptyState />}
          {filteredItems.map((item) => (
            <ContributionCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !isLoading && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={!!isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
