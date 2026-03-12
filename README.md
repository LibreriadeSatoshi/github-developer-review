## Github Developer Review

## Build Phases

### Phase 1 -- Foundation (Auth + API + Data Layer)

- Next.js project scaffold with TypeScript, Tailwind, shadcn/ui
- GitHub OAuth App setup + Auth.js integration
- Login page with "Sign in with GitHub" button
- Protected route middleware (redirect to login if unauthenticated)
- API route for GraphQL overview (`/api/github/overview/[username]`) using reviewer's OAuth token
- Bitcoin repo classifier with tiered relevance (`lib/bitcoin-repos.ts` + `config/bitcoin-repos.json`)
- Server-side cache with Vercel KV (`lib/cache.ts`)
- Rate-limited fetch helper with per-token tracking and retry/queue logic (`lib/github-search.ts`)
- Core types in `lib/types.ts`
- Skeleton components (`Skeletons.tsx`) and error banners (`ErrorBanner.tsx`) -- built from the start, not bolted on later

### Phase 2 -- Search + Overview UI

- Search page with recent searches
- Overview dashboard with skeleton loading states for every section:
  - Profile card (loads first, single call)
  - Stats grid (7 cards including commits, merge rate, avg lines changed)
  - Contribution heatmap
  - Contribution timeline chart (recharts line chart, monthly aggregation)
  - Top projects with tier badges
- SWR data fetching hooks
- Error banners for rate limit / partial results / API failures

### Phase 3 -- Drill-Down + Filtering

- API routes for PRs, reviews, comments (REST Search)
- Drill-down page with tabbed interface (lazy-loaded tabs)
- ContributionTable with clickable GitHub links + skeleton loading per tab
- Expandable rows with quality signals (lines changed, commits, time-to-merge) -- lazily fetched via `github-pr-detail.ts`
- Date filter bar with quick presets
- Project, status, and tier filters
- "Load more" pagination
- Mobile card layout (`ContributionCard.tsx`) for screens < 768px

### Phase 4 -- Polish + Responsive

- Mobile bottom-sheet for filter bar
- Horizontal scroll for heatmap + tabs on small screens
- Responsive stats grid (3x2 -> 2x3 -> 1x6)
- Rate limit badge in header (per reviewer)
- Empty states ("No bitcoin contributions found")
- "Show adjacent projects" toggle on overview
- End-to-end testing of rate limit recovery (partial results, retry, queue)
- URL deep linking for drill-down filters
- Unit tests for Bitcoin repo classifier
- Accessibility: aria labels on heatmap, keyboard navigation, colorblind-safe badges
