## ADDED Requirements

### Requirement: route.test.ts uses beforeEach for shared auth and cache setup
The test suite for `POST /api/developers/save` SHALL consolidate the repeated `mockAuth.mockResolvedValue({ accessToken: "tok" } as never)` and `mockGetCached.mockResolvedValue(makeOverview())` calls into the existing `beforeEach` block so individual tests only specify deviations from the default authenticated+cache-hit state.

#### Scenario: Default authenticated state is provided by beforeEach
- **WHEN** a test does not call `mockAuth.mockResolvedValue` itself
- **THEN** the route receives an authenticated session with `accessToken: "tok"`

#### Scenario: Tests that require unauthenticated state override in the test body
- **WHEN** a test needs `null` auth or missing `accessToken`
- **THEN** it calls `mockAuth.mockResolvedValue(null)` inside the `it()` block to override beforeEach

#### Scenario: Tests that require a cache miss override in the test body
- **WHEN** a test needs a cache miss
- **THEN** it calls `mockGetCached.mockResolvedValue(null)` inside the `it()` block

### Requirement: SaveDeveloperModal.test.tsx provides a renderAndSave helper
The test file SHALL expose a `renderAndSave(date?: string)` helper that renders the modal, optionally sets the date input, and clicks the Save button, returning `{ onOpenChange }`.

#### Scenario: renderAndSave with no date clicks Save immediately
- **WHEN** `renderAndSave()` is called without arguments
- **THEN** the Save button is clicked with an empty date input

#### Scenario: renderAndSave with a date sets the input first
- **WHEN** `renderAndSave("01/12/2024")` is called
- **THEN** the date input is set to `"01/12/2024"` before the Save button is clicked

### Requirement: github-search.test.ts avoids repeated dynamic import destructuring
The test file SHALL import `githubFetch` once (hoisted via `beforeEach` or top-level `let`) instead of repeating `const { githubFetch } = await import("@/lib/github-search")` in every `it()` block.

#### Scenario: githubFetch is available in each test without re-importing
- **WHEN** any `it()` block in the `github-search` describe uses `githubFetch`
- **THEN** it references the variable set up outside the test body rather than calling `import()` inline
