import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DeveloperOverviewPage } from "@/components/DeveloperOverviewPage";
import type { DeveloperOverview } from "@/lib/types";

vi.mock("@/hooks/use-overview");
vi.mock("@/hooks/use-recent-searches", () => ({
  useRecentSearches: () => ({ addSearch: vi.fn(), searches: [] }),
}));
vi.mock("@/components/SaveDeveloperModal", () => ({
  SaveDeveloperModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="save-modal" /> : null,
}));
vi.mock("@/components/RateLimitBadge", () => ({
  RateLimitBadge: () => null,
}));
vi.mock("@/components/ContributionDrillDown", () => ({
  ContributionDrillDown: () => null,
}));

import { useOverview } from "@/hooks/use-overview";
const mockUseOverview = vi.mocked(useOverview);

function makeOverview(): DeveloperOverview {
  return {
    login: "satoshi",
    name: "Satoshi",
    avatarUrl: "https://example.com/avatar.png",
    bio: null,
    createdAt: "2009-01-03T00:00:00Z",
    totalContributions: 42,
    bitcoinRepos: [],
    contributions: [],
    calendarWeeks: [],
    linesAdded: 0,
    linesDeleted: 0,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DeveloperOverviewPage — Save button visibility", () => {
  it("does not render Save button while loading", () => {
    mockUseOverview.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    } as never);

    render(<DeveloperOverviewPage username="satoshi" />);

    expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument();
  });

  it("does not render Save button when there is an error", () => {
    mockUseOverview.mockReturnValue({
      data: undefined,
      error: { status: 404, message: "not found" },
      isLoading: false,
      mutate: vi.fn(),
    } as never);

    render(<DeveloperOverviewPage username="satoshi" />);

    expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument();
  });

  it("renders Save button when data is loaded", () => {
    mockUseOverview.mockReturnValue({
      data: makeOverview(),
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as never);

    render(<DeveloperOverviewPage username="satoshi" />);

    expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument();
  });
});
