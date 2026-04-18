## Why

SonarQube reports 4.5% duplicated lines on new code, with three test files accounting for 57 duplicated lines. Repeated setup boilerplate inflates test files and makes them harder to maintain when shared patterns change.

## What Changes

- Extract repeated `mockAuth.mockResolvedValue({ accessToken: "tok" })` + `mockGetCached.mockResolvedValue(makeOverview())` calls in `route.test.ts` into a shared `setupAuthenticated(overrides?)` helper
- Extract the repeated render-and-click-save pattern in `SaveDeveloperModal.test.tsx` into a `renderAndSave(date?)` helper
- Deduplicate the repeated `await import(...)` + assertion pattern in `src/lib/__tests__/github-search.test.ts`

## Capabilities

### New Capabilities
<!-- None — this is a refactor within existing test files -->

### Modified Capabilities
<!-- No spec-level behavior changes; only test internals change -->

## Impact

- 3 test files modified: `src/app/api/developers/save/__tests__/route.test.ts`, `src/components/__tests__/SaveDeveloperModal.test.tsx`, `src/lib/__tests__/github-search.test.ts`
- No production code changes; no API or behavior changes
- All existing tests must continue to pass after the refactor
