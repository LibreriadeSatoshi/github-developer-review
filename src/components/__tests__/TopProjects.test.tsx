import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { TopProjects } from "@/components/TopProjects";
import type { RepoClassification, ContributionItem } from "@/lib/types";

afterEach(cleanup);

const dateRange = { from: new Date(), to: new Date() };

const repos: RepoClassification[] = [
  { nameWithOwner: "bitcoin/bitcoin", url: "https://github.com/bitcoin/bitcoin", tier: "core", reason: "curated" },
  { nameWithOwner: "mempool/mempool", url: "https://github.com/mempool/mempool", tier: "ecosystem", reason: "curated" },
  { nameWithOwner: "user/nostr-tool", url: "https://github.com/user/nostr-tool", tier: "adjacent", reason: "keyword" },
];

const contributions: ContributionItem[] = [
  { repoNameWithOwner: "bitcoin/bitcoin", type: "commit", count: 50, dateRange },
  { repoNameWithOwner: "mempool/mempool", type: "commit", count: 20, dateRange },
  { repoNameWithOwner: "user/nostr-tool", type: "commit", count: 5, dateRange },
];

// 7 repos to test pagination (PAGE_SIZE = 5)
const manyRepos: RepoClassification[] = [
  { nameWithOwner: "bitcoin/bitcoin", tier: "core", reason: "curated" },
  { nameWithOwner: "lightning/lnd", tier: "core", reason: "curated" },
  { nameWithOwner: "btcsuite/btcd", tier: "core", reason: "curated" },
  { nameWithOwner: "mempool/mempool", tier: "ecosystem", reason: "curated" },
  { nameWithOwner: "blockstream/esplora", tier: "ecosystem", reason: "curated" },
  { nameWithOwner: "AcmeInc/bitcoin-lib", tier: "ecosystem", reason: "keyword" },
  { nameWithOwner: "user/nostr-tool", tier: "adjacent", reason: "keyword" },
];

const manyContributions: ContributionItem[] = manyRepos.map((r, i) => ({
  repoNameWithOwner: r.nameWithOwner,
  type: "commit",
  count: 70 - i * 10,
  dateRange,
}));

describe("TopProjects", () => {
  it("has 'use client' directive", () => {
    const source = readFileSync(
      resolve(__dirname, "../TopProjects.tsx"),
      "utf-8"
    );
    expect(source.trimStart().startsWith('"use client"')).toBe(true);
  });

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

  it("shows only 5 projects initially when there are more", () => {
    render(
      <TopProjects bitcoinRepos={manyRepos} contributions={manyContributions} showAdjacent />
    );

    // First 5 by contribution count should be visible
    expect(screen.getByText("bitcoin/bitcoin")).toBeInTheDocument();
    expect(screen.getByText("lightning/lnd")).toBeInTheDocument();
    expect(screen.getByText("btcsuite/btcd")).toBeInTheDocument();
    expect(screen.getByText("mempool/mempool")).toBeInTheDocument();
    expect(screen.getByText("blockstream/esplora")).toBeInTheDocument();

    // 6th and 7th should not be visible
    expect(screen.queryByText("AcmeInc/bitcoin-lib")).not.toBeInTheDocument();
    expect(screen.queryByText("user/nostr-tool")).not.toBeInTheDocument();
  });

  it("shows Load more button when there are more than 5 projects", () => {
    render(
      <TopProjects bitcoinRepos={manyRepos} contributions={manyContributions} showAdjacent />
    );

    expect(screen.getByRole("button", { name: "Load more" })).toBeInTheDocument();
  });

  it("does not show Load more button when 5 or fewer projects", () => {
    render(
      <TopProjects bitcoinRepos={repos} contributions={contributions} showAdjacent />
    );

    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("reveals remaining projects when Load more is clicked", () => {
    render(
      <TopProjects bitcoinRepos={manyRepos} contributions={manyContributions} showAdjacent />
    );

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(screen.getByText("AcmeInc/bitcoin-lib")).toBeInTheDocument();
    expect(screen.getByText("user/nostr-tool")).toBeInTheDocument();
  });

  it("hides Load more button after all projects are shown", () => {
    render(
      <TopProjects bitcoinRepos={manyRepos} contributions={manyContributions} showAdjacent />
    );

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });
});
