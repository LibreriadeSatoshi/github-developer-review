import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
import { auth } from "@/lib/auth";
const mockAuth = vi.mocked(auth);

describe("GET /api/github/rate-limit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const { GET } = await import("@/app/api/github/rate-limit/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns rate limit data", async () => {
    mockAuth.mockResolvedValue({ accessToken: "token" } as any);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        resources: {
          core: { remaining: 4500, limit: 5000, reset: 1704067200 },
        },
      }),
    });

    const { GET } = await import("@/app/api/github/rate-limit/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.remaining).toBe(4500);
    expect(body.limit).toBe(5000);
    expect(body.resetAt).toBeDefined();
  });

  it("returns error status when GitHub API fails", async () => {
    mockAuth.mockResolvedValue({ accessToken: "token" } as any);
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { GET } = await import("@/app/api/github/rate-limit/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
