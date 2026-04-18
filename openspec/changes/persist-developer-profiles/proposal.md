## Why

The app currently evaluates developers in real time but retains nothing. Every session starts from zero — no history, no way to compare a developer's activity before and after joining a program, no data to hand to a grant committee or analyze with an LLM.

The B4OS program (Bitcoin for Open Source) manages developers from their entry date onward. The key question is always: "how has this developer progressed since they joined?" — which requires a baseline snapshot at entry and periodic snapshots thereafter. Without persistence there is no answer.

## What Changes

- A **Save button** appears in the UI once a developer profile fully loads. Clicking it opens a modal that asks for the developer's program entry date (US format MM/DD/YYYY), then persists a snapshot to Supabase.
- Each save creates a new **append-only snapshot row** — old snapshots are never overwritten, enabling evolution tracking over time.
- A new **export endpoint** returns a CSV with one row per day per developer (from `calendarWeeks`), plus lifetime metrics and `program_entry_date` repeated on each row. The CSV is designed to be filtered with Excel / Google Sheets pivot tables.
- Supabase is used as the persistent store. The project already has a Supabase tier.

## Capabilities

### New Capabilities

- `developer-persistence`: Saves developer profile snapshots to Supabase on demand, with a program entry date, and exports them as a filterable CSV.

### Modified Capabilities

- (none)

## Impact

- **New dependency**: `@supabase/supabase-js` — Supabase JS client.
- **New env vars**: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or `SUPABASE_SERVICE_ROLE_KEY` for server-side writes).
- **New API routes**: `POST /api/developers/save`, `GET /api/developers/export`.
- **UI**: Save button + modal added to the developer overview page. Appears only when profile is fully loaded.
- **No changes** to existing GitHub fetch logic, Redis cache, or existing API routes.
