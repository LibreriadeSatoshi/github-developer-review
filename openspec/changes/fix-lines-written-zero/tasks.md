## 1. Type Changes

- [x] 1.1 Add optional `linesResolved?: boolean` field to `DeveloperOverview` in `src/lib/types.ts`
- [x] 1.2 Update `LinesOfCodeResult` in `src/lib/github-stats.ts` to include `resolved: boolean`

## 2. fetchLinesOfCode Fix

- [x] 2.1 Track whether any repo returned HTTP 200 data in `fetchLinesOfCode` (introduce a `resolved` boolean, set to `true` on first successful stats parse)
- [x] 2.2 Return `{ linesAdded, linesDeleted, resolved }` from `fetchLinesOfCode`

## 3. Route Cache Guard Fix

- [x] 3.1 Change cache guard in `route.ts` from `cached.linesAdded !== undefined` to `cached.linesResolved === true`
- [x] 3.2 Add inline re-fetch path: when `cached` exists but `linesResolved !== true`, call `fetchLinesOfCode` with the cached `contributions` data, update `linesAdded`/`linesDeleted`/`linesResolved` on the cached object, persist updated cache, and return the enriched result
- [x] 3.3 Ensure the `DeveloperOverview` built on full fetch includes `linesResolved` from the `fetchLinesOfCode` result

## 4. Tests

- [x] 4.1 Update `src/lib/__tests__/github-stats.test.ts`: assert `resolved: false` when all repos return 202, `resolved: true` when at least one returns 200
- [x] 4.2 Update `src/app/api/github/overview/[username]/__tests__/route.test.ts`: add test case where cached overview has `linesResolved: false` — verify stats are re-fetched and cache is updated
- [x] 4.3 Add test case where cached overview has `linesResolved: true` — verify stats are NOT re-fetched
