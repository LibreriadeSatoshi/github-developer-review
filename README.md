# GitHub Developer Review

Evaluate Bitcoin open-source contributors for grant funding. Sign in with GitHub, search by username, and view contribution stats, heatmaps, project breakdowns, and filterable PRs, reviews, and issues.

## Features

- **GitHub OAuth** — Sign in with GitHub to access the dashboard and developer views.
- **Developer overview** — Profile card, contribution stats, yearly heatmap, and monthly timeline.
- **Bitcoin projects** — Repos classified as core, ecosystem, or adjacent; top projects with contribution counts and a “Load more” list.
- **Contributions drill-down** — Tabs for Pull Requests, Reviews, and Issues; filters by date, project, status, and tier; table (desktop) and cards (mobile) with “Load more” pagination.
- **Recent searches** — Persisted in `localStorage` for quick re-visits from the dashboard.
- **Rate limit awareness** — UI shows GitHub API rate limit status and retry guidance when applicable.

## Tech stack

- **Next.js 16** (App Router), **React 19**
- **NextAuth v5** (GitHub provider)
- **Tailwind CSS v4**, **shadcn/ui**, **Base UI 1.2**
- **SWR** for data fetching; **Upstash Redis** for server-side caching (optional)
- **Supabase** (PostgreSQL) for developer snapshot persistence
- **Recharts** for contribution timeline charts
- **Vitest** + **Testing Library** for tests
- **Netlify** (`@netlify/plugin-nextjs`) for deployment

## Prerequisites

- Node.js 20+
- A [GitHub OAuth App](https://github.com/settings/developers) (Client ID and Client Secret)

For caching (recommended in production):

- An [Upstash Redis](https://upstash.com) database (free tier available). Create one and copy the REST URL and token.

## Environment variables

Create a `.env.local` in the project root:

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | Secret for NextAuth session encryption (e.g. `openssl rand -base64 32`) |
| `AUTH_GITHUB_ID` | Yes | GitHub OAuth App Client ID |
| `AUTH_GITHUB_SECRET` | Yes | GitHub OAuth App Client Secret |
| `AUTH_URL` | Yes | Public URL of the app (e.g. `http://localhost:3000`) |
| `AUTH_GITHUB_ORG` | No | GitHub org slug; only members of this org can log in (omit to allow all GitHub users) |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis REST URL (for server-side cache) |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis REST token |
| `SUPABASE_URL` | Yes* | Supabase project URL (required for snapshot saves) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes* | Supabase service role key — server-side only, never exposed to the client |
| `DEBUG_CONSOLE` | No | Set to `TRUE` for verbose GitHub API logs in the console |

\* Required only if you use the **Save snapshot** feature. Without these, the save route will fail but the rest of the app works normally.

Without the Upstash vars, the app still runs; cache reads/writes will fail and the app will fall back to uncached GitHub API calls.

## Getting started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with GitHub, then use the dashboard to search for a GitHub username and open their developer overview.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once (e.g. in CI) |

## Deploying to Netlify

1. Push the repo to GitHub and connect it to [Netlify](https://app.netlify.com).
2. Netlify auto-detects `netlify.toml`; no extra build config needed.
3. In **Site settings → Environment variables**, add:
   - `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_URL`
   - `AUTH_GITHUB_ORG` (optional, to restrict login to org members)
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (optional, for caching)
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (required for snapshot saves)
   - `DEBUG_CONSOLE` (optional, set to `TRUE` for verbose logs)
4. Trigger a deploy.

## GitHub GraphQL data fetching

All contribution data comes from GitHub's GraphQL API via a single query called once per year-window: `contributionsCollection(from: $from, to: $to)`.

### Date window

- `$from` — the user's GitHub account creation date (`user.createdAt`), obtained from a first lightweight fetch covering the last 12 months.
- `$to` — the current UTC timestamp at request time.

The full history is split into **1-year chunks** by `getYearRanges` (`src/lib/date-utils.ts`) and fetched with up to 3 concurrent requests. Results are merged into a single object.

### What each call reads

| Field | Description |
|---|---|
| `totalCommitContributions` | Total commit count for the window |
| `commitContributionsByRepository` (max 100 repos) | Commit count per repo |
| `issueContributions.totalCount` | Total issues opened |
| `pullRequestContributionsByRepository` (max 100 repos, first 50 PRs each) | PR count per repo + additions/deletions/merged per PR node |
| `pullRequestReviewContributionsByRepository` (max 100 repos) | Review count per repo |
| `contributionCalendar.weeks[].contributionDays` | Daily contribution count + color for the heatmap |

### Line counts

- **`linesAdded` / `linesDeleted`** — sum of additions/deletions from **merged** PRs only (up to the first 50 per repo).
- **`linesAddedAll` / `linesDeletedAll`** — same sum including open PRs.

Both are limited to the 50 PR nodes fetched per repo; repos with more than 50 PRs will be under-counted.

### Per-PR detail (REST)

The expanded row in the contributions table (`ExpandedPRDetail`) fetches individual PR metadata on demand from the GitHub REST API (`src/lib/github-rest.ts`), which provides exact additions, deletions, file count, commit count, and review count for that specific PR regardless of merge status.

## CI

The repo includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that on pull requests to `main` runs:

- TypeScript check (`npx tsc --noEmit`)
- Lint (`npm run lint`)
- Build (`npm run build`)
- Tests (`npx vitest run`)

## Project structure (high level)

- `src/app/` — App Router routes: login (`/`), `dashboard`, `developer/[username]`, and API routes under `api/`.
- `src/components/` — UI: dashboard, developer overview, heatmap, timeline, top projects, contribution drill-down, shared UI and skeletons.
- `src/hooks/` — Data and UI hooks (e.g. overview, contributions, recent searches, filters).
- `src/lib/` — Auth, GitHub REST/GraphQL, cache, stats, types, and utilities.

## License

MIT. See [LICENSE](LICENSE).
