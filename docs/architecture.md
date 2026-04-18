# Architecture — github-developer-review

> **Brownfield document.** Captures the system as-is, faithfully. Technical debt is marked explicitly, not hidden.
> Last updated: 2026-04-18

---

## Documentation Conventions

This project uses two parallel documentation frameworks with distinct roles:

**BMAD** (`docs/`, `_bmad-output/`)
- `docs/architecture.md` — living architecture: as-is capture, technical debt registry, improvement roadmap
- `_bmad-output/project-context.md` — agent rules file; read by AI agents before touching the codebase
- `_bmad-output/planning-artifacts/` — epics, stories, sprint plans for feature execution

**openspec** (`openspec/`)
- `openspec/specs/` — formal ADRs and persistent technical specs (e.g., `netlify-deployment`, `upstash-cache`)
- `openspec/changes/` — active changes with proposal + design + tasks for large, well-scoped initiatives
- `openspec/changes/archive/` — completed changes; source of truth for past decisions

**Archived changes:**
- `openspec/changes/archive/2026-04-17-migrate-vercel-to-netlify/` — migration from Vercel to Netlify + Upstash cache introduction

**Active changes:**
- `openspec/changes/add-lines-of-code-stats/` — in-progress
- `openspec/changes/persist-developer-profiles/` — designed, pending implementation

**Rule of thumb:** use openspec for a change when it needs a formal proposal/design review before implementation. Use BMAD for ongoing execution, agent context, and the living architecture record.

---

## As-Is Architecture

### Overview

**Purpose:** Web app to evaluate Bitcoin open-source contributors for grant funding. Read-only GitHub API consumer — no write operations.

**Deployment:** Netlify via `@netlify/plugin-nextjs`. Optional Redis cache. Persistent storage via Supabase (planned — see `openspec/changes/persist-developer-profiles/`).

---

### Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js App Router | 16.2.1 |
| UI runtime | React | 19.2.3 |
| Language | TypeScript strict | 5.x |
| Styling | Tailwind CSS v4 + shadcn/ui | 4.x / 4.0.5 |
| Auth | next-auth GitHub OAuth ⚠️ beta | 5.0.0-beta.30 |
| Cache | Upstash Redis (optional) | 1.34.0 |
| Persistence | Supabase (PostgreSQL) ⏳ planned | — |
| Client data | SWR | 2.4.1 |
| Charts | Recharts | 3.8.0 |
| Tests | Vitest + jsdom + Testing Library | 4.0.18 |
| Deployment | Netlify + @netlify/plugin-nextjs | 5.9.0 |
| CI | GitHub Actions | Node 20 |

> ⚠️ `next-auth v5.0.0-beta.30` is a beta dependency running in production on the auth layer. Stable v5 exists with the same API surface — upgrade is expected to be a version bump with no code changes. See **P7**.

---

### Project Structure

```
github-developer-review/
├── config/
│   └── bitcoin-repos.json             # curated repo list + keyword tiers
├── docs/
│   └── architecture.md                # this file
├── src/
│   ├── app/
│   │   ├── globals.css                # Tailwind v4 @theme config
│   │   ├── layout.tsx                 # Root layout: fonts, Providers, DebugAuth
│   │   ├── page.tsx                   # Login / landing (public)
│   │   ├── providers.tsx              # SessionProvider wrapper
│   │   ├── dashboard/page.tsx         # RSC: auth guard → DashboardContent
│   │   ├── developer/[username]/page.tsx  # RSC: auth guard → DeveloperOverviewPage
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── github/
│   │           ├── overview/[username]/route.ts
│   │           ├── contributions/[username]/route.ts
│   │           ├── pr-detail/[owner]/[repo]/[number]/route.ts
│   │           └── rate-limit/route.ts
│   ├── components/
│   │   ├── ui/                        # shadcn primitives — CLI-managed, do not hand-edit
│   │   └── *.tsx                      # Feature components (all "use client")
│   ├── hooks/
│   │   └── use-*.ts                   # SWR data hooks + filter/search state
│   ├── lib/
│   │   ├── auth.ts                    # next-auth config + session type augmentation
│   │   ├── cache.ts                   # Upstash Redis get/set with graceful fallback
│   │   ├── bitcoin-repos.ts           # Two-layer classification engine
│   │   ├── github-graphql.ts          # GraphQL: overview, calendar, year-range batching
│   │   ├── github-search.ts           # githubFetch wrapper + in-memory rate limit state
│   │   ├── github-rest.ts             # REST: paginated drill-down (PRs/issues/reviews)
│   │   ├── github-stats.ts            # Lines of code fetch (lifetime, REPO_CAP=20)
│   │   ├── types.ts                   # All shared TypeScript types
│   │   └── utils.ts                   # cn(), GITHUB_USERNAME_RE, stateColors
│   └── proxy.ts                       # ⚠️ TD-002: Middleware logic — NOT wired up
└── .github/workflows/ci.yml           # type check → lint → build → test
```

