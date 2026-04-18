# Story 1.1: Supabase Infrastructure and Save API

Status: done

## Story

As an authenticated B4OS operator,
I want a working API endpoint that persists a developer snapshot to Supabase,
So that the save flow has a complete backend before the UI is built.

## Acceptance Criteria

1. **Given** SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured — **When** `src/lib/supabase.ts` is imported — **Then** the Supabase client initializes and is the sole import point for `@supabase/supabase-js`
2. **Given** the migration SQL is applied — **When** the Supabase schema is inspected — **Then** `developer_snapshots` and `snapshot_bitcoin_repos` tables exist with all columns and indexes from design.md
3. **Given** no valid session — **When** `POST /api/developers/save` is called — **Then** response is `401` JSON `{ error: "Unauthorized" }`
4. **Given** a valid session and an expired Redis cache for the username — **When** `POST /api/developers/save` is called — **Then** response is `409` JSON `{ error: "Profile expired — please reload before saving" }`
5. **Given** a valid session, cached profile, and invalid `programEntryDate` "13/40/2024" — **When** `POST /api/developers/save` is called — **Then** response is `400` JSON with date validation error
6. **Given** a valid session, cached profile, and `programEntryDate` "01/12/2024" — **When** `POST /api/developers/save` is called — **Then** a new row is inserted with `program_entry_date = "2024-01-12"`, bitcoin repos inserted in `snapshot_bitcoin_repos`, response is `200` JSON `{ id, savedAt }`
7. **Given** a valid session, cached profile, and blank `programEntryDate` — **When** `POST /api/developers/save` is called — **Then** snapshot saved with `program_entry_date = NULL`
8. Existing snapshots for the same username are NEVER modified or deleted (append-only)

## Tasks / Subtasks

- [x] Task 1: Install dependency and add env vars (AC: 1)
  - [x] 1.1 Run `npm install @supabase/supabase-js`
  - [x] 1.2 Add `SUPABASE_URL=` and `SUPABASE_SERVICE_ROLE_KEY=` to `.env.local` (blank values)
  - [x] 1.3 Add same vars with comments to `.env.example` under a new `# Persistence (Supabase)` section

- [x] Task 2: Create Supabase client module (AC: 1)
  - [x] 2.1 Create `src/lib/supabase.ts` exporting a single server-side Supabase client
  - [x] 2.2 Use `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` — never `SUPABASE_ANON_KEY`
  - [x] 2.3 Throw clear error if env vars missing (fail fast at startup, not at request time)

- [x] Task 3: Apply database migration (AC: 2)
  - [x] 3.1 Run the SQL migration from design.md in the Supabase dashboard SQL editor (manual step — SQL documented in Dev Notes below)
  - [ ] 3.2 Verify tables and indexes exist via Supabase table editor ← **MANUAL: run after applying SQL**

- [x] Task 4: Create POST /api/developers/save route (AC: 3–8)
  - [x] 4.1 Create `src/app/api/developers/save/route.ts` with named `POST` export
  - [x] 4.2 Auth check: `const session = await auth()` — return 401 if `!session?.accessToken`
  - [x] 4.3 Parse body: `{ username, programEntryDate }` — validate `username` with `GITHUB_USERNAME_RE`
  - [x] 4.4 Validate date format: if `programEntryDate` is non-empty, must match `MM/DD/YYYY` — return 400 if invalid
  - [x] 4.5 Normalize date: convert `MM/DD/YYYY` → `YYYY-MM-DD`; store `null` if blank
  - [x] 4.6 Read `DeveloperOverview` from Redis: `getCached<DeveloperOverview>(\`overview:2:${username.toLowerCase()}\`)` — return 409 if null
  - [x] 4.7 Insert row into `developer_snapshots` with all denormalized fields + `profile_json`
  - [x] 4.8 Batch insert rows into `snapshot_bitcoin_repos` from `overview.bitcoinRepos`
  - [x] 4.9 Return `200` JSON `{ id, savedAt }`

