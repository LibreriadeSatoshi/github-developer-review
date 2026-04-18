# Story 3.1: Native Logger

Status: done

## Story

As a developer,
I want a centralized zero-dependency logger singleton at `src/lib/logger.ts`,
So that all server-side log output is level-controlled by `DEBUG_CONSOLE` and structured as JSON in production.

## Acceptance Criteria

1. **Given** `DEBUG_CONSOLE` is unset or any value other than `"TRUE"` — **When** the app runs — **Then** only `error` and `warn` messages are emitted; `info` and `debug` are suppressed
2. **Given** `DEBUG_CONSOLE=TRUE` — **When** the app runs — **Then** all levels including `debug` are emitted
3. **Given** `NODE_ENV=production` — **When** a log entry is emitted — **Then** output is a single-line JSON string: `{"timestamp":"…","level":"…","message":"…"}` with optional `meta` field appended
4. **Given** `NODE_ENV` is not `production` — **When** a log entry is emitted — **Then** output uses `console[level]` in human-readable format
5. **Given** `cache.ts` encounters a Redis read or write error — **When** the error occurs — **Then** `logger.error()` is called; no direct `console.error()` remains in the file
6. **Given** `github-stats.ts` logs a warning or info — **When** the condition triggers — **Then** `logger.warn()` / `logger.info()` is called; no direct `console.warn()` / `console.info()` remains
7. **Given** any file other than `src/lib/logger.ts` — **When** it needs to log — **Then** it imports `logger` from `@/lib/logger`; no file calls `console.*` directly

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/logger.ts`
  - [x] 1.1 Define `LEVELS` map (`error=0, warn=1, info=2, debug=3`) and derive `activeLevel` from `DEBUG_CONSOLE` env var
  - [x] 1.2 Implement `log(level, message, meta?)` — guard by active level, emit JSON in production, `console[level]` in dev
  - [x] 1.3 Export `logger` object with `.error()`, `.warn()`, `.info()`, `.debug()` methods
  - [x] 1.4 No external imports — `process.env` only, no `import` statements

- [x] Task 2: Update call sites
  - [x] 2.1 `src/lib/cache.ts` — add `import { logger } from "@/lib/logger"`, replace both `console.error(...)` with `logger.error(...)`
  - [x] 2.2 `src/lib/github-stats.ts` — add import, replace `console.warn(...)` × 2 and `console.info(...)` × 1

- [x] Task 3: Tests
  - [x] 3.1 Create `src/lib/__tests__/logger.test.ts` — test default level suppresses info/debug, DEBUG_CONSOLE=TRUE enables all, production format is valid JSON
  - [x] 3.2 Add `vi.mock("@/lib/logger", ...)` to `cache.test.ts` to suppress log noise during tests
  - [x] 3.3 Add `vi.mock("@/lib/logger", ...)` to `github-stats.test.ts` for the same reason

## Review Findings

- [x] [Review][Patch] JSON.stringify throws in production on non-serializable meta (circular ref, BigInt, Function) — wrap in try/catch with string fallback [`src/lib/logger.ts:10`]
- [x] [Review][Patch] Caught error not forwarded to logger in cache.ts — stack trace lost on Redis failures [`src/lib/cache.ts`]
- [x] [Review][Patch] DEBUG_CONSOLE case-sensitivity ("TRUE" only) undocumented in source code [`src/lib/logger.ts:6`]
- [x] [Review][Patch] Logger mock in cache/github-stats tests does not assert logger was called with expected args [`src/lib/__tests__/cache.test.ts`, `src/lib/__tests__/github-stats.test.ts`]
- [x] [Review][Defer] Binary log level control (warn or debug only, no intermediate info) — deferred, by design per spec
- [x] [Review][Defer] process.env read on every log call — deferred, intentional for testability
- [x] [Review][Defer] No numeric severity field in JSON output for log aggregators — deferred, no aggregator configured

## Dev Context

### File locations

| File | Action |
|---|---|
| `src/lib/logger.ts` | **CREATE** — zero-dep singleton |
| `src/lib/cache.ts` | **EDIT** — lines 10, 19: replace `console.error` |
| `src/lib/github-stats.ts` | **EDIT** — lines 46, 55: replace `console.warn`; line 70: replace `console.info` |
| `src/lib/__tests__/logger.test.ts` | **CREATE** |
| `src/lib/__tests__/cache.test.ts` | **EDIT** — add logger mock |
| `src/lib/__tests__/github-stats.test.ts` | **EDIT** — add logger mock |

### Logger implementation (reference)

```ts
// src/lib/logger.ts
const LEVELS: Record<string, number> = { error: 0, warn: 1, info: 2, debug: 3 };
const activeLevel = process.env.DEBUG_CONSOLE === "TRUE" ? "debug" : "warn";

