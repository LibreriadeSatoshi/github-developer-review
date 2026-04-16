## 1. Types and Data Model

- [x] 1.1 Add `linesAdded: number` and `linesDeleted: number` fields to `DeveloperOverview` in `src/lib/types.ts`

## 2. GitHub Stats Fetcher

- [x] 2.1 Create `src/lib/github-stats.ts` with `fetchLinesOfCode(repos, username, token)` function
- [x] 2.2 Implement call to `GET /repos/{owner}/{repo}/stats/contributors` using the session access token
- [x] 2.3 Handle HTTP 202 with a single 2s retry; default to 0 and log warning if retry also returns 202
- [x] 2.4 Handle HTTP 404/403 by skipping the repo silently
- [x] 2.5 Cap input repos to top 20 by contribution count; log when cap is applied
- [x] 2.6 Sum the developer's weekly `a` (additions) and `d` (deletions) across all weeks and all repos

## 3. API Route Integration

- [x] 3.1 Import and call `fetchLinesOfCode` in `src/app/api/github/overview/[username]/route.ts` after `fetchAllContributions`
- [x] 3.2 Pass the repos from `result.contributions` (deduplicated by `repoNameWithOwner`) to the fetcher
- [x] 3.3 Include `linesAdded` and `linesDeleted` in the `DeveloperOverview` object before caching

## 4. UI Display

- [x] 4.1 Add a "Lines written" stat display to the developer profile overview component, formatted as compact number (e.g. 42300 → "42.3k")
- [x] 4.2 Ensure the stat is visible when `linesAdded` is 0 (display "0", not hidden)

## 5. Tests

- [x] 5.1 Unit test `fetchLinesOfCode`: 200 response sums correctly across repos and weeks
- [x] 5.2 Unit test `fetchLinesOfCode`: 202 retry logic — defaults to 0 after second 202
- [x] 5.3 Unit test `fetchLinesOfCode`: 404/403 repos are skipped silently
- [x] 5.4 Unit test `fetchLinesOfCode`: caps at 20 repos when more are provided
