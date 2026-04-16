## ADDED Requirements

### Requirement: Fetch lines of code from GitHub contributor stats
The system SHALL fetch lines added and deleted for a developer by calling the GitHub REST API contributor stats endpoint (`GET /repos/{owner}/{repo}/stats/contributors`) for each repo present in the developer's `contributions` array, bounded to a maximum of 20 repos ordered by contribution count descending.

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

---

### Requirement: Store lines-of-code totals in DeveloperOverview
The system SHALL store aggregated `linesAdded` and `linesDeleted` as numeric fields on the `DeveloperOverview` type and persist them in the Redis cache alongside existing profile data.

#### Scenario: Successful enrichment
- **WHEN** line stats are fetched for a developer
- **THEN** the cached `DeveloperOverview` SHALL include `linesAdded` (sum of all repo additions for the developer) and `linesDeleted` (sum of all repo deletions)

#### Scenario: All repos fail or return 202 repeatedly
- **WHEN** no repos return usable stats
- **THEN** `linesAdded` and `linesDeleted` SHALL both be 0 and the profile SHALL still be cached

---

### Requirement: Display lines written in the developer profile UI
The system SHALL display `linesAdded` as "Lines written" in the developer profile overview, visible alongside existing contribution stats.

#### Scenario: Profile loaded with line stats
- **WHEN** a developer profile is displayed
- **THEN** the UI SHALL show a "Lines written" stat formatted as a compact number (e.g. 42,300 → "42.3k")

#### Scenario: Lines written is zero
- **WHEN** `linesAdded` is 0
- **THEN** the UI SHALL display "0" without hiding the stat
