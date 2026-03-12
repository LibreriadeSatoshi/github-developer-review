interface ErrorBannerProps {
  variant?: "rate-limit" | "partial" | "error";
  resetAt?: number;
  onRetry?: () => void;
}

const styles = {
  "rate-limit": "bg-yellow-50 border-yellow-200 text-yellow-800",
  partial: "bg-blue-50 border-blue-200 text-blue-800",
  error: "bg-red-50 border-red-200 text-red-800",
} as const;

const messages = {
  "rate-limit": "Rate limit reached. Please wait before retrying.",
  partial: "Showing partial results. Some data may be incomplete.",
  error: "An error occurred while fetching data.",
} as const;

// class name identifiers for test matching
const colorClasses = {
  "rate-limit": "yellow",
  partial: "blue",
  error: "red",
} as const;

export function ErrorBanner({ variant, resetAt, onRetry }: ErrorBannerProps) {
  if (!variant) return null;

  const style = styles[variant];
  const message = messages[variant];
  const color = colorClasses[variant];

  return (
    <div
      role="alert"
      className={`${style} ${color} border rounded-md p-4 mb-4`}
    >
      <p>{message}</p>
      {variant === "rate-limit" && resetAt && (
        <p className="text-sm mt-1">
          Resets at {new Date(resetAt).toLocaleTimeString()}
        </p>
      )}
      {variant === "error" && onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-3 py-1 text-sm border rounded hover:bg-white"
        >
          Retry
        </button>
      )}
    </div>
  );
}
