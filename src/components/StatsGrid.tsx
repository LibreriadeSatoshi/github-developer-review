import { Card, CardContent } from "@/components/ui/card";
import type { OverviewStats } from "@/lib/stats";

interface StatsGridProps {
  stats: OverviewStats;
}

const statLabels: { key: keyof OverviewStats; label: string }[] = [
  { key: "totalCommits", label: "Commits" },
  { key: "totalPRs", label: "Pull Requests" },
  { key: "totalReviews", label: "Reviews" },
  { key: "totalIssues", label: "Issues" },
  { key: "projectCount", label: "Projects" },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return n.toString();
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Contribution statistics">
      {statLabels.map(({ key, label }) => (
        <Card key={key}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {formatNumber(stats[key])}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
