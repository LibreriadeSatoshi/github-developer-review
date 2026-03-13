import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MobileFilterSheet } from "@/components/MobileFilterSheet";

afterEach(cleanup);

const defaultProps = {
  bitcoinRepos: [],
  activePreset: "all" as const,
  onPresetChange: vi.fn(),
  project: undefined,
  status: "all",
  tier: "all",
  onProjectChange: vi.fn(),
  onStatusChange: vi.fn(),
  onTierChange: vi.fn(),
};

describe("MobileFilterSheet", () => {
  it("renders the trigger button", () => {
    render(<MobileFilterSheet {...defaultProps} />);
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("opens sheet on click and shows filter content", () => {
    render(<MobileFilterSheet {...defaultProps} />);
    fireEvent.click(screen.getByText("Filters"));
    // Sheet title
    expect(screen.getAllByText("Filters").length).toBeGreaterThanOrEqual(2);
    // Done button
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("shows active filter count badge", () => {
    render(<MobileFilterSheet {...defaultProps} status="open" tier="core" />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not show badge when no active filters", () => {
    render(<MobileFilterSheet {...defaultProps} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
