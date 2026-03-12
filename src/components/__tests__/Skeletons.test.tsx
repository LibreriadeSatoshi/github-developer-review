import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  OverviewSkeleton,
  ContributionsSkeleton,
  RepoListSkeleton,
} from "@/components/Skeletons";

afterEach(() => {
  cleanup();
});

describe("Skeleton components", () => {
  it("OverviewSkeleton renders without error", () => {
    render(<OverviewSkeleton />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("OverviewSkeleton has aria-label", () => {
    render(<OverviewSkeleton />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Loading overview"
    );
  });

  it("ContributionsSkeleton renders without error", () => {
    render(<ContributionsSkeleton />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("RepoListSkeleton renders correct number of placeholder elements", () => {
    render(<RepoListSkeleton count={5} />);
    const items = screen.getAllByRole("status");
    expect(items.length).toBe(5);
  });

  it("RepoListSkeleton defaults to 3 placeholders", () => {
    render(<RepoListSkeleton />);
    const items = screen.getAllByRole("status");
    expect(items.length).toBe(3);
  });
});
