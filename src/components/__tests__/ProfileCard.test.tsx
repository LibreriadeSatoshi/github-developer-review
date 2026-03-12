import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ProfileCard } from "@/components/ProfileCard";

afterEach(cleanup);

describe("ProfileCard", () => {
  const defaultProps = {
    login: "satoshi",
    name: "Satoshi Nakamoto",
    avatarUrl: "https://avatar.example.com/satoshi.png",
    bio: "Creator of Bitcoin",
    createdAt: "2009-01-03T00:00:00Z",
  };

  it("renders name and login", () => {
    render(<ProfileCard {...defaultProps} />);

    expect(screen.getByText("Satoshi Nakamoto")).toBeInTheDocument();
    expect(screen.getByText("@satoshi")).toBeInTheDocument();
  });

  it("falls back to login when name is null", () => {
    render(<ProfileCard {...defaultProps} name={null} />);

    // The h1 should show "satoshi" as the display name
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("satoshi");
  });

  it("renders bio when provided", () => {
    render(<ProfileCard {...defaultProps} />);

    expect(screen.getByText("Creator of Bitcoin")).toBeInTheDocument();
  });

  it("does not render bio when null", () => {
    render(<ProfileCard {...defaultProps} bio={null} />);

    expect(screen.queryByText("Creator of Bitcoin")).not.toBeInTheDocument();
  });

  it("renders join date", () => {
    render(<ProfileCard {...defaultProps} />);

    expect(screen.getByText(/January 2009/)).toBeInTheDocument();
  });

  it("renders avatar image", () => {
    render(<ProfileCard {...defaultProps} />);

    const img = screen.getByAltText("satoshi");
    expect(img).toHaveAttribute("src", defaultProps.avatarUrl);
  });
});
