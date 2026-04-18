---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-04-17'
inputDocuments: ['README.md', '_bmad-output/project-context.md']
workflowType: 'architecture'
project_name: 'github-developer-review'
user_name: 'Ifuensan'
date: '2026-04-17'
outputTarget: 'docs/architecture.md'
engagementType: 'brownfield-document-and-improve'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Engagement Context

**Type:** Brownfield — existing production system
**Mode:** Document-first, then improve. No rewrites.

**Objectives:**
1. Faithful as-is capture — if something is wrong, document it as-is with a "Technical Debt" marker
2. Prioritized incremental improvement roadmap — observable problem → effort (S/M/L) → benefit → reversibility

**Improvement entry criteria:**
- Observable problem (bug, security risk, DX friction, infra cost, debt blocking features)
- Effort estimate: S (<1d) / M (1-3d) / L (1w+)
- Concrete benefit
- Reversible or not

**Technology bias:** Boring technology preferred. No new dependencies unless Next.js App Router primitives are insufficient. No router migration.

**Output target:** `docs/architecture.md` — two blocks: `## As-Is Architecture` + `## Proposed Improvements`

### Requirements Overview

**Functional Requirements:**
- GitHub OAuth authentication — gate for all functionality
- Developer search by username with recent searches (localStorage)
- Developer overview: profile, contribution stats, annual heatmap, monthly timeline
- Bitcoin repo classification: core / ecosystem / adjacent tiers
- Top projects breakdown with contribution counts
- Contribution drill-down: PRs, Reviews, Issues with filters (date, project, status, tier)
- Responsive UI: table (desktop), cards (mobile), paginated "Load more"
- GitHub API rate limit display with retry guidance

**Non-Functional Requirements:**
- Rate limit handling: graceful degradation, user-visible countdown via resetAt
- Server-side caching (Upstash Redis, 10 min TTL) with silent fallback
- Auth required on all data access; accessToken never exposed to client
- Netlify deployment (no Vercel edge runtime)
- CI: type check → lint → build → test on every PR to main

**Scale & Complexity:**
- Medium complexity full-stack web app (Next.js App Router)
- No persistent database — stateless except optional Redis cache
- Single-user per session, no multi-tenancy, no real-time features
- Read-only GitHub API consumer (REST + GraphQL)

### Technical Constraints & Dependencies

- GitHub API rate limits (5,000 req/hr authenticated) — primary caching driver
- next-auth v5 beta: custom auth() API, session.accessToken shape is non-standard
- Netlify: no Vercel-specific APIs or edge runtime
- Redis is optional: graceful fallback to uncached calls required
- GitHub REST Search API for drill-down; GraphQL for overview data

### Cross-Cutting Concerns

1. **Authentication** — session.accessToken check on every API route
2. **Rate limiting** — RateLimitError with resetAt must propagate through all GitHub calls
3. **Caching** — getCached/setCache wraps all server-side fetches
4. **Bitcoin repo classification** — RelevanceTier affects API, filtering, display, and type layers
5. **Input validation** — GITHUB_USERNAME_RE at all username entry points
6. **Type safety** — TypeScript strict, all GitHub API responses explicitly typed

## Foundation: Established Technology Decisions

**Status:** Project already initialized and in production. These decisions are locked unless explicitly flagged as technical debt.

### Runtime & Language
- **Next.js 16.2.1** — App Router, no pages directory
- **React 19.2.3** — concurrent features available
- **TypeScript 5** — strict mode, `bundler` module resolution, `@/*` path alias
- **Node.js 20** — CI and runtime target

### Styling
- **Tailwind CSS v4** — PostCSS plugin, config-in-CSS via `@theme` (no `tailwind.config.js`)
- **shadcn/ui 4.0.5** — component primitives in `src/components/ui/`, CLI-managed
- **Base UI 1.2.0** — low-level primitives alongside shadcn
- **tw-animate-css** — animation utilities, no Framer Motion

