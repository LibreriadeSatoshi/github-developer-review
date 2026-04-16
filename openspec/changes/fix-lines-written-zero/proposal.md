## Why

The "Lines written" stat in the developer overview always shows 0 for most users. The root cause is a combination of GitHub's async stats API (HTTP 202 on first call) and a cache invalidation flaw that permanently stores 0 once it appears — blocking any future re-fetch of the real value.

## What Changes

- Fix the cache guard to distinguish between "linesAdded was computed and is genuinely 0" vs. "linesAdded was never successfully fetched"
- Improve 202 handling so a failed stats fetch does not get permanently cached as 0
- Add a `linesAddedFetchedAt` timestamp to the cached overview so stale/unresolved stats can be retried on next request

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `lines-of-code-stats`: The existing capability returns 0 permanently due to a cache guard bug and insufficient 202 retry handling. The fix corrects the cache invalidation logic and adds a staleness check so unresolved stats are retried automatically.

## Impact

- **`src/app/api/github/overview/[username]/route.ts`**: Change cache guard from `cached.linesAdded !== undefined` to check a `linesAddedFetchedAt` sentinel or a dedicated `linesAddedResolved: boolean` flag.
- **`src/lib/github-stats.ts`**: Return a result that distinguishes "all repos returned 202 / no data" from "fetched and value is 0", so the caller can decide whether to cache.
- **`src/lib/types.ts`**: Add optional `linesAddedResolved?: boolean` (or `linesAddedFetchedAt?: string`) to `DeveloperOverview` to track whether the stats fetch succeeded.
- **Cache**: Cached profiles with unresolved stats (`linesAddedResolved: false` or missing) will be re-enriched on next request, adding one round-trip latency for those users.
