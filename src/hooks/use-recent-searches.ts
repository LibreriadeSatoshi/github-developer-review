"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "recent-searches";
const MAX_ENTRIES = 10;

export interface RecentSearch {
  username: string;
  avatarUrl?: string;
  timestamp: number;
}

export function useRecentSearches() {
  const [searches, setSearches] = useState<RecentSearch[]>([]);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentSearch[];
        queueMicrotask(() => setSearches(parsed));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const addSearch = useCallback((username: string, avatarUrl?: string) => {
    setSearches((prev) => {
      const filtered = prev.filter(
        (s) => s.username.toLowerCase() !== username.toLowerCase()
      );
      const next = [
        { username, avatarUrl, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_ENTRIES);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore quota errors
      }

      return next;
    });
  }, []);

  const removeSearch = useCallback((username: string) => {
    setSearches((prev) => {
      const next = prev.filter(
        (s) => s.username.toLowerCase() !== username.toLowerCase()
      );

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore quota errors
      }

      return next;
    });
  }, []);

  const clearSearches = useCallback(() => {
    setSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore errors
    }
  }, []);

  return { searches, addSearch, removeSearch, clearSearches };
}