### Authentication
- **next-auth v5.0.0-beta.30** — GitHub OAuth provider
- ⚠️ **Technical Debt:** Beta dependency in production. v5 stable not yet released at time of build. API differs significantly from v4; upgrade path exists but requires migration.

### Data Fetching & State
- **SWR 2.4.1** — client-side data fetching with caching
- No global state manager — React state + SWR covers all needs
- No tRPC, no React Query — SWR is the single client-side data layer

### Server-Side Caching
- **@upstash/redis 1.34.0** — optional; graceful fallback when unavailable
- Cache TTL: 600s (10 min) standard across all routes

### Testing
- **Vitest 4.0.18** + **jsdom** + **@testing-library/react 16.3.2**
- Setup: `src/test/setup.ts` with jest-dom matchers
- No E2E tests (Playwright/Cypress) — unit/integration only

### Charts
- **Recharts 3.8.0** — contribution timeline and heatmap visualizations

### Deployment
- **Netlify** via `@netlify/plugin-nextjs 5.9.0`
- CI: GitHub Actions — type check → lint → build → test on PRs to `main`

### Build Tooling
- `eslint 9` + `eslint-config-next 16.1.6`
- `@tailwindcss/postcss v4` for CSS processing
- No Prettier configured (potential DX gap — see Proposed Improvements)

## Core Architectural Decisions

### Data Architecture

**Storage:** Stateless — no persistent database. Only server-side cache (Redis).
- **Cache:** Upstash Redis via `@upstash/redis`, optional with graceful fallback
- **Cache-aside pattern:** check → miss → fetch → store on all API routes
- **TTL divergence:** contributions = 600s (10 min), overview = 3600s (1 hr, `DEFAULT_TTL`)
- **Fallback:** `getCached`/`setCache` wrap all Redis calls in try/catch; null returned on error

