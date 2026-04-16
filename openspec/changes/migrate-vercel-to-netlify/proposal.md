## Why

The project is coupled to Vercel via `@vercel/kv` for server-side caching, preventing deployment to Netlify. Migrating removes this vendor lock-in and enables the team to host on Netlify's infrastructure.

## What Changes

- Replace `@vercel/kv` dependency with `@upstash/redis` (same Upstash backend, Netlify-compatible)
- Update `src/lib/cache.ts` to use `@upstash/redis` client instead of `@vercel/kv`
- Add `netlify.toml` with Next.js plugin configuration
- Update environment variable names to match Upstash/Netlify conventions
- Update README with Netlify deployment instructions and new env vars

## Capabilities

### New Capabilities

- `netlify-deployment`: Configuration and adapter support for deploying the Next.js app on Netlify, including `netlify.toml` and the `@netlify/plugin-nextjs` plugin.
- `upstash-cache`: Cache layer backed by Upstash Redis via `@upstash/redis`, replacing the Vercel KV client while maintaining the same `getCached`/`setCache` interface.

### Modified Capabilities

<!-- No existing spec-level capabilities are changing — only the underlying infrastructure and deployment target. -->

## Impact

- **Dependencies**: Remove `@vercel/kv`; add `@upstash/redis` and `@netlify/plugin-nextjs`
- **`src/lib/cache.ts`**: Client swap; public API (`getCached`, `setCache`) stays the same
- **Environment variables**: `KV_REST_API_URL` → `UPSTASH_REDIS_REST_URL`, `KV_REST_API_TOKEN` → `UPSTASH_REDIS_REST_TOKEN`
- **`src/lib/__tests__/cache.test.ts`**: Mock update to match new client
- **New file**: `netlify.toml`
- **README**: Updated deployment and env var docs
