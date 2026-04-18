## Context

`src/lib/auth.ts` sets up next-auth v5 with the GitHub provider. Currently the only access control is authentication — any valid GitHub session may use the app. The proxy (`src/proxy.ts`) guards routes by checking `session?.accessToken` but performs no authorization check. There is no middleware file; `src/proxy.ts` is used as the Next.js middleware via `src/middleware.ts` (or equivalent export).

`publicPaths` in `proxy.ts` currently contains only `["/"]`. Protected pages redirect unauthenticated users to `/`. There is no `/auth/denied` page.

## Goals / Non-Goals

**Goals:**
- Block login for GitHub users who are not members of the org named in `AUTH_GITHUB_ORG`
- Redirect denied users to `/auth/denied` with a clear message
- Gracefully skip the check when `AUTH_GITHUB_ORG` is unset (local dev / backwards compat)
- No additional network calls on authenticated requests (membership is enforced at login only)

**Non-Goals:**
- Real-time membership checks on every request — stale sessions of removed members remain valid until expiry
- Role-based permissions within the org (member vs. owner)
- Support for more than one allowed org

## Decisions

### 1. Enforce in `signIn` callback, not middleware

Checking at login (once, in the `signIn` callback) is simpler and cheaper than checking on every request in the proxy. The trade-off is that a member removed from the org retains access until their session cookie expires (default next-auth session TTL). This is acceptable for this use case.

**Alternative considered:** store `orgMember: boolean` in the JWT and re-check in the proxy on each request. Rejected — adds complexity and a GitHub API call to every page load.

### 2. Use `GET /user/orgs?per_page=100` with the user's access token

This endpoint returns all orgs the authenticated user belongs to as JSON (no redirects). Requires `read:org` OAuth scope for private org membership.

**Alternative considered:** `GET /orgs/{org}/members/{login}`. This endpoint issues a 302 redirect for public-only members, which `fetch` follows and yields a 200 HTML page — making status-based detection unreliable without `redirect: "manual"` (which returns opaque status 0 in Node.js fetch). Rejected in favour of the simpler list approach.

**Limitation:** `GET /user/orgs` returns up to 100 orgs per page; users in more than 100 orgs would need pagination. Accepted — extremely unlikely for this audience.

### 3. Add `read:org` to the GitHub OAuth scope

The GitHub provider currently uses default scopes (`read:user user:email`). Adding `read:org` allows `GET /user/orgs` to return private org memberships. Without it, only public membership is visible.

Set via `authorization.params.scope` on the GitHub provider:
```ts
GitHub({
  checks: ["state"],
  authorization: { params: { scope: "read:user user:email read:org" } },
})
```

### 4. `/auth/denied` is a static public page; proxy allows it without session

Add `/auth/denied` to `publicPaths` in `proxy.ts` so unauthenticated users (e.g., those who just had their login rejected) can view it without a redirect loop.

### 5. `signIn` callback returns a redirect string on denial

Returning a URL string from the next-auth `signIn` callback redirects the user to that URL. Return `"/auth/denied"` on failure, `true` on success.

## Risks / Trade-offs

- [Stale sessions after org removal] A user removed from the org retains a valid session until it expires → **Mitigation**: document the gap; if real-time enforcement is needed later, add a JWT check in the proxy.
- [GitHub API availability] If `api.github.com` is down at login time, the `signIn` callback will throw and next-auth will show a generic error → **Mitigation**: catch errors and return `false` (deny) rather than `true` (allow) — fail closed.
- [Re-authorization prompt] Adding `read:org` scope means existing users will be asked to re-authorize the OAuth app → **Mitigation**: expected and acceptable; one-time prompt.
- [Org name case sensitivity] GitHub org slugs are case-insensitive → **Mitigation**: compare with `toLowerCase()` on both sides.