---

### Module Boundaries

| Boundary | Owner | Rule |
|---|---|---|
| Auth | `src/lib/auth.ts` | Only module importing from `next-auth`. All server code calls `auth()` from here. |
| GitHub API | `github-graphql.ts`, `github-search.ts`, `github-rest.ts` | Only these three call GitHub APIs. Route handlers orchestrate; components never call GitHub. |
| Classification | `bitcoin-repos.ts` + `config/bitcoin-repos.json` | Sole owner of repo tier logic. Never inline classification in components or routes. |
| Cache | `cache.ts` | All Redis access via `getCached`/`setCache`. No direct `@upstash/redis` imports elsewhere. |
| Persistence ⏳ | `supabase.ts` (planned) | All Supabase access via a single server-side client exported from this module. |
| Types | `types.ts` | All shared types live here. No duplicate type definitions across files. |

---

### Data Flow

```
Browser
  └─ SWR hook (/api/github/*)
       └─ Route handler
            ├─ auth() → 401 if no session.accessToken
            ├─ Input validation (GITHUB_USERNAME_RE)
            ├─ getCached(key) → [hit] → return JSON
            └─ GitHub API fetch
                 ├─ classifyRepos()       (overview only)
                 ├─ fetchLinesOfCode()    (overview only)
                 └─ setCache(key, result, ttl) → return JSON
```

---

### Authentication

**Strategy:** next-auth v5 JWT session. GitHub OAuth provider with `checks: ["state"]`.

- `session.accessToken` holds the GitHub OAuth token — stored in JWT, forwarded to session
- All cookies: `httpOnly: true`, `secure: true`, `sameSite: "lax"`
- `trustHost: true` required for Netlify (non-Vercel host)

**In production, auth protection is per-resource:**
- Pages: `auth()` + `redirect("/")` in each RSC page
- API routes: `auth()` + `NextResponse.json(401)` in each handler

> ⚠️ **TD-002:** `src/proxy.ts` implements middleware with auth redirect logic but `src/middleware.ts` does not exist — the middleware never runs. See Proposed Improvements.

---

### Caching

**Provider:** Upstash Redis (`@upstash/redis`). Optional — app degrades gracefully to uncached calls.

| Cache | Key pattern | TTL |
|---|---|---|
| Developer overview | `overview:{username}` | 3600s (1 hr) |
| Contributions drill-down | `contributions:{username}:tab={tab}:page={page}:from={from}:to={to}:project={project}:status={status}` | 600s (10 min) |

**Key rule:** Always use labeled `field=value` segments — never positional. Empty optional params serialize as `""`.

> ⚠️ **TD-001:** `Redis.fromEnv()` is called at module load. If env vars are absent and the SDK throws at instantiation, all routes importing `cache.ts` fail to load. Risk: LOW (app appears to handle it), but not verified on cold start without env vars.

---

### GitHub API Layer

**Two data sources — intentional split:**

| Source | Module | Used for |
|---|---|---|
| GraphQL API | `github-graphql.ts` | Overview: profile, contribution calendar, yearly aggregates, repo metadata |
| REST Search API | `github-rest.ts` via `github-search.ts` | Drill-down: paginated PRs, issues, reviews |

