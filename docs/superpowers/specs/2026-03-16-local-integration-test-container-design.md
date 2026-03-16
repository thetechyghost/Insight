# Local Integration Test Container — Design Spec

**Date:** 2026-03-16
**Status:** Approved

## Goal

Add a single `npm run test:local` command that spins up a self-hosted Convex backend in Docker, deploys the Convex functions, seeds test data, runs the full integration test suite, and tears everything down — with no manual configuration required.

## Scope

Local development only. SQLite backend (no Postgres). Container is torn down after every run. No CI pipeline changes in this iteration.

---

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `docker/docker-compose.test.yml` | Defines the Convex backend test container |
| `scripts/test-local.ts` | Orchestrates the full lifecycle |

### Modified Files

| File | Change |
|------|--------|
| `integration/config/env.ts` | Add `convexSiteUrl: string` field to `TestConfig` interface and implementation |
| `integration/clients/convex-client.ts` | Fix HTTP action URL derivation for localhost |
| `package.json` | Add `test:local` npm script |

The `scripts/` directory already exists (contains `seed.ts` and `cleanup.ts`). `scripts/test-local.ts` follows the same `import`/`tsx` pattern as those files. `package.json` sets `"type": "commonjs"` — `tsx` handles ESM-style `import` statements in TypeScript files regardless, so no `package.json` changes are needed beyond adding the npm script.

---

## docker/docker-compose.test.yml

Single service: `ghcr.io/get-convex/convex-backend:latest`.

- **SQLite:** no `DATABASE_URL` — defaults to SQLite
- **Ports:** 3210 (API), 3211 (HTTP actions)
- **`container_name: convex-test`** — explicit name for deterministic `docker compose exec` usage
- **Env vars set on the container:**
  - `CONVEX_CLOUD_ORIGIN=http://localhost:3210`
  - `CONVEX_SITE_ORIGIN=http://localhost:3211`
  - `ENABLE_TEST_ENDPOINTS=test-local-key` — set directly here, not via `convex env set`, since `convex env set` targets named cloud deployments and is not supported for self-hosted
- **Healthcheck:** runs inside the container: `curl -f http://localhost:3210/version`, interval 2s, retries 30. Inside the container, `localhost` is the container's own loopback — the same address mapped to host port 3210.
- **Volume:** named SQLite volume, destroyed on `docker compose down -v`

---

## scripts/test-local.ts — Lifecycle

```
1. docker compose -f docker/docker-compose.test.yml up -d

2. Poll host-side: GET http://localhost:3210/version every 2s until 200
   (timeout 60s — host polling the mapped port; separate from the
   container-internal healthcheck defined in the compose file)

3. docker compose -f docker/docker-compose.test.yml exec -T convex-test
     ./generate_admin_key.sh
   → capture stdout as admin key
   (-T disables TTY allocation to avoid terminal control characters in output)

4. Spawn: npx convex deploy
   with env vars injected into the subprocess:
     CONVEX_SELF_HOSTED_URL=http://localhost:3210
     CONVEX_SELF_HOSTED_ADMIN_KEY=<key from step 3>

5. Spawn: npx vitest run -c vitest.integration.config.ts
   with env vars injected into the subprocess:
     TEST_TARGET=dev
     CONVEX_URL=http://localhost:3210
     CONVEX_SITE_URL=http://localhost:3211
     TEST_API_KEY=test-local-key

6. [try/finally] docker compose -f docker/docker-compose.test.yml down -v
```

**Convex CLI targeting (step 4):** The Convex CLI reads `CONVEX_SELF_HOSTED_URL` and `CONVEX_SELF_HOSTED_ADMIN_KEY` from the environment to target a self-hosted deployment. No flags needed.

**`ENABLE_TEST_ENDPOINTS`** is set as a container env var in `docker-compose.test.yml` (value: `test-local-key`). `TEST_API_KEY` injected into vitest must match this value. No secrets needed — container is ephemeral and local-only.

**Error handling:** any step failure throws; the `finally` block always runs `docker compose down -v` to prevent orphaned containers.

**`TEST_TARGET=dev` injection:** Injecting `TEST_TARGET=dev` makes the test run hermetic — it prevents a developer's shell `TEST_TARGET=preprod` from redirecting the Convex client to the wrong deployment.

