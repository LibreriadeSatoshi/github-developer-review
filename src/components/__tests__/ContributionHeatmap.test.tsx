import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ContributionHeatmap } from "@/components/ContributionHeatmap";
import type { ContributionCalendarWeek } from "@/lib/types";

afterEach(cleanup);

describe("ContributionHeatmap", () => {
  it("renders heading", () => {
    render(<ContributionHeatmap calendarWeeks={[]} />);

    expect(screen.getByText("Contributions")).toBeInTheDocument();
  });

  it("shows empty state message when no weeks", () => {
    render(<ContributionHeatmap calendarWeeks={[]} />);

    expect(screen.getByText("No contribution data available.")).toBeInTheDocument();
  });

  it("renders cells for each day", () => {
    const weeks: ContributionCalendarWeek[] = [
      {
        contributionDays: [
          { date: "2024-01-01", contributionCount: 0, color: "#ebedf0" },
          { date: "2024-01-02", contributionCount: 5, color: "#40c463" },
        ],
      },
    ];

    render(<ContributionHeatmap calendarWeeks={weeks} />);

    const cells = screen.getAllByTitle(/2024-01-0[12]/);
    expect(cells).toHaveLength(2);
  });

  it("shows contribution count in title", () => {
    const weeks: ContributionCalendarWeek[] = [
      {
        contributionDays: [
          { date: "2024-06-15", contributionCount: 7, color: "#40c463" },
        ],
      },
    ];

    render(<ContributionHeatmap calendarWeeks={weeks} />);

    expect(screen.getByTitle("2024-06-15: 7 contributions")).toBeInTheDocument();
  });

  it("has aria-label on cells for screen readers", () => {
    const weeks: ContributionCalendarWeek[] = [
      {
        contributionDays: [
          { date: "2024-06-15", contributionCount: 7, color: "#40c463" },
        ],
      },
    ];

    render(<ContributionHeatmap calendarWeeks={weeks} />);

    expect(screen.getByLabelText("2024-06-15: 7 contributions")).toBeInTheDocument();
  });

  it("renders only last 52 weeks", () => {
    // Create 60 weeks of data
    const weeks: ContributionCalendarWeek[] = Array.from({ length: 60 }, (_, i) => ({
      contributionDays: [
        { date: `2024-01-${String(i + 1).padStart(2, "0")}`, contributionCount: 1, color: "#40c463" },
      ],
    }));

    const { container } = render(<ContributionHeatmap calendarWeeks={weeks} />);

    // Should only render 52 columns (each week is a flex-col div inside the inline-flex)
    const columns = container.querySelectorAll(".inline-flex > div");
    expect(columns).toHaveLength(52);
  });

  it("has grid role and aria-label on container", () => {
    const weeks: ContributionCalendarWeek[] = [
      {
        contributionDays: [
          { date: "2024-01-01", contributionCount: 0, color: "#ebedf0" },
        ],
      },
    ];
    render(<ContributionHeatmap calendarWeeks={weeks} />);
    const grid = screen.getByRole("grid");
    expect(grid).toHaveAttribute("aria-label", "Contribution heatmap");
  });

  it("has row role on week columns", () => {
    const weeks: ContributionCalendarWeek[] = [
      {
        contributionDays: [
          { date: "2024-01-01", contributionCount: 0, color: "#ebedf0" },
        ],
      },
    ];
    render(<ContributionHeatmap calendarWeeks={weeks} />);
    expect(screen.getAllByRole("row")).toHaveLength(1);
  });

  it("has gridcell role on day cells", () => {
    const weeks: ContributionCalendarWeek[] = [
      {
        contributionDays: [
          { date: "2024-01-01", contributionCount: 0, color: "#ebedf0" },
          { date: "2024-01-02", contributionCount: 3, color: "#40c463" },
        ],
      },
    ];
    render(<ContributionHeatmap calendarWeeks={weeks} />);
    expect(screen.getAllByRole("gridcell")).toHaveLength(2);
  });

  it("supports arrow key navigation", () => {
    const weeks: ContributionCalendarWeek[] = [
      {
        contributionDays: [
          { date: "2024-01-01", contributionCount: 0, color: "#ebedf0" },
          { date: "2024-01-02", contributionCount: 3, color: "#40c463" },
        ],
      },
      {
        contributionDays: [
          { date: "2024-01-08", contributionCount: 1, color: "#9be9a8" },
          { date: "2024-01-09", contributionCount: 2, color: "#40c463" },
        ],
      },
    ];
    render(<ContributionHeatmap calendarWeeks={weeks} />);

    const grid = screen.getByRole("grid");
    const cells = screen.getAllByRole("gridcell");

    // First cell should have tabIndex 0
    expect(cells[0]).toHaveAttribute("tabindex", "0");
    // Others should have tabIndex -1
    expect(cells[1]).toHaveAttribute("tabindex", "-1");

    // Simulate arrow down
    fireEvent.keyDown(grid, { key: "ArrowDown" });

    // After pressing down, second cell in first week should be focused
    const updatedCells = screen.getAllByRole("gridcell");
    expect(updatedCells[1]).toHaveAttribute("tabindex", "0");
  });
});
