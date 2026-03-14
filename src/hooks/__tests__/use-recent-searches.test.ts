import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRecentSearches } from "@/hooks/use-recent-searches";

// Mock localStorage
const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
});

describe("useRecentSearches", () => {
  it("starts with empty array", () => {
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.searches).toEqual([]);
  });

  it("hydrates from localStorage on mount", async () => {
    const existing = [{ username: "satoshi", timestamp: 1000 }];
    store.set("recent-searches", JSON.stringify(existing));

    const { result } = renderHook(() => useRecentSearches());

    // useEffect + queueMicrotask defers hydration
    await waitFor(() => {
      expect(result.current.searches).toEqual(existing);
    });
  });

  it("adds a search and persists to localStorage", () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.addSearch("satoshi", "https://avatar.example.com");
    });

    expect(result.current.searches).toHaveLength(1);
    expect(result.current.searches[0].username).toBe("satoshi");
    expect(store.has("recent-searches")).toBe(true);
  });

  it("deduplicates by username (case-insensitive)", () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.addSearch("satoshi");
    });
    act(() => {
      result.current.addSearch("Satoshi");
    });

    expect(result.current.searches).toHaveLength(1);
    expect(result.current.searches[0].username).toBe("Satoshi");
  });

  it("limits to 10 entries", () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      for (let i = 0; i < 12; i++) {
        result.current.addSearch(`user${i}`);
      }
    });

    expect(result.current.searches.length).toBeLessThanOrEqual(10);
  });

  it("removes a search", () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.addSearch("satoshi");
      result.current.addSearch("hal");
    });
    act(() => {
      result.current.removeSearch("satoshi");
    });

    expect(result.current.searches).toHaveLength(1);
    expect(result.current.searches[0].username).toBe("hal");
  });

  it("clears all searches", () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.addSearch("satoshi");
      result.current.addSearch("hal");
    });
    act(() => {
      result.current.clearSearches();
    });

    expect(result.current.searches).toEqual([]);
    expect(store.has("recent-searches")).toBe(false);
  });
});
