import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DeveloperOverview } from "@/lib/types";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/cache", () => ({ getCached: vi.fn() }));

const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

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

    mockFrom.mockReturnValue({ insert: mockInsert });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({
      data: { id: 1, saved_at: "2026-04-18T10:00:00Z" },
      error: null,
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
    mockAuth.mockResolvedValue({ accessToken: "tok" } as never);
    mockGetCached.mockResolvedValue(null);

    const res = await callRoute({ username: "testuser", programEntryDate: "" });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json).toEqual({ error: "Profile expired — please reload before saving" });
  });

  it("uses correct cache key with lowercased username", async () => {
    mockAuth.mockResolvedValue({ accessToken: "tok" } as never);
    mockGetCached.mockResolvedValue(null);

    await callRoute({ username: "TestUser", programEntryDate: "" });

    expect(mockGetCached).toHaveBeenCalledWith("overview:2:testuser");
  });

  it("returns 400 for invalid date format", async () => {
    mockAuth.mockResolvedValue({ accessToken: "tok" } as never);
    mockGetCached.mockResolvedValue(makeOverview());

    const res = await callRoute({ username: "testuser", programEntryDate: "13/40/2024" });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/date/i);
  });

  it("returns 400 for calendar-invalid date (02/31/2024)", async () => {
    mockAuth.mockResolvedValue({ accessToken: "tok" } as never);
    mockGetCached.mockResolvedValue(makeOverview());

    const res = await callRoute({ username: "testuser", programEntryDate: "02/31/2024" });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/date/i);
  });

  it("returns 400 when programEntryDate is a non-string type (e.g. number)", async () => {
    mockAuth.mockResolvedValue({ accessToken: "tok" } as never);
    mockGetCached.mockResolvedValue(makeOverview());

    const res = await callRoute({ username: "testuser", programEntryDate: 20240112 });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/date/i);
  });

  it("returns 500 when snapshot insert fails", async () => {
    mockAuth.mockResolvedValue({ accessToken: "tok" } as never);
    mockGetCached.mockResolvedValue(makeOverview());
    mockSingle.mockResolvedValue({ data: null, error: { message: "db error", code: "23000" } });

    const res = await callRoute({ username: "testuser", programEntryDate: "" });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "Failed to save snapshot" });
  });

  it("returns 500 when bitcoin repos insert fails", async () => {
    mockAuth.mockResolvedValue({ accessToken: "tok" } as never);
    mockGetCached.mockResolvedValue(makeOverview({
      bitcoinRepos: [{ nameWithOwner: "bitcoin/bitcoin", tier: "core", reason: "r", url: "u" }],
    }));

    const reposInsert = vi.fn().mockResolvedValue({ error: { message: "repos error", code: "23000" } });
    mockFrom.mockImplementation(((table: string) => {
      if (table === "snapshot_bitcoin_repos") return { insert: reposInsert };
      return { insert: mockInsert };
    }) as never);

    const res = await callRoute({ username: "testuser", programEntryDate: "" });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "Failed to save snapshot repos" });
  });

  it("inserts with normalized date and returns 200", async () => {
    mockAuth.mockResolvedValue({ accessToken: "tok" } as never);
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

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ program_entry_date: "2024-01-12" })
    );
  });

  it("inserts with program_entry_date null for blank date", async () => {
    mockAuth.mockResolvedValue({ accessToken: "tok" } as never);
    mockGetCached.mockResolvedValue(makeOverview());

    const res = await callRoute({ username: "testuser", programEntryDate: "" });

    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ program_entry_date: null })
    );
  });

  it("inserts bitcoin repos batch when present", async () => {
    mockAuth.mockResolvedValue({ accessToken: "tok" } as never);
    const overview = makeOverview({
      bitcoinRepos: [
        { nameWithOwner: "bitcoin/bitcoin", tier: "core", reason: "r", url: "u" },
        { nameWithOwner: "lightningnetwork/lnd", tier: "ecosystem", reason: "r", url: "u" },
      ],
    });
    mockGetCached.mockResolvedValue(overview);

    const reposInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation(((table: string) => {
      if (table === "snapshot_bitcoin_repos") return { insert: reposInsert };
      return { insert: mockInsert };
    }) as never);

    await callRoute({ username: "testuser", programEntryDate: "" });

    expect(reposInsert).toHaveBeenCalledWith([
      { snapshot_id: 1, repo_name: "bitcoin/bitcoin", tier: "core" },
      { snapshot_id: 1, repo_name: "lightningnetwork/lnd", tier: "ecosystem" },
    ]);
  });

  it("skips bitcoin repos insert when array is empty", async () => {
    mockAuth.mockResolvedValue({ accessToken: "tok" } as never);
    mockGetCached.mockResolvedValue(makeOverview({ bitcoinRepos: [] }));

    const reposInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation(((table: string) => {
      if (table === "snapshot_bitcoin_repos") return { insert: reposInsert };
      return { insert: mockInsert };
    }) as never);

    await callRoute({ username: "testuser", programEntryDate: "" });

    expect(reposInsert).not.toHaveBeenCalled();
  });
});