**`githubFetch()` wrapper** (`github-search.ts`):
- Pre-flight rate limit check (remaining < 5 threshold)
- Retry up to 3× on 403, max 60s wait cap
- Throws `RateLimitError(message, resetAt)` when retries exhausted

**GraphQL batching** (`github-graphql.ts`):
- Splits full account history into year ranges
- Custom `mapWithConcurrency` limiter (max 3 concurrent, no `p-limit` dep)

> ⚠️ **TD-003:** `rateLimitStates` is a module-level `Map` in `github-search.ts`. In Netlify's serverless environment, state resets on cold starts. Pre-flight checks are unreliable — only the reactive 403 retry path reliably prevents rate limit failures.

---

### Lines Written — Design Decision

`linesAdded` is a **lifetime stat** computed via `GET /repos/{owner}/{repo}/stats/contributors` (all weeks, no date filter). All other header stats (Commits, PRs, Reviews, Issues) are also lifetime from account creation date — the header is consistently lifetime. The date filter only affects the drill-down table below the header.

**Chosen approach (Option A):** Keep lifetime, surface it clearly in the UI with a label or tooltip — e.g. `"Lines written (lifetime)"`. Alternatives evaluated: filter by account creation date (Option B, S effort) or respect the date filter (Option C, M effort). Option A selected as appropriate for grant evaluation context where career total is the relevant signal.

**Known limitation:** Capped at top-20 repos by contribution count (`REPO_CAP = 20`) — may undercount prolific contributors spread across many repos.

---

### Persistence Layer ⏳ (planned)

> Full design: `openspec/changes/persist-developer-profiles/design.md`

**Provider:** Supabase (PostgreSQL). Server-side only via `SUPABASE_SERVICE_ROLE_KEY` — never exposed to the client.

**Purpose:** Append-only snapshots of `DeveloperOverview` for B4OS program tracking. Each save creates a new row; old snapshots are never overwritten, enabling evolution tracking over time.

**New env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**New API routes:**

| Route | Method | Description |
|---|---|---|
| `/api/developers/save` | POST | Persists a snapshot for a given username + program entry date |
| `/api/developers/export` | GET | Returns a CSV (row per day per developer) for pivot table analysis |

**New files:**
- `src/lib/supabase.ts` — single Supabase client export (server-side)
- `src/app/api/developers/save/route.ts`
- `src/app/api/developers/export/route.ts`
- `src/components/SaveDeveloperModal.tsx`

**Key design decisions:**
- Save reads from Redis cache, not a new GitHub fetch — instant, no API quota cost
- `program_entry_date` captured at save time (user-provided), correctable in Supabase table editor
- CSV shape: one row per calendar day (from `calendarWeeks`) with lifetime metrics repeated — optimized for Excel pivot tables

---

### Bitcoin Repo Classification

Two-layer system in `src/lib/bitcoin-repos.ts`:

1. **Curated lookup** — `config/bitcoin-repos.json` keyed by `nameWithOwner` → tier
2. **Keyword regex** — word-boundary regexes pre-compiled at module load, applied to `nameWithOwner + description + topics`

Priority: `core` → `ecosystem` → `adjacent`. Returns `null` for non-Bitcoin repos.

`RelevanceTier = "core" | "ecosystem" | "adjacent"` — always use the type, never raw strings.

---

### Implementation Patterns (mandatory for all new code)

**API route sequence — no shortcuts:**
```ts
// 1. Auth
const session = await auth();
if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// 2. Params
const { username } = await params;

// 3. Validate
if (!GITHUB_USERNAME_RE.test(username)) return NextResponse.json({ error: "Invalid GitHub username" }, { status: 400 });

// 4. Cache check
const cacheKey = `entity:${id.toLowerCase()}:field=${value ?? ""}`;
const cached = await getCached<Type>(cacheKey);
if (cached) return NextResponse.json(cached);

// 5. Fetch → cache → return
try {
  const result = await fetchData(...);
  await setCache(cacheKey, result, TTL_SECONDS);
  return NextResponse.json(result);
} catch (error) {
  if (error instanceof RateLimitError)
    return NextResponse.json({ error: "Rate limit exceeded", resetAt: error.resetAt }, { status: 429 });
  return NextResponse.json({ error: "GitHub API error" }, { status: 502 });
}
```

