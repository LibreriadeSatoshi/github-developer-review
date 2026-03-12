"use client";

import { useState, useEffect } from "react";

interface ErrorBannerProps {
  variant?: "rate-limit" | "partial" | "error" | "not-found";
  resetAt?: number;
  onRetry?: () => void;
  message?: string;
}

const redStyle =
  "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200";

const styles = {
  "rate-limit":
    "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200",
  partial:
    "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200",
  error: redStyle,
  "not-found": redStyle,
} as const;

const defaultMessages = {
  "rate-limit": "Rate limit reached. Please wait before retrying.",
  partial: "Showing partial results. Some data may be incomplete.",
  error: "An error occurred while fetching data.",
  "not-found": "User not found on GitHub.",
} as const;

function Countdown({ resetAt }: { resetAt: number }) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((resetAt - Date.now()) / 1000))
  );

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [resetAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (secondsLeft <= 0) return <p className="text-sm mt-1">Rate limit has reset. You can retry now.</p>;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const display = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return <p className="text-sm mt-1">Retrying in {display}...</p>;
}

export function ErrorBanner({ variant, resetAt, onRetry, message }: ErrorBannerProps) {
  if (!variant) return null;

  const style = styles[variant];
  const displayMessage = message ?? defaultMessages[variant];

  return (
    <div
      role="alert"
      className={`${style} border rounded-md p-4 mb-4`}
    >
      <p>{displayMessage}</p>
      {variant === "rate-limit" && resetAt && <Countdown resetAt={resetAt} />}
      {variant === "error" && onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-3 py-1 text-sm border rounded hover:bg-white dark:hover:bg-zinc-800"
        >
          Retry
        </button>
      )}
    </div>
  );
}
