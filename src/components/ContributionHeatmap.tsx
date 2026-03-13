"use client";

import { useState, useCallback, useRef, useMemo } from "react";
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
  const weeks = useMemo(() => calendarWeeks.slice(-52), [calendarWeeks]);
  const [focusedWeek, setFocusedWeek] = useState(0);
  const [focusedDay, setFocusedDay] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (weeks.length === 0) return;

      let nextWeek = focusedWeek;
      let nextDay = focusedDay;

      switch (e.key) {
        case "ArrowRight":
          nextWeek = Math.min(focusedWeek + 1, weeks.length - 1);
          nextDay = Math.min(focusedDay, weeks[nextWeek].contributionDays.length - 1);
          break;
        case "ArrowLeft":
          nextWeek = Math.max(focusedWeek - 1, 0);
          nextDay = Math.min(focusedDay, weeks[nextWeek].contributionDays.length - 1);
          break;
        case "ArrowDown":
          nextDay = Math.min(focusedDay + 1, weeks[focusedWeek].contributionDays.length - 1);
          break;
        case "ArrowUp":
          nextDay = Math.max(focusedDay - 1, 0);
          break;
        default:
          return;
      }

      e.preventDefault();
      setFocusedWeek(nextWeek);
      setFocusedDay(nextDay);

      // Focus the cell
      const cell = gridRef.current?.querySelector(
        `[data-week="${nextWeek}"][data-day="${nextDay}"]`
      ) as HTMLElement | null;
      cell?.focus();
    },
    [focusedWeek, focusedDay, weeks]
  );

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
          <div
            ref={gridRef}
            className="inline-flex gap-[3px]"
            role="grid"
            aria-label="Contribution heatmap"
            onKeyDown={handleKeyDown}
          >
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]" role="row">
                {week.contributionDays.map((day, di) => (
                  <div
                    key={day.date}
                    role="gridcell"
                    data-week={wi}
                    data-day={di}
                    tabIndex={wi === focusedWeek && di === focusedDay ? 0 : -1}
                    className={`h-3 w-3 rounded-sm ${getIntensity(day.contributionCount)} focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