**Component boundary:**
- RSC pages: `auth()` check only → render one top-level client component
- Feature components: `"use client"`, SWR hooks for data
- `src/components/ui/`: shadcn-managed, regenerate via CLI, never hand-edit

**SWR hooks:** `revalidateOnFocus: false` on all. `null` key when param absent. Typed error objects.

**Agents must:**
- Add `auth()` check to every new page and API route (no middleware safety net)
- Use `cn()` for all className composition
- Never expose `session.accessToken` in client code
- Never use `console.log` — use `DEBUG_CONSOLE` env var pattern
- Use labeled cache key segments

---

### Technical Debt Registry

| ID | Severity | Description | Effort | Reversible |
|----|----------|-------------|--------|------------|
| TD-001 | LOW | `Redis.fromEnv()` at module load — unclear failure mode without env vars | S | Yes |
| TD-002 | ~~HIGH~~ ✅ | `src/proxy.ts` middleware wired up via `src/middleware.ts` — resolved 2026-04-18 | M | Yes |
| TD-003 | ~~MEDIUM~~ ✅ | In-memory rate limit Map removed — reactive 403 retry path is the sole mechanism — resolved 2026-04-18 | M | Yes |
| TD-004 | LOW | `console.error` in `cache.ts` not gated by `DEBUG_CONSOLE` | S | Yes |

---

## Proposed Improvements

Ordered by ROI. Each entry: observable problem → effort (S/M/L) → benefit → reversible.

---

### P1 — Wire the middleware (TD-002)

**Problem:** `src/proxy.ts` implements auth redirect logic with tests, but `src/middleware.ts` doesn't exist. Auth protection relies on per-resource guards — any new page or route without an `auth()` check is silently unprotected.

**Additional issue before wiring:** The current `proxy.ts` redirects all unauthenticated paths — including `/api/github/*` — to `/`. This is wrong for API routes, which should return `401 JSON`. The proxy must be fixed to handle API paths separately before `middleware.ts` is created.

**Fix:**
```ts
// src/proxy.ts — update to handle API paths correctly
if (pathname.startsWith("/api/github/")) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
return NextResponse.redirect(new URL("/", request.url));

// src/middleware.ts — new file
export { proxy as middleware, config } from "@/proxy";
```

**Effort:** M  
**Benefit:** Centralized auth guard. New pages/routes are protected by default. Eliminates silent security gaps.  
**Reversible:** Yes — delete `src/middleware.ts` to revert.

---

### P2 — Persist rate limit state across invocations (TD-003)

**Problem:** `rateLimitStates` Map in `github-search.ts` is in-memory and resets on every serverless cold start. Pre-flight rate limit checks are unreliable — only the reactive 403 retry path protects against rate limit errors in production.

**Options:**
- **Option A (recommended):** Remove the pre-flight Map entirely. Accept that the reactive 403 retry path is sufficient — it already works and handles the production case. Simpler, removes dead state.
- **Option B:** Persist rate limit state in Redis with a short TTL (e.g., `ratelimit:{token_hash}`, 60s TTL). Adds Redis write on every request.

**Effort:** M (Option A: S)  
**Benefit (Option A):** Removes misleading code, simplifies `githubFetch`. Retry logic is already correct.  
**Reversible:** Yes.

---

### P3 — Guard Redis startup failure (TD-001)

**Problem:** `Redis.fromEnv()` at module load level. If the Upstash SDK throws on missing env vars at instantiation (not request time), every route importing `cache.ts` fails to load — not just cache calls.

**Fix:**
```ts
// src/lib/cache.ts
let redis: Redis | null = null;
try {
  redis = Redis.fromEnv();
} catch {
  // Cache unavailable — app continues uncached
}

export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try { return await redis.get<T>(key); } catch { return null; }
}
```

