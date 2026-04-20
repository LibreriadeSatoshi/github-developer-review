## Context

`src/lib/github-graphql.ts` builds a single GraphQL query per year window and maps the response into `FetchContributionsResult`. Currently:

- `commitContributionsByRepository` fetches only `contributions { totalCount }` — the nodes with `occurredAt` + `commitCount` are never requested.
- `pullRequestContributionsByRepository` fetches `nodes { pullRequest { additions deletions merged } }` but omits `occurredAt` on each node.
- Issues are fetched as a single aggregate (`issueContributions { totalCount }`), losing per-repo breakdown.
- `pullRequestReviewContributionsByRepository` fetches only `totalCount`, no nodes at all.

The GitHub GraphQL API returns all four of these as per-node data within the same `contributionsCollection` window — adding these fields costs no extra requests.

## Goals / Non-Goals

**Goals:**
- Add `occurredAt` (and `commitCount`) to commit contribution nodes
- Add `occurredAt` to PR contribution nodes
- Replace the aggregate issue count with `issueContributionsByRepository` nodes containing `occurredAt`
- Add `nodes { occurredAt }` to review contributions
- Surface the resulting per-day, per-repo arrays on `FetchContributionsResult`
- Bump cache key versions to invalidate stale cached responses

**Non-Goals:**
- UI changes to display the new data (separate concern)
- Pagination of contribution nodes beyond GitHub's default (50-node) window for commits
- Changing the PR `first: 50` pagination limit (addressed separately if needed)

## Decisions

### D1: Additive fields on `FetchContributionsResult`

Add new fields (`commitNodes`, `prNodes`, `issueNodes`, `reviewNodes`) alongside existing aggregated fields rather than replacing them. Existing consumers (`/api/github/overview`, save logic) continue to compile without changes.

*Alternative considered*: Replace aggregated fields with derived values. Rejected — would require auditing all consumers and could silently break the save route's `total_contributions` calculation.

### D2: Flat per-node arrays, not nested by repo

Each node carries `repoNameWithOwner` as a field, so consumers can group by repo if needed. Nesting by repo on the result type adds structural complexity for marginal gain.

*Alternative*: `Map<repoName, node[]>`. Rejected — maps don't serialize cleanly through cache (JSON round-trip loses type) and make merging across year windows harder.

### D3: Cache key version bumps

`overview:2:` → `overview:3:` and contributions cache keys similarly. The response shape grows new fields; old cached blobs would deserialize into objects missing those fields, causing silent `undefined` reads downstream.

### D4: Keep `issueContributions` aggregate for backward compat

Keep the existing `issueContributions { totalCount }` field in the query alongside the new `issueContributionsByRepository`. The total is used in `totalContributions` calculation and removing it would require re-summing from nodes (safe, but risky to change silently).

## Risks / Trade-offs

- **Node limit for commits**: `contributions { nodes { ... } }` on `commitContributionsByRepository` defaults to the first 100 nodes per repo per window. Prolific committers hitting >100 commit-days/repo/year will have truncated node lists — but `totalCount` remains accurate for the aggregate. → Mitigation: document the limit; if needed, add pagination in a follow-up.
- **Response size growth**: Adding nodes to all four contribution types can increase query response size meaningfully for highly active developers. → Mitigation: Upstash Redis cache absorbs repeated requests; the overview route is already cached for 1 hr.
- **PR nodes still capped at `first: 50`**: `pullRequestContributionsByRepository` already has this limit. Adding `occurredAt` doesn't worsen it, but the cap remains. → Accepted: out of scope.

## Migration Plan

1. Update the GraphQL query string in `github-graphql.ts` to add the new fields.
2. Extend TypeScript interfaces (`CommitContributionNode`, `PRNode` extended, new `IssueNode`, `ReviewNode`).
3. Map new nodes into new result fields in `fetchContributions`.
4. Merge new arrays across year windows in `fetchAllContributions`.
5. Bump cache key versions (`overview:3:`, contributions key version).
6. Update tests to cover new fields.

Rollback: revert the query change and cache key bump; old keys will be cache misses and refetch cleanly.

## Open Questions

- Should `issueContributionsByRepository` also fetch `issueContributions { totalCount }` for the aggregate, or derive it by summing nodes? (Current decision: keep both to avoid regressions.)
- Is 100 commit nodes per repo per year sufficient for the grant evaluation use case, or do we need to handle pagination?
