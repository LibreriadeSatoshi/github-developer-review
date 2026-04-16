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
- **Tailwind CSS v4**, **shadcn/ui**
- **SWR** for data fetching; **Upstash Redis** for server-side caching (optional)
- **Vitest** + **Testing Library** for tests

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
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis REST URL (for server-side cache) |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis REST token |
| `AUTH_URL` | Yes | Web URL for Github Login |
| `DEBUG_CONSOLE` | No | View log in console, set to `TRUE` |

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
   - `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_URL`, `DEBUG_CONSOLE`
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (optional, for caching)
4. Trigger a deploy.

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
