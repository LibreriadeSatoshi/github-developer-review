## Context

The `linesAdded` stat shows 0 for most users. Two bugs interact to cause this:

1. **202 async stats**: GitHub's `/repos/{owner}/{repo}/stats/contributors` endpoint returns HTTP 202 when stats are not yet computed (first call per repo after a period of inactivity). The current code retries once after 2s, but GitHub's async computation can take longer. When all repos return 202, `fetchLinesOfCode` returns `{ linesAdded: 0, linesDeleted: 0 }`.

2. **Cache guard locks in zero**: `route.ts` uses `cached.linesAdded !== undefined` as the guard to skip the stats re-fetch. Since `0 !== undefined` is `true`, once 0 is cached it is served forever — the real stats can never be fetched on subsequent requests.

The existing `add-lines-of-code-stats` change correctly designed the fetch logic, but did not account for the 202-then-cache interaction.

## Goals / Non-Goals

**Goals:**
- Ensure that a cached `linesAdded: 0` caused by unresolved 202 responses is retried on subsequent requests
- Distinguish "resolved 0" (developer truly has no lines in tracked repos) from "unresolved 0" (GitHub stats not ready at cache-fill time)
- Keep the fix minimal — no new endpoints, no new cache keys

**Non-Goals:**
- Increasing the 202 retry count or wait time within a single request (latency concern)
- Per-period line counts or per-repo breakdown (out of scope)
- Backfilling existing stale Redis entries (self-heals on next request)

## Decisions

### Decision 1: Add `linesResolved: boolean` to `DeveloperOverview`

**Chosen**: Add an optional `linesResolved?: boolean` field. It is `true` only when at least one repo successfully returned stats (HTTP 200) and the totals are trustworthy. It is `false` (or absent) when all repos returned 202/404/403 and the 0 is a default.

**Alternative considered**: Use a `linesResolvedAt?: string` timestamp and re-fetch after a cooldown interval. More flexible but adds date-handling complexity for a simple bug fix.

**Rationale**: A boolean flag is the minimum viable signal. The cache guard becomes `cached.linesResolved === true` which correctly skips re-fetch only when stats were actually computed.

### Decision 2: `fetchLinesOfCode` returns a `resolved` flag

**Chosen**: Change the return type to `{ linesAdded: number; linesDeleted: number; resolved: boolean }`. `resolved` is `true` if at least one `fetchRepoStats` call returned HTTP 200 with data; `false` if every call returned 202, 404, 403, or null.

**Alternative considered**: Throw an error when no stats are available. Rejected — 202 is not an error, it is a timing issue. The overview should still be cached and served; only the lines stat needs to be retried.

**Rationale**: Keeps the helper pure (no side effects) and lets the caller decide caching behavior.

### Decision 3: Re-fetch stats inline on cache hit when `linesResolved` is false

**Chosen**: In `route.ts`, when the cached overview has `linesResolved !== true`, fetch only the lines-of-code stats, update the cached overview, and return the enriched result. The main GraphQL fetch is skipped (reuse cached profile data).

**Alternative considered**: Return the cached 0 and let a background job fix it. Rejected — adds infrastructure complexity (background worker, separate trigger) disproportionate to the bug.

**Rationale**: The stats fetch is O(repos) REST calls, not the expensive GraphQL history fetch. Re-running it on cache hit for unresolved profiles is acceptable cost and self-heals transparently on the next page view after GitHub's stats become available.

## Risks / Trade-offs

- **Repeated 202 loops**: If GitHub keeps returning 202 for all repos indefinitely, every request re-tries the stats fetch. Mitigation: the existing REPO_CAP of 20 bounds the calls, and real-world 202 windows are short (seconds to minutes). Acceptable until observed at scale.
- **Old cached entries**: Profiles cached before this fix have no `linesResolved` field (`undefined`). The guard `cached.linesResolved === true` treats them as unresolved and re-fetches stats — correct behavior, one-time extra API call per user.
- **Type migration**: `linesResolved` is added as optional (`boolean | undefined`) to `DeveloperOverview` to avoid breaking existing cached JSON deserialization.
