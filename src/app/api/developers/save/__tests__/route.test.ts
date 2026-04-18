import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DeveloperOverview } from "@/lib/types";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/cache", () => ({ getCached: vi.fn() }));

const mockSnapshotSingle = vi.fn();
const mockSnapshotSelect = vi.fn(() => ({ single: mockSnapshotSingle }));
const mockSnapshotInsert = vi.fn(() => ({ select: mockSnapshotSelect }));

const mockReposInsert = vi.fn();
const mockDaysInsert = vi.fn();
const mockContribInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mockFrom },
}));

import { auth } from "@/lib/auth";
import { getCached } from "@/lib/cache";

const mockAuth = vi.mocked(auth);
const mockGetCached = vi.mocked(getCached);

function makeOverview(overrides: Partial<DeveloperOverview> = {}): DeveloperOverview {
  return {
    login: "testuser",
    name: "Test User",
    avatarUrl: "https://example.com/avatar.png",
    bio: null,
    createdAt: "2020-01-01T00:00:00Z",
    totalContributions: 100,
    bitcoinRepos: [],
    contributions: [],
    calendarWeeks: [],
    linesAdded: 500,
    linesDeleted: 200,
    ...overrides,
  };
}

async function callRoute(body: unknown) {
  const { POST } = await import("../route");
  const request = new Request("http://localhost/api/developers/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request);
}

describe("POST /api/developers/save", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockAuth.mockResolvedValue({ accessToken: "tok" } as never);
    mockGetCached.mockResolvedValue(makeOverview());

    mockSnapshotSingle.mockResolvedValue({
      data: { id: 1, saved_at: "2026-04-18T10:00:00Z" },
      error: null,
    });
    mockReposInsert.mockResolvedValue({ error: null });
    mockDaysInsert.mockResolvedValue({ error: null });
    mockContribInsert.mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "snapshot_bitcoin_repos") return { insert: mockReposInsert };
      if (table === "snapshot_contribution_days") return { insert: mockDaysInsert };
      if (table === "snapshot_contributions") return { insert: mockContribInsert };
      return { insert: mockSnapshotInsert };
    });
  });

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);

    const res = await callRoute({ username: "testuser", programEntryDate: "" });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when session has no accessToken", async () => {
    mockAuth.mockResolvedValue({ user: { name: "Test" } } as never);

    const res = await callRoute({ username: "testuser", programEntryDate: "" });

    expect(res.status).toBe(401);
  });

  it("returns 409 when cache miss", async () => {
    mockGetCached.mockResolvedValue(null);

    const res = await callRoute({ username: "testuser", programEntryDate: "" });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json).toEqual({ error: "Profile expired — please reload before saving" });
  });

  it("uses correct cache key with lowercased username", async () => {
    mockGetCached.mockResolvedValue(null);

    await callRoute({ username: "TestUser", programEntryDate: "" });

    expect(mockGetCached).toHaveBeenCalledWith("overview:2:testuser");
  });

  it("returns 400 for invalid date format", async () => {
    const res = await callRoute({ username: "testuser", programEntryDate: "13/40/2024" });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/date/i);
  });

  it("returns 400 for calendar-invalid date (02/31/2024)", async () => {
    const res = await callRoute({ username: "testuser", programEntryDate: "02/31/2024" });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/date/i);
  });

  it("returns 400 when programEntryDate is a non-string type (e.g. number)", async () => {
    const res = await callRoute({ username: "testuser", programEntryDate: 20240112 });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/date/i);
  });

  it("returns 500 when snapshot insert fails", async () => {
    mockSnapshotSingle.mockResolvedValue({ data: null, error: { message: "db error", code: "23000" } });

    const res = await callRoute({ username: "testuser", programEntryDate: "" });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "Failed to save snapshot" });
  });

  it("returns 500 when bitcoin repos insert fails", async () => {
    mockGetCached.mockResolvedValue(makeOverview({
      bitcoinRepos: [{ nameWithOwner: "bitcoin/bitcoin", tier: "core", reason: "r", url: "u" }],
    }));
    mockReposInsert.mockResolvedValue({ error: { message: "repos error" } });

    const res = await callRoute({ username: "testuser", programEntryDate: "" });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "Failed to save snapshot repos" });
  });

  it("returns 500 when contribution days insert fails", async () => {
    mockGetCached.mockResolvedValue(makeOverview({
      calendarWeeks: [
        { contributionDays: [{ date: "2025-01-01", contributionCount: 3, color: "#216e39" }] },
      ],
    }));
    mockDaysInsert.mockResolvedValue({ error: { message: "days error" } });

    const res = await callRoute({ username: "testuser", programEntryDate: "" });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "Failed to save contribution days" });
  });

  it("returns 500 when contributions insert fails", async () => {
    mockGetCached.mockResolvedValue(makeOverview({
      contributions: [
        {
          repoNameWithOwner: "bitcoin/bitcoin",
          type: "commit",
          count: 5,
          dateRange: { from: new Date("2025-01-01"), to: new Date("2025-12-31") },
        },
      ],
    }));
    mockContribInsert.mockResolvedValue({ error: { message: "contrib error" } });

    const res = await callRoute({ username: "testuser", programEntryDate: "" });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "Failed to save contributions" });
  });

  it("inserts with normalized date and returns 200", async () => {
    const overview = makeOverview({
      bitcoinRepos: [
        { nameWithOwner: "bitcoin/bitcoin", tier: "core", reason: "r", url: "u" },
      ],
    });
    mockGetCached.mockResolvedValue(overview);

    const res = await callRoute({ username: "testuser", programEntryDate: "01/12/2024" });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ id: 1, savedAt: "2026-04-18T10:00:00Z" });

    expect(mockSnapshotInsert).toHaveBeenCalledWith(
      expect.objectContaining({ program_entry_date: "2024-01-12" })
    );
  });

  it("inserts with program_entry_date null for blank date", async () => {
    const res = await callRoute({ username: "testuser", programEntryDate: "" });

    expect(res.status).toBe(200);
    expect(mockSnapshotInsert).toHaveBeenCalledWith(
      expect.objectContaining({ program_entry_date: null })
    );
  });

  it("inserts bitcoin repos with reason and url", async () => {
    const overview = makeOverview({
      bitcoinRepos: [
        { nameWithOwner: "bitcoin/bitcoin", tier: "core", reason: "keyword: bitcoin", url: "https://github.com/bitcoin/bitcoin" },
        { nameWithOwner: "lightningnetwork/lnd", tier: "ecosystem", reason: "keyword: lightning", url: undefined },
      ],
    });
    mockGetCached.mockResolvedValue(overview);

    await callRoute({ username: "testuser", programEntryDate: "" });

    expect(mockReposInsert).toHaveBeenCalledWith([
      { snapshot_id: 1, repo_name: "bitcoin/bitcoin", tier: "core", reason: "keyword: bitcoin", url: "https://github.com/bitcoin/bitcoin" },
      { snapshot_id: 1, repo_name: "lightningnetwork/lnd", tier: "ecosystem", reason: "keyword: lightning", url: null },
    ]);
  });

  it("skips bitcoin repos insert when array is empty", async () => {
    mockGetCached.mockResolvedValue(makeOverview({ bitcoinRepos: [] }));

    await callRoute({ username: "testuser", programEntryDate: "" });

    expect(mockReposInsert).not.toHaveBeenCalled();
  });

  it("inserts contribution days flattened from calendarWeeks", async () => {
    mockGetCached.mockResolvedValue(makeOverview({
      calendarWeeks: [
        {
          contributionDays: [
            { date: "2025-01-01", contributionCount: 2, color: "#216e39" },
            { date: "2025-01-02", contributionCount: 0, color: "#ebedf0" },
          ],
        },
        {
          contributionDays: [
            { date: "2025-01-08", contributionCount: 5, color: "#30a14e" },
          ],
        },
      ],
    }));

    await callRoute({ username: "testuser", programEntryDate: "" });

    expect(mockDaysInsert).toHaveBeenCalledWith([
      { snapshot_id: 1, contribution_date: "2025-01-01", contribution_count: 2, color: "#216e39" },
      { snapshot_id: 1, contribution_date: "2025-01-02", contribution_count: 0, color: "#ebedf0" },
      { snapshot_id: 1, contribution_date: "2025-01-08", contribution_count: 5, color: "#30a14e" },
    ]);
  });

  it("skips contribution days insert when calendarWeeks is empty", async () => {
    mockGetCached.mockResolvedValue(makeOverview({ calendarWeeks: [] }));

    await callRoute({ username: "testuser", programEntryDate: "" });

    expect(mockDaysInsert).not.toHaveBeenCalled();
  });

  it("inserts contributions per repo and type", async () => {
    const from = new Date("2025-01-01T00:00:00Z");
    const to = new Date("2025-12-31T23:59:59Z");
    mockGetCached.mockResolvedValue(makeOverview({
      contributions: [
        { repoNameWithOwner: "bitcoin/bitcoin", type: "commit", count: 10, dateRange: { from, to } },
        { repoNameWithOwner: "bitcoin/bitcoin", type: "pr", count: 3, dateRange: { from, to } },
      ],
    }));

    await callRoute({ username: "testuser", programEntryDate: "" });

    expect(mockContribInsert).toHaveBeenCalledWith([
      { snapshot_id: 1, type: "commit", count: 10, repo_name: "bitcoin/bitcoin", date_from: from, date_to: to },
      { snapshot_id: 1, type: "pr", count: 3, repo_name: "bitcoin/bitcoin", date_from: from, date_to: to },
    ]);
  });

  it("skips contributions insert when array is empty", async () => {
    mockGetCached.mockResolvedValue(makeOverview({ contributions: [] }));

    await callRoute({ username: "testuser", programEntryDate: "" });

    expect(mockContribInsert).not.toHaveBeenCalled();
  });
});
