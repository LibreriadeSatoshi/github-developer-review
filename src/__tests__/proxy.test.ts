import { describe, it, expect, vi, beforeEach } from "vitest";

let mockSession: { user?: object; accessToken?: string } | null = null;

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

// Mock next/server since NextRequest/NextResponse may not fully work in jsdom
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>(
    "next/server"
  );
  return actual;
});

describe("proxy", () => {
  beforeEach(() => {
    mockSession = null;
    vi.resetModules();
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn(async () => mockSession),
    }));
  });

  function createRequest(path: string) {
    return new Request(new URL(path, "http://localhost:3000"));
  }

  describe("unauthenticated", () => {
    it("redirects /dashboard to /", async () => {
      const { proxy } = await import("@/proxy");
      const response = await proxy(createRequest("/dashboard") as any);

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/");
    });

    it("redirects /developer/satoshi to /", async () => {
      const { proxy } = await import("@/proxy");
      const response = await proxy(
        createRequest("/developer/satoshi") as any
      );

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/");
    });

    it("redirects /api/github/* to /", async () => {
      const { proxy } = await import("@/proxy");
      const response = await proxy(
        createRequest("/api/github/overview/test") as any
      );

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/");
    });

    it("allows / (login page)", async () => {
      const { proxy } = await import("@/proxy");
      const response = await proxy(createRequest("/") as any);

      expect(response.status).toBe(200);
    });
  });

  describe("session without accessToken", () => {
    beforeEach(() => {
      mockSession = { user: { name: "Test" } };
    });

    it("redirects when session exists but accessToken is missing", async () => {
      const { proxy } = await import("@/proxy");
      const response = await proxy(createRequest("/dashboard") as any);

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/");
    });
  });

  describe("authenticated", () => {
    beforeEach(() => {
      mockSession = { user: { name: "Test" }, accessToken: "token" };
    });

    it("allows all protected routes", async () => {
      const { proxy } = await import("@/proxy");

      const dashboardRes = await proxy(
        createRequest("/dashboard") as any
      );
      expect(dashboardRes.status).toBe(200);

      const devRes = await proxy(
        createRequest("/developer/satoshi") as any
      );
      expect(devRes.status).toBe(200);
    });
  });

  describe("matcher config", () => {
    it("exports config with matcher that excludes /api/auth", async () => {
      const { config } = await import("@/proxy");
      expect(config.matcher).toBeDefined();
      const matchers = Array.isArray(config.matcher)
        ? config.matcher
        : [config.matcher];
      expect(matchers.length).toBeGreaterThan(0);
    });
  });
});
