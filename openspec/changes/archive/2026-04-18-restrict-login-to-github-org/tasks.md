## 1. Auth — add read:org scope and signIn callback

- [x] 1.1 In `src/lib/auth.ts`, add `authorization: { params: { scope: "read:user user:email read:org" } }` to the GitHub provider
- [x] 1.2 Extend the `NextAuth` config type capture in `src/lib/__tests__/auth.test.ts` to include `signIn` callback type
- [x] 1.3 Add `signIn` callback to the NextAuth config in `src/lib/auth.ts`:
  - If `AUTH_GITHUB_ORG` is unset, return `true`
  - Call `GET https://api.github.com/user/orgs?per_page=100` with the user's `account.access_token`
  - Return `true` if the response JSON contains an org whose `login` matches `AUTH_GITHUB_ORG` (case-insensitive)
  - Return `"/auth/denied"` on non-membership or any error (fail closed)

## 2. Tests — signIn callback coverage

- [x] 2.1 Add test: `signIn` returns `true` when `AUTH_GITHUB_ORG` is not set
- [x] 2.2 Add test: `signIn` returns `true` when user is a member of the org (mock fetch returning matching org)
- [x] 2.3 Add test: `signIn` returns `"/auth/denied"` when user is not in the org (mock fetch returning empty list)
- [x] 2.4 Add test: `signIn` returns `"/auth/denied"` when GitHub API call throws (fail closed)
- [x] 2.5 Run `npx vitest run src/lib/__tests__/auth.test.ts` — all tests must pass

## 3. Proxy — expose /auth/denied as a public path

- [x] 3.1 Add `"/auth/denied"` to `publicPaths` in `src/proxy.ts`
- [x] 3.2 Add proxy test: unauthenticated `GET /auth/denied` returns 200 (not a redirect)
- [x] 3.3 Run `npx vitest run src/__tests__/proxy.test.ts` — all tests must pass

## 4. UI — /auth/denied page

- [x] 4.1 Create `src/app/auth/denied/page.tsx` — static page with a heading ("Access Restricted") and a message explaining that login is limited to members of the configured GitHub organization, with a link back to `/`

## 5. Docs — environment variable

- [x] 5.1 Add `AUTH_GITHUB_ORG` to the env var table in `CLAUDE.md` (e.g. `AUTH_GITHUB_ORG  # GitHub org slug — only members can log in; omit to allow all GitHub users`)

## 6. Final verification

- [x] 6.1 Run `npm run test:run` — full suite must be green
- [x] 6.2 Run `npx tsc --noEmit` — no type errors
