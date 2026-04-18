---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - openspec/changes/persist-developer-profiles/proposal.md
  - openspec/changes/persist-developer-profiles/design.md
  - openspec/changes/persist-developer-profiles/specs/developer-persistence/spec.md
  - openspec/changes/persist-developer-profiles/tasks.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/project-context.md
---

# github-developer-review — Epic Breakdown: persist-developer-profiles

## Overview

This document decomposes the `persist-developer-profiles` openspec change into implementable epics and stories. The change adds developer profile persistence to Supabase for B4OS program tracking, plus a CSV export for pivot table analysis.

## Requirements Inventory

### Functional Requirements

FR1: Save button appears on developer overview page only when DeveloperOverview is fully loaded (not loading, not error state)
FR2: Clicking Save opens a modal with one optional field: program entry date (MM/DD/YYYY format) and Save / Cancel buttons
FR3: Each save creates a new append-only snapshot row in Supabase — old snapshots for the same developer are never overwritten
FR4: Save reads DeveloperOverview from Redis cache; returns 409 with "reload profile" message if cache miss
FR5: programEntryDate is normalized from MM/DD/YYYY to YYYY-MM-DD before storing; stored as NULL if blank
FR6: Invalid date format is rejected client-side with a validation error before the API call is made
FR7: On success, show success toast; on API failure, show inline error; on 409, show "Profile expired — please reload before saving"
FR8: GET /api/developers/export returns a CSV file with one row per calendar day per developer (from calendarWeeks)
FR9: Export accepts optional query params: username (filter to one developer), from / to (date range on snapshot_at)
FR10: Export returns the latest snapshot per developer within the requested date range (not all historical snapshots)
FR11: CSV has exactly 10 columns: username, program_entry_date, snapshot_at, date, contribution_count, total_contributions, lines_added, lines_deleted, account_created_at, bitcoin_tiers
FR12: bitcoin_tiers column is a pipe-separated list of tiers (e.g. core|ecosystem) from snapshot_bitcoin_repos
FR13: Export response includes Content-Disposition: attachment; filename="b4os-export.csv"

### NonFunctional Requirements

NFR1: Both save and export endpoints require an authenticated session — return 401 JSON if no valid session
NFR2: SUPABASE_SERVICE_ROLE_KEY is used server-side only via src/lib/supabase.ts — never exposed to client
NFR3: All new code follows TypeScript strict mode — no implicit any
NFR4: All new API routes follow the mandatory 5-step auth pattern from architecture.md
NFR5: Unit tests required for save route (401, 409, 400, happy path), export route (401, CSV shape, username filter), and SaveDeveloperModal (date validation)

### Additional Requirements

- New dependency: @supabase/supabase-js — install before any implementation
- New env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY — add to .env.local and Netlify environment
- Supabase client singleton exported from src/lib/supabase.ts — no direct @supabase/supabase-js imports in route files
- developer_snapshots table: BIGSERIAL PK, TEXT username, TEXT program_entry_date (nullable), TIMESTAMPTZ snapshot_at, TIMESTAMPTZ saved_at DEFAULT NOW(), INTEGER denormalized fields, JSONB profile_json
- snapshot_bitcoin_repos table: BIGINT snapshot_id FK ON DELETE CASCADE, TEXT repo_name, TEXT tier — indexed by tier
- Indexes: (username), (username, snapshot_at DESC) on developer_snapshots; (tier) on snapshot_bitcoin_repos
- Save reads from Redis cache key overview:2:{username} using existing getCached — do not re-fetch from GitHub
- Export flattens calendarWeeks from profile_json JSONB — no separate day-level table needed

### UX Design Requirements

UX-DR1: Save button placement — near the profile header, secondary visual weight relative to primary navigation
UX-DR2: Save modal — minimal design, single optional input field, no required fields, clear Cancel path
UX-DR3: Date input — plain text field with placeholder "MM/DD/YYYY", client-side validation on submit (not on blur)
UX-DR4: Success/error feedback — use existing toast pattern from the app (shadcn/ui Sonner or equivalent)
UX-DR5: 409 state — distinct message from generic error: "Profile expired — please reload before saving"

### FR Coverage Map

| FR | Epic | Story |
|---|---|---|
| FR1, UX-DR1 | Epic 4 | Story 4.1 |
| FR2, FR6, UX-DR2, UX-DR3, UX-DR4, UX-DR5 | Epic 4 | Story 4.1 |
| FR3, FR4, FR5, FR7, NFR1, NFR2, NFR4 | Epic 2 | Story 2.1 |
| FR8–FR13, NFR1, NFR4 | Epic 3 | Story 3.1 |
| NFR2, NFR3 | Epic 1 | Story 1.1 |

## Epic List

### Epic 1: Save Developer Snapshot
Operator can save a developer profile with program entry date, creating a persistent baseline snapshot in Supabase for B4OS program tracking.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7 + UX-DR1–UX-DR5 + NFR1–NFR5

### Epic 2: Export Developer Profiles CSV
Operator can download a CSV of all saved developer snapshots, filterable by username and date range, optimized for Excel pivot table analysis.
**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13

### FR Coverage Map

