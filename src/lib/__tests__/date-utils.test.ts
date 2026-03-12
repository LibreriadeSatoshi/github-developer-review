import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getYearRanges, getPresetRange } from "@/lib/date-utils";

describe("getYearRanges", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("splits multi-year account into correct 1-year windows", () => {
    const createdAt = new Date("2022-01-01T00:00:00Z");
    const ranges = getYearRanges(createdAt);

    expect(ranges.length).toBe(4);
    expect(ranges[0].from).toEqual(new Date("2022-01-01T00:00:00Z"));
    expect(ranges[0].to).toEqual(new Date("2023-01-01T00:00:00Z"));
    expect(ranges[3].from).toEqual(new Date("2025-01-01T00:00:00Z"));
    expect(ranges[3].to.getTime()).toBeLessThanOrEqual(
      new Date("2025-06-15T00:00:00Z").getTime()
    );
  });

  it("has no gaps between ranges", () => {
    const createdAt = new Date("2022-06-15T00:00:00Z");
    const ranges = getYearRanges(createdAt);

    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i].from.getTime()).toBe(ranges[i - 1].to.getTime());
    }
  });

  it("has no overlaps between ranges", () => {
    const createdAt = new Date("2021-03-01T00:00:00Z");
    const ranges = getYearRanges(createdAt);

    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i].from.getTime()).toBeGreaterThanOrEqual(
        ranges[i - 1].to.getTime()
      );
    }
  });

  it("returns 1 range for account created 6 months ago", () => {
    const createdAt = new Date("2025-01-01T00:00:00Z");
    const ranges = getYearRanges(createdAt);

    expect(ranges.length).toBe(1);
    expect(ranges[0].from).toEqual(new Date("2025-01-01T00:00:00Z"));
  });
});

describe("getPresetRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns correct range for 30d preset", () => {
    const range = getPresetRange("30d");
    const expectedFrom = new Date("2025-05-16T00:00:00Z");
    expect(range.from).toEqual(expectedFrom);
    expect(range.to).toEqual(new Date("2025-06-15T00:00:00Z"));
  });

  it("returns correct range for 3mo preset", () => {
    const range = getPresetRange("3mo");
    const expectedFrom = new Date("2025-03-15T00:00:00Z");
    expect(range.from).toEqual(expectedFrom);
  });

  it("returns correct range for 6mo preset", () => {
    const range = getPresetRange("6mo");
    const expectedFrom = new Date("2024-12-15T00:00:00Z");
    expect(range.from).toEqual(expectedFrom);
  });

  it("returns correct range for 1yr preset", () => {
    const range = getPresetRange("1yr");
    const expectedFrom = new Date("2024-06-15T00:00:00Z");
    expect(range.from).toEqual(expectedFrom);
  });

  it("returns correct range for all preset", () => {
    const range = getPresetRange("all");
    expect(range.from).toEqual(new Date("2008-01-01T00:00:00Z"));
    expect(range.to).toEqual(new Date("2025-06-15T00:00:00Z"));
  });
});
