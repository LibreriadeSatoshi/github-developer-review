## Context

The developer profile is built by fetching GitHub GraphQL contribution data and caching it in Redis (TTL 1h via `@upstash/redis`). The existing `DeveloperOverview` type holds contribution counts and calendar data but no commit diff stats. GitHub's REST API provides lines added/deleted per commit, but fetching them naively (one request per commit) would exhaust rate limits quickly for active developers.

Currently `PRDetail` already stores `additions`/`deletions` for pull requests (used in the drill-down view), so the pattern of enriching cached data with line stats is established.

## Goals / Non-Goals

**Goals:**
- Add `linesAdded` and `linesDeleted` aggregated totals to `DeveloperOverview`
- Fetch stats only for repos already present in the `contributions` array (bounded scope)
- Cache the enriched profile in the same Redis key, no new cache key needed
- Display lines written in the UI alongside existing contribution stats, respecting date filter presets

**Non-Goals:**
- Per-commit granularity (too expensive, not needed for the overview use case)
- Fetching stats for repos outside the developer's contribution history
- Real-time line counts (cached with the existing 1h TTL is sufficient)
- Lines of code per language or per repo breakdown (future iteration)

## Decisions

### Decision 1: Use `/repos/{owner}/{repo}/stats/contributors` endpoint

**Chosen**: `GET /repos/{owner}/{repo}/stats/contributors` — returns weekly addition/deletion totals per contributor for a repo. One request per repo, not per commit.

**Alternative considered**: `GET /repos/{owner}/{repo}/commits` with `?author=` then fetching each commit's `stats` field. This would be O(commits) requests — far too expensive.

**Rationale**: The contributors stats endpoint returns pre-aggregated weekly data, keeping API calls to O(repos). The trade-off is that the endpoint can return HTTP 202 on first call (GitHub is computing stats asynchronously) — we handle this with a single retry after a short delay.

### Decision 2: Bound to repos already in `contributions`

Only fetch stats for repos that appear in the `contributions` array. This naturally limits scope to repos the developer actually contributed to in the tracked period, and reuses the already-fetched repo list — no new GitHub API calls to discover repos.

### Decision 3: Store as flat totals on `DeveloperOverview`, not per-period

Add `linesAdded: number` and `linesDeleted: number` as lifetime totals on the overview. The UI can filter these using the same `calendarWeeks` and `contributions` date-range logic already in place. Per-period breakdowns can be added in a future iteration if needed.

### Decision 4: Fetch stats after the main GraphQL fetch, in the existing API route

Add a `fetchLinesOfCode(repos, username, token)` helper in `src/lib/github-stats.ts` called from the existing `route.ts` after `fetchAllContributions`. This keeps the enrichment co-located with the cache write and avoids a new API endpoint.

## Risks / Trade-offs

- **202 async stats**: GitHub may return 202 for cold repos (stats not yet computed). Mitigation: retry once after 2s; if still 202, default to 0 for that repo and log a warning. Do not block the response.
- **Rate limits**: Fetching stats for developers with many repos (50+) could consume significant REST quota. Mitigation: cap at top 20 repos by contribution count. Log the cap when applied.
- **Stale stats**: The 1h Redis TTL means line counts reflect the state at cache-fill time. Acceptable for an overview dashboard.
- **REST token scope**: The session `accessToken` (GitHub OAuth) has `repo` scope for public repos, which is sufficient for contributor stats on public repos. Private repos will return 404 — skip silently.
