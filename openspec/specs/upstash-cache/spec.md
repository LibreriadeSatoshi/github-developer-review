## ADDED Requirements

### Requirement: Cache client uses @upstash/redis
The `src/lib/cache.ts` module SHALL use `@upstash/redis` (`Redis.fromEnv()`) as the underlying client instead of `@vercel/kv`, while preserving the existing `getCached<T>` and `setCache<T>` public interface.

#### Scenario: Successful cache read
- **WHEN** `getCached(key)` is called and the key exists in Upstash Redis
- **THEN** the cached value SHALL be returned as the typed result

#### Scenario: Cache read failure is silent
- **WHEN** `getCached(key)` throws (network error, missing env vars)
- **THEN** `null` SHALL be returned and an error SHALL be logged to console without throwing

#### Scenario: Successful cache write with TTL
- **WHEN** `setCache(key, data, ttl)` is called
- **THEN** the value SHALL be stored in Upstash Redis with the specified TTL (default 3600 seconds)

#### Scenario: Cache write failure is silent
- **WHEN** `setCache(key, data)` throws (network error, missing env vars)
- **THEN** the error SHALL be logged to console without throwing

### Requirement: Upstash environment variables
The application SHALL read cache credentials from `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` environment variables, replacing the previous `KV_REST_API_URL` and `KV_REST_API_TOKEN`.

#### Scenario: Cache operates with correct env vars
- **WHEN** both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- **THEN** the Redis client SHALL connect successfully and cache reads/writes SHALL succeed

#### Scenario: App runs without cache env vars
- **WHEN** `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` are absent
- **THEN** the application SHALL start normally, cache operations SHALL fail silently, and GitHub API calls SHALL proceed without caching

### Requirement: @vercel/kv removed
The `@vercel/kv` package SHALL be removed from `package.json` dependencies to eliminate the Vercel-specific dependency.

#### Scenario: No @vercel/kv import in codebase
- **WHEN** the codebase is scanned for imports of `@vercel/kv`
- **THEN** no such import SHALL exist
