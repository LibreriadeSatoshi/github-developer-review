"use client";

import useSWR from "swr";

interface RateLimitData {
  remaining: number;
  limit: number;
  resetAt: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch rate limit");
  return res.json();
};

export function useRateLimit() {
  const { data, error, isLoading } = useSWR<RateLimitData>(
    "/api/github/rate-limit",
    fetcher,
    { refreshInterval: 30_000 }
  );

  return { data, error, isLoading };
}
