## Context

The app is a Next.js 16 App Router project. It currently uses `@vercel/kv` (backed by Upstash Redis) for server-side caching of GitHub API responses. The cache layer is isolated in `src/lib/cache.ts` and exposes only two functions: `getCached` and `setCache`. Auth is handled by NextAuth v5 with a GitHub provider, which is not Vercel-specific and requires no changes.

## Goals / Non-Goals

**Goals:**
- Deploy the app on Netlify without functional regressions
- Preserve the existing `getCached`/`setCache` public interface
- Keep caching optional (app degrades gracefully without cache env vars)

**Non-Goals:**
- Changing NextAuth configuration or auth flow
- Adopting Netlify Blobs or any other storage backend
- CI/CD changes beyond documentation

## Decisions

### 1. Use `@upstash/redis` directly instead of `@vercel/kv`

`@vercel/kv` is a thin wrapper over `@upstash/redis` with Vercel-specific env var conventions. Switching to `@upstash/redis` directly gives identical semantics while working on any host.

**Alternative considered**: Netlify Blobs — a key-value store native to Netlify. Rejected because it has a different API (`getStore`/`get`/`set`) and no TTL support natively, requiring more extensive refactoring.

### 2. Rename env vars to Upstash conventions

| Old (Vercel KV) | New (Upstash) |
|---|---|
| `KV_REST_API_URL` | `UPSTASH_REDIS_REST_URL` |
| `KV_REST_API_TOKEN` | `UPSTASH_REDIS_REST_TOKEN` |

This aligns with `@upstash/redis`'s `Redis.fromEnv()` helper and is the documented pattern for Netlify + Upstash.

### 3. Add `netlify.toml` with `@netlify/plugin-nextjs`

The `@netlify/plugin-nextjs` adapter handles SSR, API routes, and Image Optimization for Next.js on Netlify Edge Functions. Without it, server components and API routes won't work.

## Risks / Trade-offs

- **Existing Vercel deployments break** — Any team member using `KV_REST_API_URL` must update their `.env.local`. → Mitigation: document the rename clearly in README and provide a migration note.
- **Upstash Redis free tier limits** — Same limits apply as with Vercel KV (both use Upstash under the hood). → No change in behavior.
- **`@netlify/plugin-nextjs` version compatibility** — The plugin must be pinned to a version that supports Next.js 16. → Pin to latest stable and note in `netlify.toml`.

## Migration Plan

1. Install `@upstash/redis` and `@netlify/plugin-nextjs`; remove `@vercel/kv`
2. Update `src/lib/cache.ts` to use `Redis.fromEnv()` from `@upstash/redis`
3. Update env var names in `.env.local.example` / README
4. Add `netlify.toml`
5. Verify locally with `netlify dev` (optional)
6. Deploy to Netlify; set env vars in Netlify dashboard

**Rollback**: Reverting the `cache.ts` change and restoring `@vercel/kv` is sufficient to redeploy on Vercel.

## Open Questions

- Should the CI workflow be updated to test a Netlify preview build? (Out of scope for now — CI currently only runs type-check, lint, build, and tests.)
