## 1. GraphQL Query & TypeScript Interfaces

- [x] 1.1 Add `nodes { occurredAt commitCount }` to `commitContributionsByRepository.contributions` in `CONTRIBUTIONS_QUERY`
- [x] 1.2 Add `occurredAt` to `pullRequestContributionsByRepository.contributions.nodes`
- [x] 1.3 Replace `issueContributions { totalCount }` with `issueContributionsByRepository(maxRepositories: 100) { repository { nameWithOwner } contributions { totalCount nodes { occurredAt } } }` in the query
- [x] 1.4 Add `nodes { occurredAt }` to `pullRequestReviewContributionsByRepository.contributions`
- [x] 1.5 Add `CommitContributionNode`, `IssueContributionNode`, and `ReviewContributionNode` TypeScript interfaces in `github-graphql.ts`
- [x] 1.6 Extend `PRNode` interface to include `occurredAt`
- [x] 1.7 Update `GraphQLContributionsResponse` and nested interfaces to reflect new query shape

## 2. Result Mapping

- [x] 2.1 Add `commitNodes`, `prNodes`, `issueNodes`, `reviewNodes` fields to `FetchContributionsResult` interface
- [x] 2.2 Map `commitContributionsByRepository` nodes into `commitNodes` in `fetchContributions`
- [x] 2.3 Map `pullRequestContributionsByRepository` nodes (with `occurredAt`) into `prNodes`
- [x] 2.4 Map `issueContributionsByRepository` nodes into `issueNodes`; derive issue `totalCount` from `contributions.totalCount` sum for `totalContributions` calculation
- [x] 2.5 Map `pullRequestReviewContributionsByRepository` nodes into `reviewNodes`
- [x] 2.6 Initialize empty arrays in the guard-return branch of `fetchAllContributions` (when `ranges.length === 0`)
- [x] 2.7 Concatenate `commitNodes`, `prNodes`, `issueNodes`, `reviewNodes` when merging year windows in `fetchAllContributions`

## 3. Cache Key Version Bumps

- [x] 3.1 Update overview cache key from `overview:2:` to `overview:3:` in `src/app/api/github/overview/[username]/route.ts`
- [x] 3.2 Bump contributions cache key version in `src/app/api/github/contributions/[username]/route.ts` (no-op: that route uses github-rest.ts / PaginatedContributions, shape unchanged)

## 4. Tests

- [x] 4.1 Update `src/lib/__tests__/github-graphql.test.ts` fixture to include `occurredAt`/`commitCount` on commit nodes
- [x] 4.2 Add assertions that `commitNodes` is populated correctly from fixture data
- [x] 4.3 Add assertions that `prNodes` includes `occurredAt` alongside `additions`/`deletions`/`merged`
- [x] 4.4 Add assertions that `issueNodes` is populated per repo and that `totalContributions` is unchanged
- [x] 4.5 Add assertions that `reviewNodes` is populated with `repoNameWithOwner` and `occurredAt`
- [x] 4.6 Add test for empty-window case: all new node arrays are `[]`
- [x] 4.7 Add test for multi-window merge: `commitNodes` from two windows are concatenated