**Effort:** S  
**Benefit:** Safe startup without Redis env vars. Makes "optional cache" guarantee unconditional.  
**Reversible:** Yes.

---

### P4 — Align cache logging with DEBUG_CONSOLE (TD-004)

**Problem:** `cache.ts` uses `console.error` directly on cache failures, emitting to production logs unconditionally. The rest of the app uses `DEBUG_CONSOLE=TRUE` to gate debug output.

**Fix:** Wrap cache log output behind the same `DEBUG_CONSOLE` check used in `layout.tsx`:
```ts
if (process.env.DEBUG_CONSOLE === "TRUE") console.error(...);
```

**Effort:** S  
**Benefit:** Clean production logs. Consistent observability pattern across the app.  
**Reversible:** Yes.

---

### P5 — Add Prettier for formatting enforcement

**Problem:** ESLint enforces code correctness but not formatting. No Prettier config — formatting is editor-dependent. Diffs include whitespace noise; style inconsistencies accumulate over time.

**Fix:** Add `prettier` + `eslint-config-prettier` to dev deps. Add `.prettierrc`. Add `format` script to `package.json`. Run once on full codebase.

**Effort:** S  
**Benefit:** Consistent formatting, cleaner diffs, reduced review friction. No runtime impact.  
**Reversible:** Yes — remove config and dep.

---

### P6 — Add `.env.example`

**Problem:** Required environment variables are documented only in `README.md`. No `.env.example` file — new developers must read prose to discover what vars are needed, and may miss entries.

**Fix:** Add `.env.example` to repo root listing all vars with placeholder values and comments.

**Effort:** S  
**Benefit:** Faster onboarding. Standard convention. Zero risk.  
**Reversible:** Yes.

---

### P7 — Upgrade next-auth from beta to stable

**Problem:** `next-auth 5.0.0-beta.30` is running in production on the authentication layer — the highest security-sensitivity component in the stack.

> ⛔ **Blocked — v5 stable does not exist yet.** As of 2026-04-18, `npm show next-auth dist-tags` shows `beta: 5.0.0-beta.31` as the latest v5 — no stable tag. Downgrading to v4 stable (`4.24.14`) would require a full API migration, which introduces more risk than staying on beta. Action: monitor for v5 stable release. When it ships, the upgrade is a version bump with no code changes expected.

**Fix (when v5 stable ships):**
```bash
npm install next-auth@latest  # once 'latest' points to v5 stable
npm run test:run && npm run build
```

**Effort:** S  
**Benefit:** Removes the only non-stable dependency from the stack.  
**Reversible:** Yes — `npm install next-auth@5.0.0-beta.30` to pin back.

---

### Improvement Roadmap Summary

| ID | Priority | Effort | Impact | Reversible |
|----|----------|--------|--------|------------|
| P1 | HIGH | M | Security — closes unprotected route gap | Yes |
| P2 | MEDIUM | S–M | Simplicity — removes misleading pre-flight state | Yes |
| P7 | MEDIUM | S | Security — removes beta auth dependency from production | Yes |
| P3 | LOW | S | Reliability — safe startup without Redis | Yes |
| P4 | LOW | S | Observability — clean production logs | Yes |
| P5 | LOW | S | DX — consistent formatting, cleaner diffs | Yes |
| P6 | MEDIUM | S | DX — faster onboarding | Yes |

> All improvements are incremental and independently deployable. None require stopping the product or migrating data. Start with P1 (security gap) and P7 (beta auth) — both have a security dimension and P7 costs almost nothing.

---

## Planned Features

Fully designed new capabilities, not yet implemented. Each has a complete openspec change artifact.

### F1 — Developer Profile Persistence (B4OS)

**Change:** `openspec/changes/persist-developer-profiles/`  
**Status:** Designed, pending implementation

Save developer profile snapshots to Supabase on demand with a program entry date. Enables evolution tracking (baseline vs. current) and CSV export for Excel pivot table analysis. Key to the B4OS program workflow — answers "how has this developer progressed since they joined?"

See the full design (schema, API routes, UI changes, risks) in the openspec change artifact.
