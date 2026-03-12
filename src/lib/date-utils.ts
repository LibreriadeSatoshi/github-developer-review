import type { DateRange } from "./types";

/** GitHub's founding year — earliest possible account creation */
export const GITHUB_EPOCH = "2008-01-01T00:00:00Z";

export function getYearRanges(createdAt: Date, now?: Date): DateRange[] {
  const end = now ?? new Date();
  const ranges: DateRange[] = [];

  let current = new Date(createdAt);

  while (current < end) {
    const yearLater = new Date(current);
    yearLater.setUTCFullYear(yearLater.getUTCFullYear() + 1);

    const rangeEnd = yearLater < end ? yearLater : end;
    ranges.push({ from: new Date(current), to: new Date(rangeEnd) });
    current = rangeEnd;
  }

  return ranges;
}

export type PresetKey = "30d" | "3mo" | "6mo" | "1yr" | "all";

export function getPresetRange(preset: PresetKey, now?: Date): DateRange {
  const to = now ?? new Date();

  switch (preset) {
    case "30d": {
      const from = new Date(to);
      from.setUTCDate(from.getUTCDate() - 30);
      return { from, to: new Date(to) };
    }
    case "3mo": {
      const from = new Date(to);
      from.setUTCMonth(from.getUTCMonth() - 3);
      return { from, to: new Date(to) };
    }
    case "6mo": {
      const from = new Date(to);
      from.setUTCMonth(from.getUTCMonth() - 6);
      return { from, to: new Date(to) };
    }
    case "1yr": {
      const from = new Date(to);
      from.setUTCFullYear(from.getUTCFullYear() - 1);
      return { from, to: new Date(to) };
    }
    case "all": {
      return {
        from: new Date(GITHUB_EPOCH),
        to: new Date(to),
      };
    }
  }
}
