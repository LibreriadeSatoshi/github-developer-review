import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StatsGrid } from "@/components/StatsGrid";
import type { OverviewStats } from "@/lib/stats";

afterEach(cleanup);

describe("StatsGrid", () => {
  const stats: OverviewStats = {
    totalCommits: 1234,
    totalPRs: 56,
    totalReviews: 78,
    totalIssues: 12,
    projectCount: 9,
    linesAdded: 42300,
  };

  it("renders all 6 stat cards", () => {
    render(<StatsGrid stats={stats} />);

    expect(screen.getByText("Commits")).toBeInTheDocument();
    expect(screen.getByText("Pull Requests")).toBeInTheDocument();
    expect(screen.getByText("Reviews")).toBeInTheDocument();
    expect(screen.getByText("Issues")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Lines written")).toBeInTheDocument();
  });

  it("formats large numbers with k suffix", () => {
    render(<StatsGrid stats={stats} />);

    expect(screen.getByText("1.2k")).toBeInTheDocument();
  });

  it("displays small numbers as-is", () => {
    render(<StatsGrid stats={stats} />);

    expect(screen.getByText("56")).toBeInTheDocument();
    expect(screen.getByText("78")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("formats millions with M suffix", () => {
    const bigStats: OverviewStats = {
      totalCommits: 1_500_000,
      totalPRs: 0,
      totalReviews: 0,
      totalIssues: 0,
      projectCount: 0,
      linesAdded: 0,
    };

    render(<StatsGrid stats={bigStats} />);

    expect(screen.getByText("1.5M")).toBeInTheDocument();
  });

  it("applies responsive grid classes", () => {
    const { container } = render(<StatsGrid stats={stats} />);
    const grid = container.firstElementChild as HTMLElement;

    expect(grid.classList.contains("grid-cols-2")).toBe(true);
    expect(grid.classList.contains("sm:grid-cols-3")).toBe(true);
    expect(grid.classList.contains("lg:grid-cols-6")).toBe(true);
  });

  it("has an accessible aria-label on the grid container", () => {
    render(<StatsGrid stats={stats} />);

    expect(screen.getByLabelText("Contribution statistics")).toBeInTheDocument();
  });

  it("handles zero values", () => {
    const zeroStats: OverviewStats = {
      totalCommits: 0,
      totalPRs: 0,
      totalReviews: 0,
      totalIssues: 0,
      projectCount: 0,
      linesAdded: 0,
    };

    render(<StatsGrid stats={zeroStats} />);

    const zeros = screen.getAllByText("0");
    expect(zeros).toHaveLength(6);
  });
});
