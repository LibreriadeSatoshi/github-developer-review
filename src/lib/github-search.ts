import { RateLimitError, type RateLimitState } from "./types";

const GITHUB_API = "https://api.github.com";
const MAX_WAIT_SECONDS = 60;
const MAX_RETRIES = 3;

function parseRateLimitHeaders(headers: Headers): RateLimitState {
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");
  return {
    remaining: remaining ? parseInt(remaining, 10) : 60,
    resetAt: reset ? parseInt(reset, 10) * 1000 : Date.now() + 3600_000,
  };
}

async function waitForReset(resetAt: number): Promise<void> {
  const waitMs = Math.max(0, resetAt - Date.now());
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

// C4: Iterative loop instead of unbounded recursion
export async function githubFetch(
  path: string,
  token: string
): Promise<unknown> {
  const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const newState = parseRateLimitHeaders(response.headers);

    if (response.status === 403) {
      const waitSeconds = Math.max(0, (newState.resetAt - Date.now()) / 1000);
      if (waitSeconds <= MAX_WAIT_SECONDS && attempt < MAX_RETRIES) {
        await waitForReset(newState.resetAt);
        continue;
      }
      throw new RateLimitError("Rate limit exceeded", newState.resetAt);
    }

    // I6: Check for non-2xx responses
    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  // Should never reach here, but TypeScript needs it
  throw new RateLimitError("Rate limit exceeded after max retries", 0);
}
