import { useState, useEffect } from "react";
import { Star, Globe, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AGGREGATED_SENTINEL } from "@/lib/types";
import type { RepoClassification, ContributionItem, RelevanceTier } from "@/lib/types";

const tierIcons: Record<RelevanceTier, React.ReactNode> = {
  core: <Star className="h-3 w-3" />,
  ecosystem: <Globe className="h-3 w-3" />,
  adjacent: <Minus className="h-3 w-3" />,
};

interface TopProjectsProps {
  bitcoinRepos: RepoClassification[];
  contributions: ContributionItem[];
  showAdjacent: boolean;
}

const tierColors: Record<RelevanceTier, string> = {
  core: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  ecosystem: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  adjacent: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const PAGE_SIZE = 5;

export function TopProjects({ bitcoinRepos, contributions, showAdjacent }: TopProjectsProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [showAdjacent]);

  const repos = showAdjacent
    ? bitcoinRepos
    : bitcoinRepos.filter((r) => r.tier !== "adjacent");

  if (repos.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No Bitcoin-related projects found.
      </p>
    );
  }

  // Sum contribution counts per repo
  const countByRepo = new Map<string, number>();
  for (const c of contributions) {
    if (c.repoNameWithOwner === AGGREGATED_SENTINEL) continue;
    countByRepo.set(
      c.repoNameWithOwner,
      (countByRepo.get(c.repoNameWithOwner) ?? 0) + c.count
    );
  }

  // Sort by contribution count descending
  const sorted = [...repos].sort((a, b) => {
    const ca = countByRepo.get(a.nameWithOwner) ?? 0;
    const cb = countByRepo.get(b.nameWithOwner) ?? 0;
    return cb - ca;
  });

  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  return (
    <div className="space-y-3">
      {visible.map((repo) => {
        const repoUrl = repo.url ?? `https://github.com/${repo.nameWithOwner}`;
        return (
          <a
            key={repo.nameWithOwner}
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {repo.nameWithOwner}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {countByRepo.get(repo.nameWithOwner) ?? 0} contributions
                  </p>
                </div>
                <Badge
                  className={tierColors[repo.tier]}
                  variant="outline"
                  aria-label={`Tier: ${repo.tier}`}
                >
                  {tierIcons[repo.tier]}
                  {repo.tier}
                </Badge>
              </CardContent>
            </Card>
          </a>
        );
      })}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