---

## Env Var Loading in Vitest Workers

Three sources load env vars into vitest workers, in order:

1. **Inherited from parent process** — vars injected by `test-local.ts` into the vitest subprocess (`TEST_TARGET`, `CONVEX_URL`, `CONVEX_SITE_URL`, `TEST_API_KEY`) are present from the start.
2. **`vitest.integration.config.ts` `env` block** — injects key/value pairs directly into each worker's `process.env` before any test code runs. It adds `DOTENV_CONFIG_PATH=".env.test"` into the worker environment. This is additive; it does not override already-present vars.
3. **`setupFiles: ["dotenv/config"]`** — runs `dotenv.config({ path: ".env.test" })` inside each worker. `dotenv` defaults to `override: false`, so it will not clobber vars already in the environment. Additionally, `env.ts` has `import "dotenv/config"` at module level — this triggers a second `dotenv.config()` call, but with the same `override: false` behaviour, so it is also safe.

Result: the injected values from `test-local.ts` always win. Existing `.env.test` is untouched and cannot interfere.

**Global setup env inheritance:** `global-setup.ts` runs in the main vitest process (not in a worker), so it receives process-level env vars inherited from the subprocess spawned in step 5 — including `CONVEX_URL`, `CONVEX_SITE_URL`, and `TEST_API_KEY`. The vitest `env` block (which injects `DOTENV_CONFIG_PATH` into worker `process.env`) does not affect global setup, but the process-level vars do. Critically, `global-setup.ts` calls `callTestEndpoint()` to seed data, which depends on the `convexSiteUrl` fix in `env.ts` and `convex-client.ts` — without that fix, seeding would hit port 3210 instead of 3211 and fail. The `convexSiteUrl` fix must be applied as part of this work.

---

## Localhost URL Fix

**Problem:** `convex-client.ts` derives the HTTP actions (site) URL as:
```ts
const siteUrl = convexUrl.replace(".convex.cloud", ".convex.site");
```
For `http://localhost:3210` this is a no-op — seed/cleanup calls would hit port 3210 instead of 3211.

**Fix:** Add `convexSiteUrl: string` to `TestConfig` and populate it from `CONVEX_SITE_URL`, falling back to the existing transform:

```ts
// TestConfig interface — env.ts
export interface TestConfig {
  target: TestTarget;
  convexUrl: string;
  convexSiteUrl: string;   // ← new
  testApiKey: string;
}

// getTestConfig() implementation
convexSiteUrl: process.env.CONVEX_SITE_URL
  ?? convexUrl.replace(".convex.cloud", ".convex.site"),
```

```ts
// convex-client.ts — callTestEndpoint
// Add convexSiteUrl to the existing destructure:
const { convexUrl, convexSiteUrl, testApiKey } = config();
const siteUrl = convexSiteUrl;  // replaces inline .replace() transform
```

Cloud deployments: `CONVEX_SITE_URL` absent → fallback transform applies, no behaviour change.

---

## Environment Variable Summary

| Variable | Set by | Read by |
|----------|--------|---------|
| `ENABLE_TEST_ENDPOINTS` | `docker-compose.test.yml` (container env) | `convex/http.ts` guards `/test/seed` and `/test/cleanup` |
| `CONVEX_SELF_HOSTED_URL` | test-local.ts step 4 subprocess | Convex CLI (`convex deploy`) |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | test-local.ts step 4 subprocess | Convex CLI |
| `TEST_TARGET` | test-local.ts step 5 subprocess | `getTestConfig()` — forces `dev` path |
| `CONVEX_URL` | test-local.ts step 5 subprocess | `getTestConfig()` → Convex HTTP client |
| `CONVEX_SITE_URL` | test-local.ts step 5 subprocess | `getTestConfig()` → `callTestEndpoint()` |
| `TEST_API_KEY` | test-local.ts step 5 subprocess | `callTestEndpoint()` X-Test-Api-Key header |

---

## npm Script

```json
"test:local": "npx tsx scripts/test-local.ts"
```

---

## Out of Scope

- CI pipeline integration
- Postgres backend option
- Parallel test workers against the same container
- Pre-seeded fixture data beyond the existing `foundationScenario`
