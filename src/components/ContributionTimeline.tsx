"use client";

import dynamic from "next/dynamic";
import type { MonthlyData } from "@/lib/stats";

const LazyChart = dynamic(() => import("./ContributionTimelineChart"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
  ),
});

interface ContributionTimelineProps {
  data: MonthlyData[];
}

export function ContributionTimeline({ data }: ContributionTimelineProps) {
  if (data.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Activity Over Time
      </h2>
      <LazyChart data={data} />
    </div>
  );
}