function log(level: string, message: string, meta?: unknown): void {
  if (LEVELS[level] > LEVELS[activeLevel]) return;
  if (process.env.NODE_ENV === "production") {
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    if (meta !== undefined) entry.meta = meta;
    (console as Record<string, (...args: unknown[]) => void>)[level](JSON.stringify(entry));
  } else {
    (console as Record<string, (...args: unknown[]) => void>)[level](`[${level.toUpperCase()}] ${message}`, ...(meta !== undefined ? [meta] : []));
  }
}

export const logger = {
  error: (message: string, meta?: unknown) => log("error", message, meta),
  warn:  (message: string, meta?: unknown) => log("warn",  message, meta),
  info:  (message: string, meta?: unknown) => log("info",  message, meta),
  debug: (message: string, meta?: unknown) => log("debug", message, meta),
};
```

### Standard logger mock for tests

```ts
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
```

Place this at the top of any test file that imports a module which uses the logger.

### Architecture guardrails

- **No `console.*` in server-side modules** — architecture rule: "Never use `console.*` — use `logger` from `@/lib/logger`"
- **No external dependencies** — do NOT install winston or pino; the wrapper is zero-dep by design
- **Boundary:** `console.*` may ONLY appear inside `src/lib/logger.ts` itself
- **Import alias:** always `@/lib/logger`, never relative paths
- **`activeLevel` is computed at module load** — it reads `process.env.DEBUG_CONSOLE` once; changes at runtime have no effect (expected serverless behaviour)

### Test environment note

`process.env.NODE_ENV` in Vitest is `"test"`, not `"production"`. Logger will use the human-readable path in tests. To test the JSON production path, set `process.env.NODE_ENV = "production"` inside the test and restore it in `afterEach`.

### Call sites (exact lines to replace)

**`src/lib/cache.ts`:**
```ts
// line 10 — replace:
console.error(`Cache read failed for key "${key}"`);
// with:
logger.error(`Cache read failed for key "${key}"`);

// line 19 — replace:
console.error(`Cache write failed for key "${key}"`);
// with:
logger.error(`Cache write failed for key "${key}"`);
```

**`src/lib/github-stats.ts`:**
```ts
// line 46 — replace:
console.warn(`[github-stats] Stats not ready for ${repoNameWithOwner}, defaulting to 0`);
// with:
logger.warn(`[github-stats] Stats not ready for ${repoNameWithOwner}, defaulting to 0`);

// line 55 — replace:
console.warn(`[github-stats] Unexpected ${res.status} for ${repoNameWithOwner}`);
// with:
logger.warn(`[github-stats] Unexpected ${res.status} for ${repoNameWithOwner}`);

// line 70 — replace:
console.info(`[github-stats] Capping repos from ${sorted.length} to ${REPO_CAP} for ${username}`);
// with:
logger.info(`[github-stats] Capping repos from ${sorted.length} to ${REPO_CAP} for ${username}`);
```

### What NOT to do

- Do NOT install any logging package
- Do NOT create a `Logger` class — the exported `logger` object is sufficient
- Do NOT add log calls to routes or components beyond the 5 existing call sites
- Do NOT change the message strings — keep them identical to current `console.*` calls
- Do NOT mock `console` in tests — mock `@/lib/logger` instead
