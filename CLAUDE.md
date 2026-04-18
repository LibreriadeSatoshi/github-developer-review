# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint (flat config, next/core-web-vitals + typescript)
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single run (CI)
npx tsc --noEmit    # TypeScript check (no test runner needed)
```

Run a single test file:
```bash
npx vitest run src/lib/__tests__/stats.test.ts
```

## Architecture

A Next.js 16 (App Router) web app that evaluates Bitcoin open-source contributors for grant funding. Users log in via GitHub OAuth, search for a developer, view their contribution data aggregated from the GitHub API, and optionally save a snapshot to Supabase.

**Data flow:**
1. Client hooks (`src/hooks/`) call internal API routes via SWR / SWRInfinite
2. API routes (`src/app/api/`) authenticate with `auth()`, check Upstash Redis cache, then hit GitHub GraphQL/REST APIs
3. Contribution data is classified against a curated Bitcoin repo list + keyword matching (`src/lib/bitcoin-repos.ts`)
4. Optional snapshot persistence writes to Supabase (`src/lib/supabase.ts`)

**Source layout:**
- `src/app/` — Pages and API routes (App Router). Pages: login (`/`), dashboard (`/dashboard`), developer overview (`/developer/[username]`)
- `src/components/` — React components; `ui/` holds shadcn/ui primitives
- `src/hooks/` — SWR data-fetching hooks; each maps to one API route
- `src/lib/` — Shared logic: GitHub API clients, caching, Supabase client, types, stats aggregation

**Key API routes:**
- `GET /api/github/overview/[username]` — profile + contribution calendar (cached 1 hr)
- `GET /api/github/contributions/[username]` — paginated PRs/reviews/issues (cached 10 min)
- `GET /api/github/rate-limit` — GitHub API rate limit status
- `POST /api/developers/save` — persist developer snapshot to Supabase

## Required Patterns

**Every API route must authenticate:**
```ts
const session = await auth();
if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

**Async route params (Next.js 15+ requirement):**
```ts
export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
```

**Cache key format:**
```ts
`overview:2:${username.toLowerCase()}`
`contributions:${username.toLowerCase()}:tab=${tab}:page=${page}:from=${from ?? ""}:...`
```
Always normalize usernames to lowercase for cache keys and DB queries. Cache TTL values are in **seconds**.

**Imports:** Always use the `@/*` alias — no relative imports.

## Environment Variables

```
AUTH_SECRET               # openssl rand -base64 32
AUTH_GITHUB_ID            # GitHub OAuth App client ID
AUTH_GITHUB_SECRET        # GitHub OAuth App secret
AUTH_URL                  # Public URL (e.g. http://localhost:3000)
UPSTASH_REDIS_REST_URL    # Optional — caching; app degrades gracefully without it
UPSTASH_REDIS_REST_TOKEN  # Optional
SUPABASE_URL              # Required for snapshot save
SUPABASE_SERVICE_ROLE_KEY # Required for snapshot save (server-side only)
DEBUG_CONSOLE             # Set to "TRUE" for verbose GitHub API logs
```

## Tech Stack

- **Runtime:** Node 20, TypeScript 5 (strict mode)
- **Framework:** Next.js 16 App Router, React 19
- **Auth:** next-auth v5 beta (GitHub OAuth provider)
- **Styling:** Tailwind CSS v4, shadcn/ui, Base UI 1.2, Lucide icons
- **Data fetching (client):** SWR / SWRInfinite with typed error objects (`OverviewError`, `ContributionsError`)
- **Charts:** Recharts (contribution timeline), custom heatmap component
- **Cache:** Upstash Redis (REST API, optional)
- **Database:** Supabase (PostgreSQL, server-side service role client)
- **Testing:** Vitest + jsdom + @testing-library/react
- **CI/CD:** GitHub Actions → Netlify (`@netlify/plugin-nextjs`)

## Bitcoin Repo Classification

`src/lib/bitcoin-repos.ts` classifies repos into `core | ecosystem | adjacent` tiers using two layers:
1. Curated list from `config/bitcoin-repos.json`
2. Keyword matching (word boundaries) on repo description/topics

## Testing Conventions

Tests live in `__tests__/` subdirectories colocated with the source they test. Common mocks:
- `auth` returns a mock session or `null` (unauthenticated tests)
- `getCached` / `setCache` mocked to return value or `null` (cache miss)
- Supabase client's `insert` method mocked directly

## Supabase Schema

Two tables:
- `developer_snapshots` — one row per save; stores `username`, `program_entry_date`, `total_contributions`, `lines_added`, `lines_deleted`, `profile_json` (full `DeveloperOverview` JSONB), `saved_at`
- `snapshot_bitcoin_repos` — junction table linking a snapshot to its classified repos (columns: `snapshot_id`, `repo_name`, `tier`)