- [x] Task 5: Write unit tests (AC: 3–8)
  - [x] 5.1 Test: no session → 401
  - [x] 5.2 Test: cache miss → 409
  - [x] 5.3 Test: invalid date format → 400
  - [x] 5.4 Test: valid date → row inserted with normalized date, bitcoin repos inserted, 200 response
  - [x] 5.5 Test: blank date → row inserted with program_entry_date = null
  - [x] 5.6 Mock: `@/lib/auth` (return session or null), `@/lib/cache` (return overview or null), `@/lib/supabase` (mock insert)

## Dev Notes

### Critical Patterns — MUST Follow

**Auth pattern** (mandatory for every API route — no exceptions):
```ts
// src/app/api/developers/save/route.ts
import { auth } from "@/lib/auth";
import { getCached } from "@/lib/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...
}
```

**Cache key format** — exact, case-sensitive:
```ts
const cacheKey = `overview:2:${username.toLowerCase()}`;
const overview = await getCached<DeveloperOverview>(cacheKey);
if (!overview) {
  return NextResponse.json(
    { error: "Profile expired — please reload before saving" },
    { status: 409 }
  );
}
```

**Date validation and normalization**:
```ts
// Validate MM/DD/YYYY format
const DATE_RE = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(\d{4})$/;

function normalizeDateInput(input: string): string | null {
  if (!input.trim()) return null;
  if (!DATE_RE.test(input)) throw new Error("Invalid date format");
  const [month, day, year] = input.split("/");
  return `${year}-${month}-${day}`;
}
```

**Supabase client** (`src/lib/supabase.ts`):
```ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

export const supabase = createClient(url, key);
```

**Supabase insert pattern**:
```ts
import { supabase } from "@/lib/supabase";

const { data, error } = await supabase
  .from("developer_snapshots")
  .insert({
    username: overview.login.toLowerCase(),
    program_entry_date: normalizedDate,  // null if blank
    snapshot_at: new Date().toISOString(),
    total_contributions: overview.totalContributions,
    lines_added: overview.linesAdded ?? 0,
    lines_deleted: overview.linesDeleted ?? 0,
    account_created_at: overview.createdAt.split("T")[0],
    profile_json: overview,
  })
  .select("id, saved_at")
  .single();

if (error) throw error;

// Batch insert bitcoin repos
if (overview.bitcoinRepos.length > 0) {
  await supabase.from("snapshot_bitcoin_repos").insert(
    overview.bitcoinRepos.map((r) => ({
      snapshot_id: data.id,
      repo_name: r.nameWithOwner,
      tier: r.tier,
    }))
  );
}
```

**IMPORTANT — snapshot_at field**: Use `new Date().toISOString()` — we do NOT store the Redis cache fill time, so the save timestamp is the best approximation.

### SQL Migration — Run Manually in Supabase Dashboard

```sql
CREATE TABLE developer_snapshots (
  id                   BIGSERIAL PRIMARY KEY,
  username             TEXT        NOT NULL,
  program_entry_date   TEXT,
  snapshot_at          TIMESTAMPTZ NOT NULL,
  saved_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_contributions  INTEGER,
  lines_added          INTEGER,
  lines_deleted        INTEGER,
  account_created_at   TEXT,
  profile_json         JSONB       NOT NULL
);

CREATE INDEX idx_dev_snapshots_username    ON developer_snapshots(username);
CREATE INDEX idx_dev_snapshots_username_at ON developer_snapshots(username, snapshot_at DESC);

CREATE TABLE snapshot_bitcoin_repos (
  snapshot_id  BIGINT REFERENCES developer_snapshots(id) ON DELETE CASCADE,
  repo_name    TEXT NOT NULL,
  tier         TEXT NOT NULL
);

CREATE INDEX idx_repos_tier ON snapshot_bitcoin_repos(tier);
```

### File Locations

