## Context

The developer profile is fetched from GitHub, enriched (bitcoin repo classification, lines of code), and cached in Redis (TTL 1h) under key `overview:2:{username}`. The `DeveloperOverview` type is the canonical shape of a developer profile in this app.

The persistence layer is entirely additive — it reads from the existing data flow and writes to Supabase. No existing routes or types are modified.

## Goals / Non-Goals

**Goals:**
- Persist `DeveloperOverview` snapshots to Supabase on explicit user action
- Capture `program_entry_date` at save time (user-provided, US date format)
- Export snapshots as a CSV optimized for Excel pivot tables
- Support filtering the export by `username` and date range (`from` / `to`)

**Non-Goals:**
- Automatic periodic snapshots (manual save only, for now)
- Editing saved data through the app UI (use Supabase table editor directly)
- LLM agent querying the DB live (Sabor 2 only — static export)
- Versioning or diffing snapshots in the UI (data is available for manual analysis)
- Deleting snapshots through the app

## Decisions

### Decision 1: Supabase over Turso

**Chosen**: Supabase (PostgreSQL).

**Rationale**: The project already has a Supabase tier. The Supabase table editor lets the operator edit rows directly (fix a wrong `program_entry_date`, browse profiles) without building admin UI. Built-in CSV export from the dashboard is available as a fallback. PostgreSQL is well-understood and boring.

**Alternative**: Turso (SQLite serverless) — zero new vendor, edge-native. Rejected because Supabase is already contracted and its UI provides operational value for a manually-curated dataset.

### Decision 2: Append-only snapshots (no upsert)

**Chosen**: Each save creates a new row. `username` is not unique.

**Rationale**: The primary use case is evolution tracking — "how has this developer changed since joining B4OS?" That requires multiple data points over time. Upsert would destroy history.

**Implication**: The export query uses a window function / subquery to identify "latest snapshot per developer" when a single-row-per-developer view is needed.

### Decision 3: `program_entry_date` at save time, nullable

The field is entered by the operator via modal when saving. It can be left blank and corrected later in the Supabase table editor. Stored as `TEXT` in ISO format (`YYYY-MM-DD`) after normalizing from US input (`MM/DD/YYYY`).

### Decision 4: CSV shape — one row per day per developer

The `calendarWeeks` array in `DeveloperOverview` contains day-level contribution counts with ISO dates. Flattening to one row per day gives Excel/Sheets users a date column they can filter directly (e.g., `date >= program_entry_date`). Lifetime metrics (`total_contributions`, `lines_added`, `lines_deleted`) are repeated on every row — redundant but required for pivot table compatibility.

### Decision 5: Save reads from Redis cache, not re-fetches

The Save button is only shown once the profile is fully loaded (already in Redux/SWR state). The POST endpoint reads the current cached value from Redis rather than triggering a new GitHub fetch. This keeps save instant and avoids burning GitHub API quota.

If the cache has expired by the time Save is clicked, the endpoint returns 409 with a message to reload the profile.

## Database Schema

```sql
CREATE TABLE developer_snapshots (
  id                   BIGSERIAL PRIMARY KEY,
  username             TEXT        NOT NULL,
  program_entry_date   TEXT,                    -- YYYY-MM-DD, nullable
  snapshot_at          TIMESTAMPTZ NOT NULL,    -- when GitHub data was fetched
  saved_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_contributions  INTEGER,
  lines_added          INTEGER,
  lines_deleted        INTEGER,
  account_created_at   TEXT,
  profile_json         JSONB       NOT NULL     -- full DeveloperOverview
);

CREATE INDEX idx_dev_snapshots_username    ON developer_snapshots(username);
CREATE INDEX idx_dev_snapshots_username_at ON developer_snapshots(username, snapshot_at DESC);

CREATE TABLE snapshot_bitcoin_repos (
  snapshot_id  BIGINT REFERENCES developer_snapshots(id) ON DELETE CASCADE,
  repo_name    TEXT NOT NULL,
  tier         TEXT NOT NULL    -- core | ecosystem | adjacent
);

CREATE INDEX idx_repos_tier ON snapshot_bitcoin_repos(tier);
```

`profile_json` stores the complete `DeveloperOverview` as JSONB. The extracted columns (`total_contributions`, etc.) are denormalized for query performance without deserializing JSON. `snapshot_bitcoin_repos` enables `WHERE tier = 'core'` joins.

## API Routes

### `POST /api/developers/save`

```
Body: { username: string, programEntryDate: string }  -- MM/DD/YYYY or empty
Auth: session required (existing pattern)
```

1. Auth check — return 401 if no session.
2. Read `overview:2:{username}` from Redis — return 409 if cache miss.
3. Normalize `programEntryDate` from MM/DD/YYYY to YYYY-MM-DD.
4. Insert into `developer_snapshots` + batch insert into `snapshot_bitcoin_repos`.
5. Return `{ id, savedAt }`.

### `GET /api/developers/export`

```
Query params: username? (filter to one dev), from? (YYYY-MM-DD), to? (YYYY-MM-DD)
Auth: session required
Response: text/csv
```

1. Auth check — return 401 if no session.
2. Query `developer_snapshots` (latest snapshot per username within date range, or all snapshots if no range).
3. Flatten each snapshot's `calendarWeeks` into rows.
4. Stream CSV response with headers:
   `username, program_entry_date, snapshot_at, date, contribution_count, total_contributions, lines_added, lines_deleted, account_created_at, bitcoin_tiers`
5. `bitcoin_tiers` is a pipe-separated list of tiers from `snapshot_bitcoin_repos` (e.g. `core|ecosystem`).

## UI Changes

- **Save button**: Added to the developer overview page, rendered only when `DeveloperOverview` is fully loaded (not loading, not error). Placed near the profile header.
- **Save modal**: Simple form with one field — "Program entry date (MM/DD/YYYY)" — and Save / Cancel buttons. Input is optional (can be left blank). On submit, calls `POST /api/developers/save`. Shows success toast or error message.
- No new pages or navigation changes.

## Risks / Trade-offs

- **Cache miss on save**: If the user waits >1h before clicking Save, the Redis cache expires and the snapshot can't be saved without reloading. The 409 response instructs the user to reload. Acceptable for a manual workflow.
- **Supabase cold start**: First request to Supabase after idle may be slow (~200ms). Not user-facing critical — save is a secondary action.
- **`program_entry_date` data quality**: Free-text input normalized client-side. Invalid dates are rejected with a validation error before the API call.
- **`calendarWeeks` size in export**: A developer with 5 years of history has ~1825 rows in the export. For hundreds of developers, the CSV could be large. Acceptable for a grant evaluation dataset — not a real-time UI concern.
