import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ErrorBanner } from "@/components/ErrorBanner";

afterEach(() => {
  cleanup();
});

describe("ErrorBanner", () => {
  it("renders rate-limit variant with yellow styling", () => {
    render(<ErrorBanner variant="rate-limit" resetAt={Date.now() + 30000} />);
    const banner = screen.getByRole("alert");
    expect(banner).toBeInTheDocument();
    expect(banner.className).toMatch(/yellow/);
  });

  it("renders partial variant with blue styling", () => {
    render(<ErrorBanner variant="partial" />);
    const banner = screen.getByRole("alert");
    expect(banner).toBeInTheDocument();
    expect(banner.className).toMatch(/blue/);
  });

  it("renders error variant with red styling and retry button", () => {
    const onRetry = vi.fn();
    render(<ErrorBanner variant="error" onRetry={onRetry} />);
    const banner = screen.getByRole("alert");
    expect(banner).toBeInTheDocument();
    expect(banner.className).toMatch(/red/);

    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", () => {
    const onRetry = vi.fn();
    render(<ErrorBanner variant="error" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when no variant provided", () => {
    const { container } = render(<ErrorBanner />);
    expect(container.firstChild).toBeNull();
  });
});