- New: `src/lib/supabase.ts` — Supabase client singleton
- New: `src/app/api/developers/save/route.ts` — POST handler
- New: `src/app/api/developers/save/__tests__/route.test.ts` — unit tests
- Modified: `.env.example` — add Supabase vars
- Modified: `.env.local` — add blank Supabase vars (do NOT commit real values)

### Types to Import

```ts
import type { DeveloperOverview } from "@/lib/types";
import { GITHUB_USERNAME_RE } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { getCached } from "@/lib/cache";
import { NextResponse } from "next/server";
```

`DeveloperOverview.bitcoinRepos` is `RepoClassification[]` where each has `nameWithOwner: string` and `tier: RelevanceTier` (`"core" | "ecosystem" | "adjacent"`).

### Testing Pattern

```ts
// Mock pattern for save route tests
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/cache", () => ({ getCached: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 1, saved_at: "2026-04-18T10:00:00Z" }, error: null }),
        }),
      }),
    }),
  },
}));
```

Test file location: `src/app/api/developers/save/__tests__/route.test.ts` (consistent with existing test location pattern, e.g., `src/app/api/github/overview/[username]/__tests__/route.test.ts`).

### Anti-Patterns to Avoid

- ❌ DO NOT import `@supabase/supabase-js` directly in route files — use `@/lib/supabase`
- ❌ DO NOT re-fetch from GitHub API in the save route — read from Redis cache ONLY
- ❌ DO NOT upsert — always INSERT, never UPDATE existing snapshot rows
- ❌ DO NOT use `SUPABASE_ANON_KEY` — use `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- ❌ DO NOT use relative imports — use `@/*` path alias throughout
- ❌ DO NOT use `console.log` — use `DEBUG_CONSOLE` pattern if logging needed

### Architecture References

- [Source: openspec/changes/persist-developer-profiles/design.md#Database Schema] — exact SQL
- [Source: openspec/changes/persist-developer-profiles/design.md#Decision 5] — save reads from cache, not re-fetch
- [Source: docs/architecture.md#Implementation Patterns] — mandatory 5-step API route pattern
- [Source: _bmad-output/project-context.md#Framework-Specific Rules] — `auth()` from `@/lib/auth`, `getCached`/`setCache` from `@/lib/cache`
- [Source: src/app/api/github/overview/[username]/route.ts] — reference implementation for the route pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

### Review Findings

- [x] [Review][Decision→Patch] DATE_RE accepts logically invalid dates — resolved: added calendar validation via `new Date(y, m-1, d)` rollover check in `normalizeDateInput` [`src/app/api/developers/save/route.ts`]

- [x] [Review][Patch] Unhandled error on `snapshot_bitcoin_repos` insert — fixed: check `reposError`, return 500 [`src/app/api/developers/save/route.ts`]

- [x] [Review][Patch] Raw `PostgrestError` thrown on first insert — fixed: caught, returns `{ error: "Failed to save snapshot" }` 500 [`src/app/api/developers/save/route.ts`]

- [x] [Review][Patch] `programEntryDate` null/non-string bypasses default — fixed: `normalizeDateInput` now accepts `unknown`, `typeof` guards before `.trim()` [`src/app/api/developers/save/route.ts`]

- [x] [Review][Defer] `account_created_at: overview.createdAt.split("T")[0]` — no null guard; systemic unvalidated-cache concern, not introduced here [`src/app/api/developers/save/route.ts:61`] — deferred, pre-existing
- [x] [Review][Defer] Rate-limit pre-flight removal — deliberate TD-003 resolution; reactive 403 retry is chosen approach [`src/lib/github-search.ts`] — deferred, pre-existing
- [x] [Review][Defer] `/api/` prefix in proxy overly broad for future public routes — `config.matcher` already exempts `/api/auth` [`src/proxy.ts:17`] — deferred, pre-existing
- [x] [Review][Defer] Unvalidated cache object shape — `getCached<T>` is a type cast, not runtime validation; systemic codebase pattern [`src/lib/cache.ts`] — deferred, pre-existing