⚠️ **Technical Debt — TD-001:** `Redis.fromEnv()` is called at module load level in `cache.ts`. If `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are absent and the SDK throws at instantiation (not at request time), every route importing `cache.ts` fails to load — not just cache calls. Risk level: LOW (README says optional, app appears to handle it), but not verifiably safe without testing cold startup without env vars.

**Bitcoin repo classification:** Two-layer system in `src/lib/bitcoin-repos.ts`
1. Curated lookup: `config/bitcoin-repos.json` keyed by `nameWithOwner`
2. Keyword regex matching: pre-compiled word-boundary regexes at module load, applied to `nameWithOwner + description + topics`
- Tier priority order: `core` → `ecosystem` → `adjacent`
- Returns `null` for non-Bitcoin repos (not shown in classification UI)

### Authentication & Security

**Strategy:** next-auth v5 JWT session — accessToken stored in JWT, forwarded to `session.accessToken`
- Cookie configuration: explicit `httpOnly: true`, `secure: true`, `sameSite: "lax"` on all auth cookies
- `trustHost: true` — required for Netlify deployment (non-Vercel host)
- GitHub provider with `checks: ["state"]` CSRF protection

⚠️ **Technical Debt — TD-002 (CRITICAL): Middleware not wired up.**
`src/proxy.ts` implements a complete middleware with auth redirect logic and matcher config, but **`src/middleware.ts` does not exist**. The proxy function runs only in tests — it is dead code in production.
- **Actual auth protection in production:** per-page `auth()` + `redirect("/")` (pages), per-route `auth()` + `NextResponse.json(401)` (API routes)
- **Risk:** Any new page or route added without an `auth()` check is unprotected — no safety net
- **Additional inconsistency:** If `src/middleware.ts` were created to export `proxy`, it would incorrectly redirect API calls to `/` (HTML redirect) instead of returning JSON 401 — the proxy and route handlers have different semantics for API paths

### API & Communication Patterns

**Design:** REST GET-only, Next.js App Router route handlers
- No mutations — purely a read-only GitHub API consumer
- 5 routes: `auth`, `overview/[username]`, `contributions/[username]`, `pr-detail/[owner]/[repo]/[number]`, `rate-limit`
- Consistent error envelope: `{ error: string, resetAt?: number }`
- HTTP status convention: 400 bad input, 401 unauth, 404 not found, 429 rate limited, 502 upstream failure

**Two GitHub data sources (intentional split):**
- **GraphQL** (`github-graphql.ts`): overview data — profile, contribution calendar, yearly aggregates
  - Batches year ranges with custom concurrency limiter (max 3 concurrent, no `p-limit` dep)
- **REST Search API** (`github-rest.ts`, `github-search.ts`): drill-down — paginated PRs/issues/reviews
  - `githubFetch` wrapper: pre-flight rate limit check, retry up to 3× with backoff, max 60s wait cap

⚠️ **Technical Debt — TD-003: In-memory rate limit state in serverless.**
`rateLimitStates` in `github-search.ts` is a module-level `Map`. In Netlify's serverless environment, each function invocation may be a new process — the rate limit state resets on cold starts. Pre-flight checks are therefore unreliable in production; only the reactive 403 retry path actually protects against rate limit errors.

### Frontend Architecture

**Rendering model:** Hybrid — RSC pages + client components
- Pages (`src/app/*/page.tsx`): React Server Components, call `auth()` server-side, render client component trees
- Components (`src/components/`): `"use client"` where needed, SWR for data fetching

**Client-side data fetching:** SWR with per-hook fetchers
- `revalidateOnFocus: false` across all hooks — no refetch on tab switch
- `dedupingInterval: 600_000` (10 min) on overview — matches server cache TTL
- Structured error type `OverviewError` (`{ status, message, resetAt? }`) surfaced to UI

**State management:** None — React local state + SWR only. No Zustand, Redux, or Context for data.

**Overview data fetch optimization:** Two-phase fetch in `overview` route
1. Fetch last year first to get real `createdAt`
2. If account older than 1 year, re-fetch full history from `createdAt`
— Avoids unnecessary full-history fetch for recent accounts

### Infrastructure & Deployment

**Platform:** Netlify via `@netlify/plugin-nextjs 5.9.0`
- No Vercel edge runtime, no `@vercel/*` packages
- `ci.yml`: GitHub Actions on PRs to `main` — type check → lint → build → test

**Environment:** All secrets via env vars. No secrets in code.
- Required: `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_URL`
- Optional: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `DEBUG_CONSOLE`

⚠️ **Technical Debt — TD-004: `console.error` in production cache module.**
`cache.ts` uses `console.error` directly for cache failures. Not controlled by `DEBUG_CONSOLE` env var pattern used elsewhere. Will always emit in production logs on cache misses.

### Technical Debt Registry

| ID | Severity | Description | Effort | Reversible |
|----|----------|-------------|--------|------------|
| TD-001 | LOW | `Redis.fromEnv()` at module load — unclear failure mode on missing env vars | S | Yes |
| TD-002 | HIGH | `src/proxy.ts` middleware never wired up — no centralized auth guard, dead code with tests | M | Yes |
| TD-003 | MEDIUM | In-memory rate limit state doesn't persist across serverless invocations | M | Yes |
| TD-004 | LOW | `console.error` in `cache.ts` not controlled by `DEBUG_CONSOLE` pattern | S | Yes |

## Implementation Patterns & Consistency Rules

### API Route Pattern

Every route handler follows this exact sequence — no variation:

```ts
// 1. Auth check — always first
const session = await auth();
if (!session?.accessToken) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// 2. Await params (Next.js 15+ Promise)
const { username } = await params;

// 3. Input validation
if (!GITHUB_USERNAME_RE.test(username)) {
  return NextResponse.json({ error: "Invalid GitHub username" }, { status: 400 });
}

// 4. Cache check
const cacheKey = `entity:${id}:field=${value}`;
const cached = await getCached<Type>(cacheKey);
if (cached) return NextResponse.json(cached);

// 5. Fetch → catch → cache → return
try {
  const result = await fetchData(...);
  await setCache(cacheKey, result, TTL_SECONDS);
  return NextResponse.json(result);
} catch (error) {
  if (error instanceof RateLimitError) {
    return NextResponse.json({ error: "Rate limit exceeded", resetAt: error.resetAt }, { status: 429 });
  }
  return NextResponse.json({ error: "GitHub API error" }, { status: 502 });
}
```

### Error Response Format

All API errors return `{ error: string }`. Rate limit errors also include `resetAt: number` (ms timestamp).
- Never return raw error messages or stack traces
- HTTP status codes strictly: 400 / 401 / 404 / 429 / 502

### Cache Key Convention

Labeled segments, never positional:
```ts
// CORRECT
`contributions:${username.toLowerCase()}:tab=${tab}:page=${page}:from=${from ?? ""}:to=${to ?? ""}`

// WRONG — positional causes collisions
`contributions:${username}:${tab}:${page}`
```
- Always lowercase the primary identifier (username)
- Empty optional params use `""` not `"undefined"`

### GitHub Fetch Pattern

All GitHub REST calls go through `githubFetch()` from `@/lib/github-search` — never raw `fetch()`.
GraphQL calls use `fetchContributions()` / `fetchAllContributions()` from `@/lib/github-graphql`.
No mixing: REST data source for drill-down, GraphQL for overview.

### SWR Hook Pattern

```ts
"use client";
export function useXxx(param: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<DataType, ErrorType>(
    param ? `/api/github/endpoint/${param}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  return { data, error, isLoading, mutate };
}
```
- `null` key when param is absent — disables fetch without conditional hook
- `revalidateOnFocus: false` on all hooks — no silent background refetches
- Typed error object, not raw `Error`

### Component Boundaries

- Page files (`src/app/**/page.tsx`): RSC, async, call `auth()`, render one top-level client component
- Feature components (`src/components/*.tsx`): `"use client"`, contain hooks and UI logic
- UI primitives (`src/components/ui/*.tsx`): shadcn-managed, no custom logic, regenerate via CLI
- No data fetching in RSC pages beyond auth check — delegate to client components + SWR

### Classification Pattern

Bitcoin repo classification always goes through `classifyRepo()` / `classifyRepos()` from `@/lib/bitcoin-repos`.
Never implement classification logic inline in components or routes.
`RelevanceTier` = `"core" | "ecosystem" | "adjacent"` — never use raw strings.

### Loading & Error States

- Skeleton components in `src/components/Skeletons.tsx` — use these, don't create new ad-hoc spinners
- `ErrorBanner` component for user-facing errors — pass `error.message` and optional `resetAt`
- `EmptyState` for zero-result scenarios

### Process Patterns: Error Handling

```ts
// Client hooks: typed error object
type XxxError = { status: number; message: string; resetAt?: number };

// Route handlers: always catch RateLimitError first, then generic Error
} catch (error) {
  if (error instanceof RateLimitError) { ... }    // 429
  if (error instanceof Error && /pattern/.test(error.message)) { ... }  // specific 4xx
  return NextResponse.json({ error: "GitHub API error" }, { status: 502 }); // fallback
}
```

### All AI Agents MUST

- Follow the 5-step API route sequence above without shortcuts
- Use labeled cache key segments
- Route all GitHub API calls through the existing fetch wrappers
- Never expose `session.accessToken` outside of server-side code
- Never add `console.log` — use `DEBUG_CONSOLE` pattern
- Use `cn()` for all className composition
- Add auth check to every new page and API route (middleware not active — no safety net)

## Project Structure & Boundaries

### Complete Project Directory Structure

```
github-developer-review/
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
├── components.json                    # shadcn/ui config
├── netlify.toml                       # Netlify build config
├── .env.local                         # (gitignored) runtime secrets
├── .github/
│   └── workflows/
│       └── ci.yml                     # type check → lint → build → test
├── config/
│   └── bitcoin-repos.json             # curated repo list + keyword tiers
├── src/
│   ├── app/
│   │   ├── globals.css                # Tailwind v4 @theme config
│   │   ├── layout.tsx                 # Root layout: fonts, Providers, DebugAuth
│   │   ├── page.tsx                   # Login / landing page (public)
│   │   ├── providers.tsx              # SessionProvider wrapper
│   │   ├── dashboard/
│   │   │   └── page.tsx               # RSC: auth guard → DashboardContent
│   │   ├── developer/
│   │   │   └── [username]/
│   │   │       └── page.tsx           # RSC: auth guard → DeveloperOverviewPage
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts       # next-auth handlers
│   │       └── github/
│   │           ├── overview/
│   │           │   └── [username]/
│   │           │       └── route.ts   # GraphQL overview + classification + LOC
│   │           ├── contributions/
│   │           │   └── [username]/
│   │           │       └── route.ts   # REST drill-down: PRs/reviews/issues
│   │           ├── pr-detail/
│   │           │   └── [owner]/[repo]/[number]/
│   │           │       └── route.ts   # REST PR detail: additions/deletions/reviews
│   │           └── rate-limit/
│   │               └── route.ts       # GitHub rate limit passthrough
│   ├── components/
│   │   ├── ui/                        # shadcn primitives (CLI-managed)
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── table.tsx
│   │   │   └── tabs.tsx
│   │   ├── __tests__/                 # Component unit tests
│   │   │   └── [12 test files]
│   │   ├── DashboardContent.tsx       # Username search + recent searches
│   │   ├── DeveloperOverviewPage.tsx  # Root client component for developer view
│   │   ├── ProfileCard.tsx
│   │   ├── StatsGrid.tsx
│   │   ├── ContributionHeatmap.tsx
│   │   ├── ContributionTimeline.tsx
│   │   ├── ContributionTimelineChart.tsx
│   │   ├── TopProjects.tsx
│   │   ├── ContributionDrillDown.tsx
│   │   ├── ContributionFilters.tsx
│   │   ├── ContributionTable.tsx
│   │   ├── ContributionCard.tsx
│   │   ├── ExpandedPRDetail.tsx
│   │   ├── DateFilterBar.tsx
│   │   ├── MobileFilterSheet.tsx
│   │   ├── RateLimitBadge.tsx
│   │   ├── ErrorBanner.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Skeletons.tsx
│   │   └── DebugAuth.tsx
│   ├── hooks/
│   │   ├── __tests__/
│   │   ├── use-overview.ts
│   │   ├── use-contributions.ts
│   │   ├── use-pr-detail.ts
│   │   ├── use-contribution-filters.ts
│   │   ├── use-rate-limit.ts
│   │   └── use-recent-searches.ts
│   ├── lib/
│   │   ├── __tests__/
│   │   ├── auth.ts                    # next-auth config + session type augmentation
│   │   ├── cache.ts                   # Upstash Redis get/set with fallback
│   │   ├── bitcoin-repos.ts           # Two-layer classification engine
│   │   ├── date-utils.ts              # Date range presets + year range generation
│   │   ├── github-graphql.ts          # GraphQL fetch + year-range batching
│   │   ├── github-rest.ts             # Paginated REST drill-down fetch
│   │   ├── github-search.ts           # githubFetch wrapper + rate limit tracking
│   │   ├── github-stats.ts            # Lines of code fetch
│   │   ├── stats.ts                   # Contribution aggregation utilities
│   │   ├── types.ts                   # All shared TypeScript types
│   │   └── utils.ts                   # cn(), GITHUB_USERNAME_RE, stateColors
│   ├── proxy.ts                       # ⚠️ TD-002: Middleware logic — NOT wired up
│   ├── __tests__/
│   │   └── proxy.test.ts
│   └── test/
│       └── setup.ts
└── public/
```

### Architectural Boundaries

**Auth boundary:** `src/lib/auth.ts` — single source of truth. All server code calls `auth()` from here only.

**GitHub data boundary:** `github-graphql.ts` + `github-search.ts` + `github-rest.ts` — only these call GitHub APIs. Route handlers orchestrate; components never call GitHub directly.

**Classification boundary:** `src/lib/bitcoin-repos.ts` + `config/bitcoin-repos.json` — sole owner of repo tier logic.

**Cache boundary:** `src/lib/cache.ts` — all Redis access via `getCached`/`setCache`. No direct `@upstash/redis` imports elsewhere.

**Type boundary:** `src/lib/types.ts` — all shared types. No duplicated type definitions across files.

### Data Flow

```
Browser → SWR hook → /api/github/* route → auth() check
                                          → getCached()  → [hit]  → NextResponse.json()
                                          → GitHub API   → [miss] → setCache()
                                                         → classifyRepos()  (overview only)
                                                         → fetchLinesOfCode() (overview only)
                                                                   → NextResponse.json()
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices compatible and running in production. React 19 + Next.js 16 App Router + TypeScript 5 strict + Tailwind v4 co-exist without conflict. next-auth v5 beta is the sole non-stable dependency — risk accepted, flagged as TD.

**Pattern Consistency:** All implementation patterns are derived from observed codebase behaviour, not invented. No contradictions between decisions and patterns.

**Structure Alignment:** Project structure reflects the actual deployed codebase. Module boundaries (auth, cache, GitHub data, classification, types) are enforced by import discipline.

### Requirements Coverage ✅

| Requirement | Support |
|---|---|
| GitHub OAuth | `auth.ts` + next-auth v5 |
| Developer search + recent searches | `DashboardContent` + `use-recent-searches` (localStorage) |
| Overview: profile, stats, heatmap, timeline | `DeveloperOverviewPage` + `overview` route + GraphQL |
| Bitcoin repo classification | `bitcoin-repos.ts` + `config/bitcoin-repos.json` |
| Drill-down: PRs, reviews, issues + filters + pagination | `contributions` route + `ContributionDrillDown` + `use-contribution-filters` |
| Responsive table/card layout | `ContributionTable` + `ContributionCard` + `MobileFilterSheet` |
| Rate limit awareness UI | `RateLimitBadge` + `use-rate-limit` + `RateLimitError` |
| Netlify deployment | `@netlify/plugin-nextjs` + `netlify.toml` |
| CI | `.github/workflows/ci.yml` |

### Gap Analysis

**Implementation risk gaps:**
- TD-002 — No middleware safety net. Every new page/route requires manual auth check.
- TD-003 — Rate limit pre-flight state unreliable on serverless cold starts.

**Coverage gaps:**
- No E2E / integration tests — full request flows are not verified by the test suite
- No `.env.example` committed — required vars must be inferred from README

### Architecture Completeness Checklist

- [x] Engagement context — brownfield, as-is, incremental improvement mode
- [x] Requirements analysis — scope, constraints, cross-cutting concerns
- [x] Foundation decisions — all locked technology choices documented
- [x] Core architectural decisions — data, auth, API, frontend, infra
- [x] Technical debt registry — TD-001 through TD-004 with severity/effort/reversibility
- [x] Implementation patterns — 5-step route, cache keys, SWR, component boundaries
- [x] Project structure — complete file tree with boundary annotations
- [x] Data flow — end-to-end request path documented
- [x] Validation complete

### Architecture Readiness Assessment

**Overall Status:** READY — as-is architecture fully documented. Technical debt captured, not hidden.

**Confidence:** High for as-is capture. TD-002 is the one item where production behaviour differs from design intent.

**Strengths:**
- Clean boundary discipline — auth, cache, GitHub data, types each owned by one module
- Consistent error propagation — `RateLimitError` → 429 with `resetAt` throughout
- Graceful Redis fallback — no hard dependency on cache availability
- Zero unnecessary dependencies — boring technology bias already in practice

**Proposed Improvements (prioritised):**
- P1 (HIGH, M, reversible): Fix + wire middleware — TD-002
- P2 (MEDIUM, M, reversible): Persist rate limit state in Redis — TD-003
- P3 (LOW, S, reversible): Guard `Redis.fromEnv()` startup — TD-001
- P4 (LOW, S, reversible): Align `cache.ts` logging with `DEBUG_CONSOLE` — TD-004
- P5 (LOW, S, reversible): Add Prettier for formatting enforcement
- P6 (LOW, S, reversible): Add `.env.example` to repo
