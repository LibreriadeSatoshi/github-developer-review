## ADDED Requirements

### Requirement: Login is restricted to members of the configured GitHub organization
When `AUTH_GITHUB_ORG` is set, the system SHALL verify that the authenticating GitHub user is a member of that organization before creating a session. Non-members SHALL be redirected to `/auth/denied` and no session SHALL be established.

#### Scenario: Org member logs in successfully
- **WHEN** a user authenticates via GitHub OAuth and is a member of `AUTH_GITHUB_ORG`
- **THEN** a session is created and the user is redirected to the dashboard as normal

#### Scenario: Non-org member is denied login
- **WHEN** a user authenticates via GitHub OAuth and is NOT a member of `AUTH_GITHUB_ORG`
- **THEN** no session is created and the user is redirected to `/auth/denied`

#### Scenario: GitHub API error at login time denies access (fail closed)
- **WHEN** the GitHub API call to verify org membership fails (network error or non-2xx)
- **THEN** no session is created and the user is redirected to `/auth/denied`

### Requirement: Org gate is skipped when AUTH_GITHUB_ORG is not set
When `AUTH_GITHUB_ORG` is absent from the environment, the system SHALL allow all authenticated GitHub users to log in without an org membership check.

#### Scenario: No org restriction when env var is absent
- **WHEN** `AUTH_GITHUB_ORG` is not set and a user authenticates via GitHub OAuth
- **THEN** a session is created regardless of org membership

### Requirement: /auth/denied page is publicly accessible
The `/auth/denied` route SHALL be accessible without a session so that users redirected after a failed login can see an explanation.

#### Scenario: Unauthenticated user visits /auth/denied
- **WHEN** a user without a session navigates to `/auth/denied`
- **THEN** the page renders with a message explaining access is restricted to org members (no redirect to login)

### Requirement: OAuth scope includes read:org
The GitHub OAuth provider SHALL request the `read:org` scope so that private org membership is visible when calling `GET /user/orgs`.

#### Scenario: OAuth authorization includes read:org scope
- **WHEN** a user initiates GitHub OAuth login
- **THEN** the authorization request includes `read:org` in the scope parameter
