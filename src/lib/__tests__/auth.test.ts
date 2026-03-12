import { describe, it, expect, vi, beforeEach } from "vitest";

let capturedConfig: any = null;

vi.mock("next-auth", () => ({
  default: vi.fn((config: any) => {
    capturedConfig = config;
    return {
      handlers: { GET: vi.fn(), POST: vi.fn() },
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  }),
}));

vi.mock("next-auth/providers/github", () => ({
  default: vi.fn(() => ({ id: "github", name: "GitHub" })),
}));

describe("auth", () => {
  beforeEach(async () => {
    capturedConfig = null;
    vi.resetModules();

    // Re-mock after resetModules
    vi.doMock("next-auth", () => ({
      default: vi.fn((config: any) => {
        capturedConfig = config;
        return {
          handlers: { GET: vi.fn(), POST: vi.fn() },
          auth: vi.fn(),
          signIn: vi.fn(),
          signOut: vi.fn(),
        };
      }),
    }));

    vi.doMock("next-auth/providers/github", () => ({
      default: vi.fn(() => ({ id: "github", name: "GitHub" })),
    }));
  });

  it("exports handlers, auth, signIn, signOut", async () => {
    const authModule = await import("@/lib/auth");
    expect(authModule.handlers).toBeDefined();
    expect(authModule.auth).toBeDefined();
    expect(authModule.signIn).toBeDefined();
    expect(authModule.signOut).toBeDefined();
  });

  it("JWT callback sets token.accessToken from account on login", async () => {
    await import("@/lib/auth");
    expect(capturedConfig).not.toBeNull();

    const token = { sub: "123" };
    const account = { access_token: "gh_token_abc" };

    const result = capturedConfig.callbacks.jwt({ token, account });
    expect(result.accessToken).toBe("gh_token_abc");
  });

  it("JWT callback passes through token when no account", async () => {
    await import("@/lib/auth");

    const token = { sub: "123", accessToken: "existing_token" };
    const result = capturedConfig.callbacks.jwt({ token, account: null });
    expect(result.accessToken).toBe("existing_token");
  });

  it("session callback sets session.accessToken from token", async () => {
    await import("@/lib/auth");

    const session = { user: { name: "Test" } } as any;
    const token = { accessToken: "gh_token_abc" };

    const result = capturedConfig.callbacks.session({ session, token });
    expect(result.accessToken).toBe("gh_token_abc");
  });
});
