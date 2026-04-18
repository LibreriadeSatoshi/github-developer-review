## Why

Currently any GitHub user can log in and save developer snapshots. The app should be restricted to members of a specific GitHub organization so that only authorized reviewers can access it.

## What Changes

- Add `AUTH_GITHUB_ORG` environment variable (org slug, e.g. `LibreriadeSatoshi`)
- Request the `read:org` OAuth scope from GitHub so org membership can be verified
- Add a `signIn` callback in `src/lib/auth.ts` that calls the GitHub API to verify the user is a member of `AUTH_GITHUB_ORG` before allowing login
- Users who fail the org check are redirected to a `/auth/denied` page instead of the dashboard
- Add `/auth/denied` page with a clear "access restricted" message
- Update `CLAUDE.md` environment variable table to document `AUTH_GITHUB_ORG`

## Capabilities

### New Capabilities
- `org-membership-gate`: Login is blocked for GitHub users who are not members of the configured organization. The gate is skipped gracefully if `AUTH_GITHUB_ORG` is unset (no regression for local dev without the var).

### Modified Capabilities

## Impact

- `src/lib/auth.ts` — add `signIn` callback and `read:org` scope to GitHub provider
- `src/app/auth/denied/page.tsx` — new page (no auth required)
- `src/lib/__tests__/auth.test.ts` — extend tests to cover org membership checks
- `.env.example` / `CLAUDE.md` — document new env var
- Next.js middleware (`src/middleware.ts`) — `/auth/denied` must be added to public paths
