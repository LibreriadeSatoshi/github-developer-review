## 1. Dependencies

- [x] 1.1 Remove `@vercel/kv` from `package.json` dependencies
- [x] 1.2 Add `@upstash/redis` to `package.json` dependencies
- [x] 1.3 Add `@netlify/plugin-nextjs` to `package.json` devDependencies
- [x] 1.4 Run `npm install` to update `package-lock.json`

## 2. Cache Layer

- [x] 2.1 Update `src/lib/cache.ts` to import `Redis` from `@upstash/redis` instead of `kv` from `@vercel/kv`
- [x] 2.2 Initialize the Redis client with `Redis.fromEnv()` in `cache.ts`
- [x] 2.3 Update `getCached` to use `redis.get<T>(key)` and preserve silent-failure behavior
- [x] 2.4 Update `setCache` to use `redis.set(key, data, { ex: ttl })` and preserve silent-failure behavior
- [x] 2.5 Update `src/lib/__tests__/cache.test.ts` mocks to target `@upstash/redis` instead of `@vercel/kv`

## 3. Netlify Configuration

- [x] 3.1 Create `netlify.toml` at the project root with `[build]` command (`npm run build`) and `[[plugins]]` for `@netlify/plugin-nextjs`
- [x] 3.2 Verify no `vercel.json` or Vercel-specific config exists that would conflict

## 4. Documentation

- [x] 4.1 Update README environment variable table: replace `KV_REST_API_URL` with `UPSTASH_REDIS_REST_URL` and `KV_REST_API_TOKEN` with `UPSTASH_REDIS_REST_TOKEN`
- [x] 4.2 Update README deployment section with Netlify instructions (link to Netlify dashboard, env var setup)
- [x] 4.3 Update any `.env.local.example` or similar files if they exist

## 5. Verification

- [x] 5.1 Run `npm run test:run` to confirm cache tests pass with new client
- [x] 5.2 Run `npm run build` to confirm the production build succeeds
- [x] 5.3 Run `npm run lint` and `npx tsc --noEmit` to confirm no type errors
