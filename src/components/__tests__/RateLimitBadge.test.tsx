import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RateLimitBadge } from "@/components/RateLimitBadge";

// Mock the hook
vi.mock("@/hooks/use-rate-limit");
import { useRateLimit } from "@/hooks/use-rate-limit";
const mockUseRateLimit = vi.mocked(useRateLimit);

afterEach(cleanup);

describe("RateLimitBadge", () => {
  it("shows loading state", () => {
    mockUseRateLimit.mockReturnValue({ data: undefined, error: undefined, isLoading: true });
    render(<RateLimitBadge />);
    expect(screen.getByText("API: …")).toBeInTheDocument();
  });

  it("shows green when remaining > 50%", () => {
    mockUseRateLimit.mockReturnValue({
      data: { remaining: 4000, limit: 5000, resetAt: "2024-01-01T00:00:00Z" },
      error: undefined,
      isLoading: false,
    });
    render(<RateLimitBadge />);
    const badge = screen.getByText("API: 4000/5000");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-green");
  });

  it("shows yellow when remaining 10-50%", () => {
    mockUseRateLimit.mockReturnValue({
      data: { remaining: 1000, limit: 5000, resetAt: "2024-01-01T00:00:00Z" },
      error: undefined,
      isLoading: false,
    });
    render(<RateLimitBadge />);
    const badge = screen.getByText("API: 1000/5000");
    expect(badge.className).toContain("bg-yellow");
  });

  it("shows red when remaining < 10%", () => {
    mockUseRateLimit.mockReturnValue({
      data: { remaining: 100, limit: 5000, resetAt: "2024-01-01T00:00:00Z" },
      error: undefined,
      isLoading: false,
    });
    render(<RateLimitBadge />);
    const badge = screen.getByText("API: 100/5000");
    expect(badge.className).toContain("bg-red");
  });

  it("shows error state when hook returns error", () => {
    mockUseRateLimit.mockReturnValue({
      data: undefined,
      error: new Error("Failed to fetch rate limit"),
      isLoading: false,
    });
    render(<RateLimitBadge />);
    expect(screen.getByText("API: error")).toBeInTheDocument();
  });

  it("has accessible aria-label", () => {
    mockUseRateLimit.mockReturnValue({
      data: { remaining: 4000, limit: 5000, resetAt: "2024-01-01T00:00:00Z" },
      error: undefined,
      isLoading: false,
    });
    render(<RateLimitBadge />);
    expect(screen.getByLabelText("API rate limit: 4000 of 5000 remaining")).toBeInTheDocument();
  });
});
