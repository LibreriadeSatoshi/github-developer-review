## Context

SonarQube flags 4.5% duplicated lines on new code across three test files. The duplication is boilerplate, not business logic: repeated mock-setup calls and repeated render+action patterns that appear verbatim in multiple `it()` blocks.

**Current state per file:**

- `route.test.ts` (11.4%, 27 lines): `mockAuth.mockResolvedValue({ accessToken: "tok" } as never)` and `mockGetCached.mockResolvedValue(makeOverview())` are copy-pasted into ~10 test bodies instead of being folded into `beforeEach` or a helper.
- `SaveDeveloperModal.test.tsx` (18.9%, 27 lines): The sequence `renderModal()` → `fireEvent.click(save button)` → `await waitFor(...)` is repeated across multiple tests with minor variation.
- `github-search.test.ts` (33.3%, 3 lines): `await import("@/lib/github-search")` + the destructure of `githubFetch` is repeated in each `it()` block.

## Goals / Non-Goals

**Goals:**
- Eliminate the identified duplicate blocks by extracting shared setup into helpers or `beforeEach`
- Keep all existing assertions intact — observable test behavior must not change
- Reduce SonarQube duplicated-lines metric below 2% on these files

**Non-Goals:**
- Rewriting tests for coverage, restructuring describe blocks, or changing what is tested
- Touching production code
- Addressing other test files not flagged by SonarQube

## Decisions

### route.test.ts — move repeated auth+cache setup into beforeEach

Most tests share the same authenticated, cache-hit state. Move `mockAuth.mockResolvedValue({ accessToken: "tok" } as never)` and `mockGetCached.mockResolvedValue(makeOverview())` into `beforeEach`. Tests that need a different state (e.g., null auth, cache miss, overridden overview) override only what they need.

**Alternative considered:** a `setupAuthenticated(overrides?)` helper called at the top of each test. Rejected because `beforeEach` is idiomatic Vitest and requires fewer characters per test.

### SaveDeveloperModal.test.tsx — extract renderAndSave helper

Tests that share the pattern "render modal → change date input → click Save" get a `renderAndSave(date?: string)` helper that performs those steps and returns `{ onOpenChange }`. Tests that only render (no click) keep calling `renderModal()`.

### github-search.test.ts — hoist import to describe scope

`await import("@/lib/github-search")` is called inside each `it()` due to the `vi.resetModules()` pattern from an earlier version of the file. If `vi.resetModules()` is no longer called, the import can be hoisted to a `let githubFetch` variable assigned once in `beforeEach`. If module isolation is still needed, extract a `getGithubFetch()` one-liner called at the top of each test body to avoid the repeated destructure block.

## Risks / Trade-offs

- [Shared beforeEach state] Tests become slightly more coupled; a bad default in `beforeEach` could silently affect many tests → **Mitigation**: keep the `beforeEach` defaults conservative (happy-path authenticated state) and rely on per-test overrides for edge cases.
- [Hoisted import in github-search] If a future test adds `vi.resetModules()`, the hoisted import will be stale → **Mitigation**: leave a comment noting the import can be moved back if module isolation is needed.
