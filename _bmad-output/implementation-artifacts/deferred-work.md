# Deferred Work

## Deferred from: code review of 1-1-supabase-infrastructure-and-save-api (2026-04-18)

- `account_created_at: overview.createdAt.split("T")[0]` — no null guard on `createdAt`; DeveloperOverview always has it from GitHub API, but unvalidated Redis cache is a systemic concern across the codebase.
- Rate-limit pre-flight removal from `github-search.ts` — deliberate TD-003 resolution; reactive 403 retry is the accepted approach. Revisit if GitHub token suspension becomes a problem in production.
- `/api/` prefix in proxy is broad — `config.matcher` already exempts `/api/auth`; any future intentionally-public API route will need an explicit exemption added to `publicPaths` or the matcher.
- Unvalidated cache object shape — `getCached<T>` is a TypeScript cast, not runtime schema validation. Any corrupted Redis data would crash at the call site. Systemic pattern throughout the codebase; address holistically if data integrity issues arise.

## Deferred from: code review of 3-1-native-logger (2026-04-18)

- Binary log level control (warn or debug only) — no intermediate `info` level without also enabling `debug`; by design per spec, revisit if observability requirements grow.
- `process.env` read on every log call — intentional for testability and serverless hot-reload; minor perf overhead in high-frequency paths.
- No numeric `severity` field in JSON output — relevant if a structured log aggregator (Datadog, CloudWatch) is added; add `levelno` at that point.

## Deferred from: code review of 1-2-save-button-and-modal-ui (2026-04-18)

- No CSRF protection on `POST /api/developers/save` — backend architectural concern from Story 1.1; depends on SameSite cookie policy and Next.js 16 defaults.
- Error messages (`validationError`, `apiError`) rendered without `role="alert"` or `aria-live="assertive"`; `Input` has `aria-invalid` but no `aria-describedby` linking to the message element.
- Orphaned `developer_snapshots` row when `snapshot_bitcoin_repos` insert fails — no DB transaction; retry creates a duplicate snapshot row. Pre-existing Story 1.1 backend issue.
- Redis failure silently converts to a 409 "Profile expired" response — all saves blocked during Redis outage with a misleading user message. Pre-existing Story 1.1 backend issue.
- `401` and `400` responses from the save API are treated identically to `500` ("Failed to save — please try again"); session expiry gives no re-authentication prompt.
- Save button remains active after a successful save — no callback or SWR mutate to mark the developer as saved; user can create duplicate snapshots without warning.
- `Dialog.Description` not present alongside `Dialog.Title` — accessibility best practice for Base UI dialog requires either `Dialog.Description` or explicit `aria-describedby={undefined}`.