FR1: Epic 1 — Save button visible only when profile fully loaded
FR2: Epic 1 — Save modal with optional program_entry_date field
FR3: Epic 1 — Append-only snapshot insert, old records never overwritten
FR4: Epic 1 — Save reads from Redis cache; 409 on cache miss
FR5: Epic 1 — programEntryDate normalized MM/DD/YYYY → YYYY-MM-DD, NULL if blank
FR6: Epic 1 — Client-side date validation before API call
FR7: Epic 1 — Success toast / error message / 409 reload message
FR8: Epic 2 — CSV with one row per calendar day per developer
FR9: Epic 2 — Optional query params: username, from, to
FR10: Epic 2 — Latest snapshot per developer within date range
FR11: Epic 2 — Exactly 10 CSV columns as specified
FR12: Epic 2 — bitcoin_tiers as pipe-separated list
FR13: Epic 2 — Content-Disposition: attachment; filename="b4os-export.csv"
NFR1–NFR5: Both epics (auth, server-side key, TypeScript strict, 5-step pattern, tests)

---

## Epic 1: Save Developer Snapshot

Operator can save a developer profile with program entry date, creating a persistent baseline snapshot in Supabase for B4OS program tracking.

### Story 1.1: Supabase Infrastructure and Save API

As an authenticated B4OS operator,
I want a working API endpoint that persists a developer snapshot to Supabase,
So that the save flow has a complete backend before the UI is built.

**Acceptance Criteria:**

**Given** SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are added to .env.local and Netlify
**When** src/lib/supabase.ts is imported by any route
**Then** the Supabase client is available without direct @supabase/supabase-js imports in route files

**Given** the migration SQL from design.md is applied
**When** the Supabase schema is inspected
**Then** developer_snapshots and snapshot_bitcoin_repos tables exist with all columns and indexes

**Given** no valid session
**When** POST /api/developers/save is called
**Then** response is 401 JSON { error: "Unauthorized" }

**Given** a valid session and an expired Redis cache for the username
**When** POST /api/developers/save is called
**Then** response is 409 JSON { error: "Profile expired — please reload before saving" }

**Given** a valid session, cached profile, and invalid programEntryDate "13/40/2024"
**When** POST /api/developers/save is called
**Then** response is 400 JSON with date validation error

**Given** a valid session, cached profile, and programEntryDate "01/12/2024"
**When** POST /api/developers/save is called
**Then** a new row is inserted into developer_snapshots with program_entry_date = "2024-01-12"
**And** rows are inserted into snapshot_bitcoin_repos for each entry in bitcoinRepos
**And** response is 200 JSON { id, savedAt }

**Given** a valid session, cached profile, and blank programEntryDate
**When** POST /api/developers/save is called
**Then** snapshot is saved with program_entry_date = NULL

**And** existing snapshots for the same username are never modified or deleted

---

### Story 1.2: Save Button and Modal UI

As an authenticated B4OS operator viewing a loaded developer profile,
I want a Save button that opens a program entry date modal,
So that I can persist the snapshot with the correct baseline date in one action.

**Acceptance Criteria:**

**Given** a developer profile is loading or in error state
**When** the overview page renders
**Then** the Save button is NOT visible

**Given** a developer profile is fully loaded
**When** the overview page renders
**Then** a Save button appears near the profile header

**Given** the Save button is clicked
**When** the modal opens
**Then** it shows a heading, an optional date input with placeholder "MM/DD/YYYY", and Save / Cancel buttons

**Given** the modal is open and the user enters "13/40/2024"
**When** the user clicks Save
**Then** a validation error appears inline and no API call is made

**Given** the modal is open and the user enters a valid date "01/12/2024"
**When** the API returns 200
**Then** the modal closes and a success toast is shown

**Given** the modal is open and the API returns 409
**When** the save completes
**Then** the modal shows "Profile expired — please reload before saving"

**Given** the modal is open
**When** the user clicks Cancel
**Then** the modal closes with no API call and no state change

---

## Epic 2: Export Developer Profiles CSV

Operator can download a CSV of all saved developer snapshots, filterable by username and date range, optimized for Excel pivot table analysis.

### Story 2.1: Export CSV API

As an authenticated B4OS operator,
I want to download a filtered CSV of saved developer snapshots,
So that I can analyze B4OS program progress in Excel with pivot tables filtered by program entry date.

**Acceptance Criteria:**

**Given** no valid session
**When** GET /api/developers/export is called
**Then** response is 401 JSON { error: "Unauthorized" }

**Given** a valid session and saved snapshots for 3 developers
**When** GET /api/developers/export is called with no params
**Then** Content-Type is text/csv and Content-Disposition is attachment; filename="b4os-export.csv"
**And** CSV has exactly 10 columns: username, program_entry_date, snapshot_at, date, contribution_count, total_contributions, lines_added, lines_deleted, account_created_at, bitcoin_tiers
**And** there is one row per calendarWeeks day per developer using the latest snapshot per developer

**Given** snapshots for developers A, B, C
**When** GET /api/developers/export?username=A is called
**Then** CSV contains only rows for developer A

**Given** multiple snapshots for the same developer
**When** export is called without date filters
**Then** only the latest snapshot per developer is included

**Given** a developer with bitcoin repos in tiers core and ecosystem
**When** the CSV row is generated
**Then** bitcoin_tiers column contains "core|ecosystem"

---
