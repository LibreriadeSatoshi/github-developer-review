import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { fetchLinesOfCode } from "@/lib/github-stats";
import { logger } from "@/lib/logger";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

function makeStats(login: string, additions: number, deletions: number) {
  return [
    {
      author: { login },
      weeks: [
        { w: 1, a: additions, d: deletions, c: 1 },
      ],
    },
  ];
}

describe("fetchLinesOfCode", () => {
  it("sums additions and deletions across repos and weeks", async () => {
    mockFetch
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => [
          {
            author: { login: "alice" },
            weeks: [
              { w: 1, a: 100, d: 20, c: 3 },
              { w: 2, a: 200, d: 50, c: 5 },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => makeStats("alice", 50, 10),
      });

    const repos = [
      { repoNameWithOwner: "org/repo1", count: 10 },
      { repoNameWithOwner: "org/repo2", count: 5 },
    ];

    const promise = fetchLinesOfCode(repos, "alice", "tok");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.linesAdded).toBe(350);
    expect(result.linesDeleted).toBe(80);
    expect(result.resolved).toBe(true);
  });

  it("defaults to 0 for a repo after two 202 responses", async () => {
    mockFetch
      .mockResolvedValueOnce({ status: 202, ok: false, json: async () => [] })
      .mockResolvedValueOnce({ status: 202, ok: false, json: async () => [] });

    const repos = [{ repoNameWithOwner: "org/slow", count: 1 }];

    const promise = fetchLinesOfCode(repos, "alice", "tok");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.linesAdded).toBe(0);
    expect(result.linesDeleted).toBe(0);
    expect(result.resolved).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      "[github-stats] Stats not ready for org/slow, defaulting to 0"
    );
  });

  it("skips repos that return 404 or 403 silently", async () => {
    mockFetch
      .mockResolvedValueOnce({ status: 404, ok: false, json: async () => [] })
      .mockResolvedValueOnce({ status: 403, ok: false, json: async () => [] });

    const repos = [
      { repoNameWithOwner: "org/private", count: 5 },
      { repoNameWithOwner: "org/forbidden", count: 3 },
    ];

    const promise = fetchLinesOfCode(repos, "alice", "tok");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.linesAdded).toBe(0);
    expect(result.linesDeleted).toBe(0);
    expect(result.resolved).toBe(false);
  });

  it("returns resolved: true when at least one repo succeeds even if others fail", async () => {
    mockFetch
      .mockResolvedValueOnce({ status: 202, ok: false, json: async () => [] })
      .mockResolvedValueOnce({ status: 202, ok: false, json: async () => [] })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => makeStats("alice", 75, 5),
      });

    const repos = [
      { repoNameWithOwner: "org/slow", count: 3 },
      { repoNameWithOwner: "org/ready", count: 1 },
    ];

    const promise = fetchLinesOfCode(repos, "alice", "tok");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.linesAdded).toBe(75);
    expect(result.resolved).toBe(true);
  });

  it("caps at 20 repos when more are provided", async () => {
    const repos = Array.from({ length: 25 }, (_, i) => ({
      repoNameWithOwner: `org/repo${i}`,
      count: 25 - i,
    }));

    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => makeStats("alice", 10, 2),
    });

    const promise = fetchLinesOfCode(repos, "alice", "tok");
    await vi.runAllTimersAsync();
    await promise;

    expect(mockFetch).toHaveBeenCalledTimes(20);
    expect(logger.info).toHaveBeenCalledWith(
      "[github-stats] Capping repos from 25 to 20 for alice"
    );
  });
});
