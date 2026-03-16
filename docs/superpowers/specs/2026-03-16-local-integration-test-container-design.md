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
| `integration/config/env.ts` | Add optional `convexSiteUrl` to `TestConfig` |
| `integration/clients/convex-client.ts` | Fix HTTP action URL derivation for localhost |
| `package.json` | Add `test:local` npm script |

---

## docker/docker-compose.test.yml

Single service: `ghcr.io/get-convex/convex-backend:latest`.

- **SQLite:** no `DATABASE_URL` — defaults to SQLite
- **Ports:** 3210 (API), 3211 (HTTP actions)
- **Env vars:**
  - `CONVEX_CLOUD_ORIGIN=http://localhost:3210`
  - `CONVEX_SITE_ORIGIN=http://localhost:3211`
- **Healthcheck:** `GET http://localhost:3210/version`, interval 2s, retries 30
- **Volume:** named SQLite volume, destroyed on `docker compose down -v`

---

## scripts/test-local.ts — Lifecycle

```
1. docker compose -f docker/docker-compose.test.yml up -d
2. Poll GET http://localhost:3210/version every 2s until 200 (timeout 60s)
3. docker exec <container> ./generate_admin_key.sh  → capture admin key
4. npx convex deploy --url http://localhost:3210 --admin-key <key>
5. npx convex env set ENABLE_TEST_ENDPOINTS test-local-key
   (using --url and --admin-key flags)
6. Spawn vitest with injected env:
     CONVEX_URL=http://localhost:3210
     CONVEX_SITE_URL=http://localhost:3211
     TEST_API_KEY=test-local-key
7. [try/finally] docker compose -f docker/docker-compose.test.yml down -v
```

The `TEST_API_KEY` and `ENABLE_TEST_ENDPOINTS` value are both the fixed string `test-local-key`. No secrets needed — the container is ephemeral and local-only.

Error handling: any step failure throws, the `finally` block always runs `docker compose down -v` to prevent orphaned containers.

---

## Localhost URL Fix

**Problem:** `convex-client.ts` derives the HTTP actions (site) URL as:
```ts
convexUrl.replace(".convex.cloud", ".convex.site")
```
For `http://localhost:3210` this transform is a no-op — the seed/cleanup calls would hit port 3210 instead of the HTTP actions port 3211.

**Fix:** Add an optional `CONVEX_SITE_URL` env var to `TestConfig`. When present it overrides the transform. When absent the existing transform applies, preserving cloud deployment behaviour.

```ts
// env.ts addition
convexSiteUrl: process.env.CONVEX_SITE_URL ?? convexUrl.replace(...)

// convex-client.ts
const siteUrl = config().convexSiteUrl;
```

---

## Environment Variable Summary

| Variable | Source | Used by |
|----------|--------|---------|
| `CONVEX_URL` | Injected by test-local.ts | `getTestConfig()` → Convex client |
| `CONVEX_SITE_URL` | Injected by test-local.ts | `callTestEndpoint()` |
| `TEST_API_KEY` | Injected by test-local.ts | `callTestEndpoint()` X-Test-Api-Key header |
| `ENABLE_TEST_ENDPOINTS` | Set on Convex deployment | Guards `/test/seed` and `/test/cleanup` |

Existing `.env.test` is untouched — `test:local` injects its own env into the vitest subprocess directly.

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
