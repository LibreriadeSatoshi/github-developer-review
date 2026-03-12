import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/lib/auth", () => ({
  signIn: vi.fn(),
}));

// Server actions aren't callable in test — mock the form action
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("LoginPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders 'Sign in with GitHub' button", async () => {
    const LoginPage = (await import("@/app/page")).default;
    render(<LoginPage />);

    const button = screen.getByRole("button", { name: /sign in with github/i });
    expect(button).toBeInTheDocument();
  });

  it("renders page heading", async () => {
    const LoginPage = (await import("@/app/page")).default;
    render(<LoginPage />);

    expect(
      screen.getByText("GitHub Developer Review")
    ).toBeInTheDocument();
  });

  it("has a form wrapping the sign-in button", async () => {
    const LoginPage = (await import("@/app/page")).default;
    render(<LoginPage />);

    const button = screen.getByRole("button", { name: /sign in with github/i });
    expect(button.closest("form")).not.toBeNull();
  });
});
