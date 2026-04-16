## Why

The current developer profile shows contribution counts (events) but not lines of code written. Lines of code is a key signal for evaluating a developer's output depth — how much actual code they ship — not just activity frequency. This data requires fetching GitHub commit stats per repo, which doesn't exist in the cached Redis profile yet.

## What Changes

- Fetch per-commit stats (additions/deletions) from GitHub API when building the developer profile
- Store aggregated lines-added and lines-deleted in Redis alongside existing contribution data
- Expose lines-of-code totals in the developer profile API response
- Display lines written (additions) in the UI, filterable by the existing date presets

## Capabilities

### New Capabilities

- `lines-of-code-stats`: Fetches, caches, and displays lines of code written (additions) and deleted per developer, aggregated from GitHub commit stats across their repos

### Modified Capabilities

- (none)

## Impact

- **GitHub API**: Adds calls to commit stats endpoints (`GET /repos/{owner}/{repo}/stats/contributors` or per-commit `GET /repos/{owner}/{repo}/commits/{sha}` with stats). Rate-limit sensitive — needs caching strategy.
- **Redis**: New fields added to the cached developer profile (`linesAdded`, `linesDeleted`, or nested per-period).
- **API route**: `src/app/api/github/overview/[username]/route.ts` — extended to aggregate and return lines-of-code data.
- **UI components**: Profile/overview page gains a new stat display for lines written, using existing date filter presets.
- **Cost**: GitHub API commit stats can be expensive at scale; fetching must be bounded (e.g., top N repos by contribution, or repos already present in `bitcoinRepos`/`contributions`).
