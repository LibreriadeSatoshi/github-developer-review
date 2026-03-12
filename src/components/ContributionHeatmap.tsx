import type { ContributionCalendarWeek } from "@/lib/types";

interface ContributionHeatmapProps {
  calendarWeeks: ContributionCalendarWeek[];
}

function getIntensity(count: number): string {
  if (count === 0) return "bg-zinc-100 dark:bg-zinc-800";
  if (count <= 3) return "bg-green-200 dark:bg-green-900";
  if (count <= 6) return "bg-green-400 dark:bg-green-700";
  if (count <= 9) return "bg-green-600 dark:bg-green-500";
  return "bg-green-800 dark:bg-green-400";
}

export function ContributionHeatmap({ calendarWeeks }: ContributionHeatmapProps) {
  // Show last 52 weeks
  const weeks = calendarWeeks.slice(-52);

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Contributions
      </h2>
      {weeks.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No contribution data available.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.contributionDays.map((day) => (
                  <div
                    key={day.date}
                    className={`h-3 w-3 rounded-sm ${getIntensity(day.contributionCount)}`}
                    title={`${day.date}: ${day.contributionCount} contributions`}
                    aria-label={`${day.date}: ${day.contributionCount} contributions`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
