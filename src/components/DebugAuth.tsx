"use client";

import { useEffect } from "react";

export function DebugAuth({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    const url = new URL(window.location.href);
    const cookies = document.cookie
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .reduce<Record<string, string>>((acc, c) => {
        const [k, ...v] = c.split("=");
        acc[k.trim()] = v.join("=");
        return acc;
      }, {});

    const authCookies = Object.fromEntries(
      Object.entries(cookies).filter(([k]) => k.startsWith("authjs"))
    );

    console.group("[DebugAuth] Page loaded");
    console.log("URL:", url.href);
    console.log("Origin:", url.origin);
    console.log("Path:", url.pathname);
    console.log("Search params:", Object.fromEntries(url.searchParams));
    console.log("Auth cookies:", authCookies);
    console.log("All cookies:", cookies);
    console.groupEnd();

    const form = document.querySelector("form");
    if (form) {
      form.addEventListener("submit", () => {
        const cookiesAtSubmit = document.cookie
          .split(";")
          .map((c) => c.trim())
          .filter(Boolean);
        console.group("[DebugAuth] Sign-in form submitted");
        console.log("Cookies at submit:", cookiesAtSubmit);
        console.log("Timestamp:", new Date().toISOString());
        console.groupEnd();
      });
    }
  }, [enabled]);

  return null;
}
