## Why

The current GraphQL query fetches only `totalCount` for commits, issues, and reviews per repository, losing per-node data (exact date, commit count per day, PR line deltas) that the API already returns for free. Unlocking these fields enables date-windowed breakdowns, per-repo activity timelines, and accurate issue attribution by repo — all needed for rigorous grant evaluation.

## What Changes

- Expand `commitContributionsByRepository.contributions` to include `nodes { occurredAt commitCount }` (currently only `totalCount` is fetched)
- Add `occurredAt` to `pullRequestContributionsByRepository.contributions.nodes` (already fetching PR nodes but missing the date)
- Replace the aggregate `issueContributions { totalCount }` with `issueContributionsByRepository` returning per-repo counts and per-node `occurredAt`
- Add `nodes { occurredAt }` to `pullRequestReviewContributionsByRepository.contributions`
- Expose the resulting per-day, per-repo contribution data through new fields on `FetchContributionsResult` and the overview API response

## Capabilities

### New Capabilities
- `granular-contribution-nodes`: Per-node contribution data (occurredAt, commitCount per day, PR dates, issue-by-repo, review dates) fetched from GitHub GraphQL and surfaced in the API response

### Modified Capabilities
- (none — existing aggregated counts remain; this adds new fields alongside them)

## Impact

- `src/lib/github-graphql.ts` — GraphQL query string, TypeScript interfaces, and result-mapping logic
- `src/lib/types.ts` — `ContributionItem` and/or `FetchContributionsResult` gain new fields
- `src/app/api/github/overview/[username]/route.ts` — may need to forward new fields to the client
- Cache invalidation: cache key version bump needed (`overview:3:` / `contributions:2:`) because response shape changes
- No new dependencies; no breaking changes to existing consumers (additive fields only)
