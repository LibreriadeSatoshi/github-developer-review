import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ContributionTable } from "@/components/ContributionTable";
import type { ContributionDetail } from "@/lib/types";

// Mock the ExpandedPRDetail since it uses SWR
vi.mock("@/components/ExpandedPRDetail", () => ({
  ExpandedPRDetail: ({ number }: { number: number }) => (
    <div data-testid="pr-detail">PR Detail #{number}</div>
  ),
}));

import { vi } from "vitest";

afterEach(cleanup);

const items: ContributionDetail[] = [
  {
    id: 1,
    number: 42,
    title: "Fix consensus bug",
    repoNameWithOwner: "bitcoin/bitcoin",
    type: "pr",
    state: "merged",
    createdAt: "2024-06-01T00:00:00Z",
    closedAt: "2024-06-02T00:00:00Z",
    url: "https://github.com/bitcoin/bitcoin/pull/42",
  },
  {
    id: 2,
    number: 10,
    title: "Add docs",
    repoNameWithOwner: "bitcoin/bitcoin",
    type: "issue",
    state: "open",
    createdAt: "2024-07-01T00:00:00Z",
    closedAt: null,
    url: "https://github.com/bitcoin/bitcoin/issues/10",
  },
];

describe("ContributionTable", () => {
  it("renders items", () => {
    render(<ContributionTable items={items} />);

    expect(screen.getByText("Fix consensus bug")).toBeInTheDocument();
    expect(screen.getByText("Add docs")).toBeInTheDocument();
  });

  it("shows empty message when no items", () => {
    render(<ContributionTable items={[]} />);
    expect(screen.getByText("No bitcoin contributions found")).toBeInTheDocument();
  });

  it("shows status badges", () => {
    render(<ContributionTable items={items} />);
    expect(screen.getByText("merged")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("expands PR row on click", () => {
    render(<ContributionTable items={items} />);

    const row = screen.getByText("Fix consensus bug").closest("[role='button']");
    expect(row).toBeInTheDocument();

    fireEvent.click(row!);
    expect(screen.getByTestId("pr-detail")).toBeInTheDocument();
  });

  it("does not expand issue rows", () => {
    render(<ContributionTable items={items} />);

    const issueRow = screen.getByText("Add docs").closest("div");
    expect(issueRow).not.toHaveAttribute("role", "button");
  });

  it("has external links to GitHub", () => {
    render(<ContributionTable items={items} />);

    const links = screen.getAllByLabelText(/Open #/);
    expect(links[0]).toHaveAttribute("href", "https://github.com/bitcoin/bitcoin/pull/42");
    expect(links[0]).toHaveAttribute("target", "_blank");
  });
});
