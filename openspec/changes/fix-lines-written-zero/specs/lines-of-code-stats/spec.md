## MODIFIED Requirements

### Requirement: Fetch lines of code from GitHub contributor stats
The system SHALL fetch lines added and deleted for a developer by calling the GitHub REST API contributor stats endpoint (`GET /repos/{owner}/{repo}/stats/contributors`) for each repo present in the developer's `contributions` array, bounded to a maximum of 20 repos ordered by contribution count descending. The function SHALL return `{ linesAdded, linesDeleted, resolved }` where `resolved` is `true` if at least one repo returned HTTP 200 with usable data, and `false` if every repo returned 202, 404, 403, or an error.

#### Scenario: Stats available immediately
- **WHEN** the contributor stats endpoint returns HTTP 200
- **THEN** the system SHALL sum the developer's weekly `a` (additions) and `d` (deletions) values across all weeks for that repo

#### Scenario: Stats not yet computed (202 response)
- **WHEN** the contributor stats endpoint returns HTTP 202
- **THEN** the system SHALL wait 2 seconds and retry once
- **THEN** if the retry also returns 202, the system SHALL use 0 for that repo and log a warning

#### Scenario: Repo not accessible (404 or 403)
- **WHEN** the contributor stats endpoint returns HTTP 404 or HTTP 403
- **THEN** the system SHALL skip that repo silently and contribute 0 to the totals

#### Scenario: More than 20 repos in contributions
- **WHEN** the developer has contributions in more than 20 repos
- **THEN** the system SHALL select the top 20 repos by contribution count and log that the cap was applied

#### Scenario: All repos return 202 or are inaccessible
- **WHEN** no repos return HTTP 200 with contributor data
- **THEN** the function SHALL return `{ linesAdded: 0, linesDeleted: 0, resolved: false }`

#### Scenario: At least one repo returns usable stats
- **WHEN** one or more repos return HTTP 200 with contributor data
- **THEN** the function SHALL return the aggregated totals with `resolved: true`

---

### Requirement: Store lines-of-code totals in DeveloperOverview
The system SHALL store aggregated `linesAdded`, `linesDeleted`, and `linesResolved` on the `DeveloperOverview` type and persist them in the Redis cache. `linesResolved` SHALL be `true` only when at least one stats fetch succeeded; `false` otherwise. The cache guard SHALL skip the lines-of-code re-fetch only when `linesResolved === true`.

#### Scenario: Successful enrichment
- **WHEN** line stats are fetched and at least one repo returns data
- **THEN** the cached `DeveloperOverview` SHALL include `linesAdded`, `linesDeleted`, and `linesResolved: true`

#### Scenario: All repos fail or return 202 on first attempt
- **WHEN** `fetchLinesOfCode` returns `resolved: false`
- **THEN** `linesAdded: 0`, `linesDeleted: 0`, and `linesResolved: false` SHALL be stored in the cache

#### Scenario: Subsequent request with unresolved stats
- **WHEN** the cached overview has `linesResolved !== true`
- **THEN** the system SHALL re-run `fetchLinesOfCode` (skipping the GraphQL re-fetch), update the cached overview with the new result, and return the enriched profile

#### Scenario: Subsequent request with resolved stats
- **WHEN** the cached overview has `linesResolved === true`
- **THEN** the system SHALL return the cached overview without re-fetching stats
