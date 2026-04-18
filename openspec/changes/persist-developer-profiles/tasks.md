## 1. Supabase Setup

- [ ] 1.1 Create `developer_snapshots` table in Supabase with schema from design.md
- [ ] 1.2 Create `snapshot_bitcoin_repos` table with indexes from design.md
- [ ] 1.3 Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and Netlify env vars
- [ ] 1.4 Create `src/lib/supabase.ts` — exports a single server-side Supabase client using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

## 2. Save API Route

- [ ] 2.1 Create `src/app/api/developers/save/route.ts` with `POST` handler
- [ ] 2.2 Auth check — return 401 if no session
- [ ] 2.3 Read `DeveloperOverview` from Redis cache using existing `getCached` — return 409 if cache miss
- [ ] 2.4 Normalize `programEntryDate` from MM/DD/YYYY to YYYY-MM-DD; reject invalid dates with 400
- [ ] 2.5 Insert row into `developer_snapshots`, extract denormalized fields from the overview
- [ ] 2.6 Batch insert rows into `snapshot_bitcoin_repos` from `overview.bitcoinRepos`
- [ ] 2.7 Return `{ id, savedAt }` on success

## 3. Export API Route

- [ ] 3.1 Create `src/app/api/developers/export/route.ts` with `GET` handler
- [ ] 3.2 Auth check — return 401 if no session
- [ ] 3.3 Accept query params: `username`, `from`, `to` (all optional)
- [ ] 3.4 Query latest snapshot per developer within date range (or all if no range)
- [ ] 3.5 Flatten each snapshot's `calendarWeeks` into one row per day
- [ ] 3.6 Join `snapshot_bitcoin_repos` to build `bitcoin_tiers` pipe-separated column
- [ ] 3.7 Stream response as `text/csv` with `Content-Disposition: attachment; filename="b4os-export.csv"`
- [ ] 3.8 CSV columns: `username, program_entry_date, snapshot_at, date, contribution_count, total_contributions, lines_added, lines_deleted, account_created_at, bitcoin_tiers`

## 4. UI — Save Button and Modal

- [ ] 4.1 Add Save button to the developer overview page, visible only when profile is fully loaded
- [ ] 4.2 Create `SaveDeveloperModal` component in `src/components/SaveDeveloperModal.tsx`
- [ ] 4.3 Modal has one optional text field: "Program entry date (MM/DD/YYYY)"
- [ ] 4.4 Client-side date format validation before submitting
- [ ] 4.5 On submit, call `POST /api/developers/save` — show success toast on 200, error message on failure
- [ ] 4.6 On 409 (cache miss), show message: "Profile expired — please reload before saving"

## 5. Tests

- [ ] 5.1 Unit test save route: returns 401 without session
- [ ] 5.2 Unit test save route: returns 409 when Redis cache miss
- [ ] 5.3 Unit test save route: returns 400 on invalid date format
- [ ] 5.4 Unit test save route: inserts snapshot and bitcoin_repos rows on valid input
- [ ] 5.5 Unit test export route: returns 401 without session
- [ ] 5.6 Unit test export route: CSV output has correct columns and one row per calendar day
- [ ] 5.7 Unit test export route: `username` filter limits output to that developer
- [ ] 5.8 Unit test `SaveDeveloperModal`: shows validation error on invalid date format
