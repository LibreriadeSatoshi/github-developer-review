"use client";

import useSWR from "swr";
import type { DeveloperOverview } from "@/lib/types";

export type OverviewError = {
  status: number;
  message: string;
  resetAt?: number;
};

async function fetcher(url: string): Promise<DeveloperOverview> {
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: OverviewError = {
      status: res.status,
      message: body.error ?? "An unexpected error occurred",
      resetAt: body.resetAt,
    };
    throw err;
  }

  return res.json();
}

export function useOverview(username: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<DeveloperOverview, OverviewError>(
    username ? `/api/github/overview/${username}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600_000 }
  );

  return { data, error, isLoading, mutate };
}
