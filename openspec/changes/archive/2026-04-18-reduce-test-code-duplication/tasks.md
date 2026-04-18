## 1. route.test.ts — consolidate auth+cache setup into beforeEach

- [x] 1.1 Move `mockAuth.mockResolvedValue({ accessToken: "tok" } as never)` into the existing `beforeEach` block
- [x] 1.2 Move `mockGetCached.mockResolvedValue(makeOverview())` into the existing `beforeEach` block
- [x] 1.3 Remove the now-redundant per-test calls to those two mocks in every `it()` that relied on the happy-path defaults
- [x] 1.4 Verify the unauthenticated and cache-miss tests still override those mocks correctly in their own `it()` bodies
- [x] 1.5 Run `npx vitest run src/app/api/developers/save/__tests__/route.test.ts` — all tests must pass

## 2. SaveDeveloperModal.test.tsx — extract renderAndSave helper

- [x] 2.1 Add a `renderAndSave(date?: string)` helper below `renderModal` that calls `renderModal()`, optionally fires a change event on the date input, then clicks the Save button, and returns `{ onOpenChange }`
- [x] 2.2 Replace duplicated render+click sequences in `it()` blocks with calls to `renderAndSave(date?)`
- [x] 2.3 Run `npx vitest run src/components/__tests__/SaveDeveloperModal.test.tsx` — all tests must pass

## 3. github-search.test.ts — hoist dynamic import

- [x] 3.1 Add a `let githubFetch: Awaited<ReturnType<typeof import("@/lib/github-search")>>["githubFetch"]` declaration at the top of the `describe` block
- [x] 3.2 Assign it inside `beforeEach`: `githubFetch = (await import("@/lib/github-search")).githubFetch`
- [x] 3.3 Remove inline `const { githubFetch } = await import("@/lib/github-search")` from each `it()` body
- [x] 3.4 Run `npx vitest run src/lib/__tests__/github-search.test.ts` — all tests must pass

## 4. Final verification

- [x] 4.1 Run `npm run test:run` — full test suite must be green
