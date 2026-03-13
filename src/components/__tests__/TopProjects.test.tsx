import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TopProjects } from "@/components/TopProjects";
import type { RepoClassification, ContributionItem } from "@/lib/types";

afterEach(cleanup);

const repos: RepoClassification[] = [
  { nameWithOwner: "bitcoin/bitcoin", url: "https://github.com/bitcoin/bitcoin", tier: "core", reason: "curated" },
  { nameWithOwner: "mempool/mempool", url: "https://github.com/mempool/mempool", tier: "ecosystem", reason: "curated" },
  { nameWithOwner: "user/nostr-tool", url: "https://github.com/user/nostr-tool", tier: "adjacent", reason: "keyword" },
];

const contributions: ContributionItem[] = [
  { repoNameWithOwner: "bitcoin/bitcoin", type: "commit", count: 50, dateRange: { from: new Date(), to: new Date() } },
  { repoNameWithOwner: "mempool/mempool", type: "commit", count: 20, dateRange: { from: new Date(), to: new Date() } },
  { repoNameWithOwner: "user/nostr-tool", type: "commit", count: 5, dateRange: { from: new Date(), to: new Date() } },
];

describe("TopProjects", () => {
  it("renders repos with tier badges", () => {
    render(
      <TopProjects bitcoinRepos={repos} contributions={contributions} showAdjacent />
    );

    expect(screen.getByText("bitcoin/bitcoin")).toBeInTheDocument();
    expect(screen.getByText("core")).toBeInTheDocument();
    expect(screen.getByText("ecosystem")).toBeInTheDocument();
  });

  it("hides adjacent repos when showAdjacent is false", () => {
    render(
      <TopProjects bitcoinRepos={repos} contributions={contributions} showAdjacent={false} />
    );

    expect(screen.getByText("bitcoin/bitcoin")).toBeInTheDocument();
    expect(screen.queryByText("user/nostr-tool")).not.toBeInTheDocument();
  });

  it("shows adjacent repos when showAdjacent is true", () => {
    render(
      <TopProjects bitcoinRepos={repos} contributions={contributions} showAdjacent />
    );

    expect(screen.getByText("user/nostr-tool")).toBeInTheDocument();
    expect(screen.getByText("adjacent")).toBeInTheDocument();
  });

  it("sorts by contribution count descending", () => {
    render(
      <TopProjects bitcoinRepos={repos} contributions={contributions} showAdjacent />
    );

    const repoNames = screen.getAllByText(/\//).map((el) => el.textContent);
    expect(repoNames[0]).toBe("bitcoin/bitcoin");
    expect(repoNames[1]).toBe("mempool/mempool");
  });

  it("shows empty message when no repos", () => {
    render(
      <TopProjects bitcoinRepos={[]} contributions={[]} showAdjacent={false} />
    );

    expect(screen.getByText(/No Bitcoin-related projects found/)).toBeInTheDocument();
  });

  it("displays contribution counts", () => {
    render(
      <TopProjects bitcoinRepos={repos} contributions={contributions} showAdjacent={false} />
    );

    expect(screen.getByText("50 contributions")).toBeInTheDocument();
    expect(screen.getByText("20 contributions")).toBeInTheDocument();
  });

  it("wraps repo cards in links to GitHub", () => {
    render(
      <TopProjects bitcoinRepos={repos} contributions={contributions} showAdjacent={false} />
    );

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "https://github.com/bitcoin/bitcoin");
    expect(links[0]).toHaveAttribute("target", "_blank");
  });

  it("shows tier icons on badges", () => {
    render(
      <TopProjects bitcoinRepos={repos} contributions={contributions} showAdjacent />
    );

    // Check aria-labels for tier badges
    expect(screen.getByLabelText("Tier: core")).toBeInTheDocument();
    expect(screen.getByLabelText("Tier: ecosystem")).toBeInTheDocument();
    expect(screen.getByLabelText("Tier: adjacent")).toBeInTheDocument();
  });
});
