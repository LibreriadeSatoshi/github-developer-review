## Overview

The `developer-persistence` capability saves developer profile snapshots to Supabase on demand and exports them as a CSV for analysis.

## Behavior

### Save

- A Save button appears on the developer overview page once the profile is fully loaded.
- Clicking Save opens a modal with one optional field: program entry date (MM/DD/YYYY).
- Submitting the modal creates a new snapshot row in Supabase — old snapshots for the same developer are never overwritten.
- The snapshot captures the `DeveloperOverview` at the moment of saving (read from Redis cache).
- If the cache has expired, the save is rejected with a message to reload the profile.

### Export

- `GET /api/developers/export` returns a CSV file.
- The CSV has one row per calendar day per developer (flattened from `calendarWeeks`).
- Lifetime metrics (`total_contributions`, `lines_added`, `lines_deleted`) are repeated on every row.
- `program_entry_date` is included on every row so users can filter in Excel (`date >= program_entry_date`).
- Optional query params: `username` (single developer), `from` / `to` (date range on `snapshot_at`).

## CSV Schema

| Column | Type | Description |
|---|---|---|
| `username` | string | GitHub login |
| `program_entry_date` | YYYY-MM-DD or empty | Date developer joined B4OS |
| `snapshot_at` | ISO8601 | When the GitHub data was fetched |
| `date` | YYYY-MM-DD | Calendar day (from `calendarWeeks`) |
| `contribution_count` | integer | Total contributions on that day |
| `total_contributions` | integer | Lifetime total (repeated per row) |
| `lines_added` | integer | Lifetime lines added (repeated per row) |
| `lines_deleted` | integer | Lifetime lines deleted (repeated per row) |
| `account_created_at` | YYYY-MM-DD | GitHub account creation date |
| `bitcoin_tiers` | pipe-separated | e.g. `core\|ecosystem` |

## Constraints

- Only authenticated users (valid session) can save or export.
- `programEntryDate` is optional — blank is valid, stored as NULL.
- Invalid date formats are rejected client-side before the API call.
- The export returns the latest snapshot per developer within the requested date range (not all snapshots).
