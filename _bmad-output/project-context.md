---
project_name: 'github-developer-review'
user_name: 'Ifuensan'
date: '2026-04-17'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 47
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- Next.js 16.2.1 — App Router (NOT pages router)
- React 19.2.3
- TypeScript 5 — strict mode enabled
- Tailwind CSS 4 (PostCSS plugin, NOT v3 config format)
- shadcn/ui 4.0.5 + Base UI 1.2.0
- next-auth 5.0.0-beta.30 — GitHub OAuth provider
- @upstash/redis 1.34.0 — server-side caching
- SWR 2.4.1 — client-side data fetching
- Recharts 3.8.0 — charts/visualizations
- Vitest 4.0.18 + jsdom + @testing-library/react 16.3.2
- Netlify deployment via @netlify/plugin-nextjs 5.9.0
- Node.js 20 (CI target)

## Critical Implementation Rules

### Language-Specific Rules

- TypeScript strict mode is ON — no implicit `any`, all types must be explicit
- Use `@/*` path alias for all internal imports (maps to `./src/*`) — never use relative `../../`
- Prefer `interface` for object shapes, `type` for unions/intersections and aliases
- All async route handlers must `await params` — Next.js 15+ params are a `Promise<{...}>`
  ```ts
  const { username } = await params; // CORRECT
  ```
- Use `export class` for domain errors (e.g. `RateLimitError extends Error`) — not plain objects
- `export const` for constants and regex (e.g. `GITHUB_USERNAME_RE`, `AGGREGATED_SENTINEL`)
- No barrel `index.ts` files — import directly from the file
- ESM throughout — `import/export`, never `require()`

### Framework-Specific Rules

**Next.js App Router:**
- All pages/layouts live under `src/app/` — no `pages/` directory
- API routes use `src/app/api/.../route.ts` with named exports (`GET`, `POST`, etc.)
- Every API route checks auth first: `const session = await auth()` — return 401 if `!session?.accessToken`
- Use `NextResponse.json()` for all API responses — never `new Response()`
- Dynamic segments use folder names: `[username]`, `[owner]`, `[repo]`, `[number]`

**next-auth v5 (beta):**
- Import `auth` from `@/lib/auth` — NOT `getServerSession` from `next-auth`
- Session shape: `session.accessToken` holds the GitHub OAuth token
- Do NOT use next-auth v4 patterns — the v5 API is significantly different

**Caching (@upstash/redis):**
- Use `getCached<T>(key)` / `setCache(key, value, ttl)` from `@/lib/cache`
- Cache TTL is in **seconds** (not ms) — standard is 600 (10 min)
- Cache keys use labeled segments to avoid collisions: `entity:field=value:field=value`
  ```ts
  `contributions:${username}:tab=${tab}:page=${page}:from=${from ?? ""}`
  ```

**SWR (client hooks):**
- All data-fetching hooks live in `src/hooks/use-*.ts`
- Hook files named `use-kebab-case.ts`, functions named `useCamelCase`

**UI Components:**
- shadcn/ui primitives live in `src/components/ui/` — do not modify these directly
- Use `cn()` from `@/lib/utils` for all className merging (clsx + tailwind-merge)
- Fonts: Poppins (main sans) + Geist Mono — loaded via `next/font/google`, applied via CSS vars

### Testing Rules

- Test runner: Vitest (not Jest) — use `vi.*` APIs, never `jest.*`
- Environment: jsdom — setup file at `src/test/setup.ts` auto-loads jest-dom matchers
- Tests co-located in `__tests__/` subdirectory next to source: `ComponentName.test.tsx`, `use-hook.test.ts`
- Use `@testing-library/react` for components — no Enzyme, no direct React `render`
- Mock all external calls — `vi.mock()` for `auth()`, cache, and fetch
- CI runs `npx vitest run` — all tests, type check, lint, and build must pass on every PR to `main`

### Code Quality & Style Rules

**Naming:**
- Components: `PascalCase.tsx` | Hooks: `use-kebab-case.ts` | Lib: `kebab-case.ts` | Routes: `route.ts`
- Constants: `SCREAMING_SNAKE_CASE` | One component per file

**Styling:**
- Tailwind v4 — no `tailwind.config.js`, config lives in `globals.css` via `@theme`
- Always use `cn()` for className merging — never string concatenation
- Maintain `dark:` variant classes in all new UI

**Code Style:**
- No comments explaining *what* — only *why* for non-obvious constraints
- No `console.log` — use `DEBUG_CONSOLE` env var pattern
- Page-level components live in `src/components/`, not `src/app/`
- shadcn/ui primitives regenerate via CLI — do not hand-edit `src/components/ui/`

### Development Workflow Rules

- CI: `tsc --noEmit` → `eslint` → `next build` → `vitest run` — all must pass on PRs to `main`
- Deployment: Netlify via `@netlify/plugin-nextjs` — no Vercel-specific APIs or edge runtime
- Required env vars: `AUTH_URL`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `DEBUG_CONSOLE`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

### Critical Don't-Miss Rules

**Auth & Security:**
- NEVER expose `session.accessToken` to the client — all GitHub calls go through Next.js API routes
- Always validate params before use — `GITHUB_USERNAME_RE` for usernames
- Rate limit errors propagate as `RateLimitError` with `resetAt` — return 429 with `{ error, resetAt }`

**API & Data:**
- GitHub REST `state: "closed"` covers both closed issues AND merged PRs — detect merged via `pull_request.merged_at !== null`
- `AGGREGATED_SENTINEL` (`"__github_aggregated__"`) is the repo name for non-per-repo contributions — never silently filter it
- Bitcoin repo tiers: `"core" | "ecosystem" | "adjacent"` (`RelevanceTier` type)

**Caching:**
- Use `field=value` labeled cache key segments — positional segments cause collisions
- Never cache error responses

**Tailwind v4:**
- No `tailwind.config.js` — configuration in `globals.css` via `@theme`
- `tw-animate-css` provides animations — do not install separate animation plugins

---

## Usage Guidelines

**For AI Agents:** Read this file before implementing any code. Follow all rules exactly. When in doubt, prefer the more restrictive option.

**For Humans:** Keep lean and focused on agent needs. Update when stack changes. Review quarterly.

_Last Updated: 2026-04-17_
