"use client";

import { useRateLimit } from "@/hooks/use-rate-limit";
import { Badge } from "@/components/ui/badge";

function getColor(remaining: number, limit: number): string {
  const ratio = remaining / limit;
  if (ratio > 0.5) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (ratio > 0.1) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
}

export function RateLimitBadge() {
  const { data, error, isLoading } = useRateLimit();

  if (isLoading) {
    return (
      <Badge variant="outline" className="text-xs">
        API: …
      </Badge>
    );
  }

  if (error || !data) {
    return (
      <Badge variant="outline" className="text-xs text-red-600">
        API: error
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`text-xs ${getColor(data.remaining, data.limit)}`}
      aria-label={`API rate limit: ${data.remaining} of ${data.limit} remaining`}
    >
      API: {data.remaining}/{data.limit}
    </Badge>
  );
}
