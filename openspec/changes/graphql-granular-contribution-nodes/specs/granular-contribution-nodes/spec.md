## ADDED Requirements

### Requirement: Commit contribution nodes include date and daily count
The GraphQL query SHALL request `contributions { nodes { occurredAt commitCount } }` on `commitContributionsByRepository`. `FetchContributionsResult` SHALL expose a `commitNodes` field: an array of `{ repoNameWithOwner: string; occurredAt: string; commitCount: number }`.

#### Scenario: Commit nodes populated for active developer
- **WHEN** `fetchContributions` is called for a developer who committed to 2 repos in the date window
- **THEN** `commitNodes` contains one entry per commit-day per repo, each with a non-empty `repoNameWithOwner`, an ISO-8601 `occurredAt`, and a positive `commitCount`

#### Scenario: Commit nodes empty for developer with no commits in window
- **WHEN** `fetchContributions` is called for a window where the developer made no commits
- **THEN** `commitNodes` is an empty array

#### Scenario: Commit nodes merged across year windows
- **WHEN** `fetchAllContributions` spans multiple year windows
- **THEN** `commitNodes` in the merged result contains entries from all windows concatenated

### Requirement: PR contribution nodes include occurred-at date
The GraphQL query SHALL add `occurredAt` to each node in `pullRequestContributionsByRepository.contributions.nodes`. `FetchContributionsResult` SHALL expose a `prNodes` field: an array of `{ repoNameWithOwner: string; occurredAt: string; additions: number; deletions: number; merged: boolean }`.

#### Scenario: PR nodes include date alongside line counts
- **WHEN** a developer opened 3 PRs in the date window
- **THEN** `prNodes` has 3 entries each containing a non-empty `occurredAt`, `additions`, `deletions`, and a boolean `merged`

#### Scenario: PR nodes respect existing first:50 cap
- **WHEN** a developer opened more than 50 PRs to one repo in a single year window
- **THEN** `prNodes` contains at most 50 entries for that repo (GitHub API limit) and `contributions.totalCount` still reflects the full count

### Requirement: Issue contributions broken down by repository
The GraphQL query SHALL replace the aggregate `issueContributions { totalCount }` with `issueContributionsByRepository(maxRepositories: 100) { repository { nameWithOwner } contributions { totalCount nodes { occurredAt } } }`. `FetchContributionsResult` SHALL expose an `issueNodes` field: an array of `{ repoNameWithOwner: string; occurredAt: string }`.

#### Scenario: Issue nodes populated per repo
- **WHEN** a developer opened issues in 2 different repos
- **THEN** `issueNodes` contains one entry per issue per repo, each with the correct `repoNameWithOwner` and a non-empty `occurredAt`

#### Scenario: Total issue count unchanged
- **WHEN** issue contributions exist
- **THEN** `totalContributions` on the result equals the same value that would have been computed using the old aggregate `issueContributions.totalCount`

#### Scenario: No issues in window
- **WHEN** the developer opened no issues in the date window
- **THEN** `issueNodes` is an empty array

### Requirement: Review contribution nodes include occurred-at date
The GraphQL query SHALL request `contributions { nodes { occurredAt } }` on `pullRequestReviewContributionsByRepository`. `FetchContributionsResult` SHALL expose a `reviewNodes` field: an array of `{ repoNameWithOwner: string; occurredAt: string }`.

#### Scenario: Review nodes populated for reviewer
- **WHEN** a developer submitted reviews in the date window
- **THEN** `reviewNodes` contains one entry per review with a non-empty `repoNameWithOwner` and `occurredAt`

#### Scenario: Review nodes empty when no reviews
- **WHEN** the developer submitted no reviews
- **THEN** `reviewNodes` is an empty array

### Requirement: Cache keys are versioned to prevent stale reads
The overview cache key SHALL use version `3` (`overview:3:<username>`) and the contributions cache key SHALL increment its version. No route SHALL read a response cached under the old key versions and treat it as a valid granular-contribution response.

#### Scenario: Cache miss on first request after deploy
- **WHEN** a cached overview blob exists under key `overview:2:<username>` and a request is made after the cache version bump
- **THEN** the route treats it as a cache miss, fetches fresh data from GitHub, and stores the result under `overview:3:<username>`
