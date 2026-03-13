import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EmptyState } from "@/components/EmptyState";

afterEach(cleanup);

describe("EmptyState", () => {
  it("renders default title and description", () => {
    render(<EmptyState />);
    expect(screen.getByText("No bitcoin contributions found")).toBeInTheDocument();
    expect(screen.getByText("Try adjusting your filters or date range.")).toBeInTheDocument();
  });

  it("renders custom title", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("renders custom description", () => {
    render(<EmptyState description="Custom description" />);
    expect(screen.getByText("Custom description")).toBeInTheDocument();
  });

  it("renders both custom title and description", () => {
    render(<EmptyState title="Custom title" description="Custom description" />);
    expect(screen.getByText("Custom title")).toBeInTheDocument();
    expect(screen.getByText("Custom description")).toBeInTheDocument();
  });
});
