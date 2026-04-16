"use client";

import { cn } from "@/lib/utils";
import type { PresetKey } from "@/lib/date-utils";

interface DateFilterBarProps {
  activePreset: PresetKey | "custom";
  onPresetChange: (preset: PresetKey) => void;
}

const presets: { key: PresetKey; label: string }[] = [
  { key: "30d", label: "30 days" },
  { key: "3mo", label: "3 months" },
  { key: "6mo", label: "6 months" },
  { key: "1yr", label: "1 year" },
  { key: "this_yr", label: "This year" },
  { key: "last_yr", label: "Last year" },
  { key: "all", label: "All time" },
];

export function DateFilterBar({ activePreset, onPresetChange }: DateFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Date range presets">
      {presets.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onPresetChange(key)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activePreset === key
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          )}
          aria-pressed={activePreset === key}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
