# Testing Guide

## Overview

The Insight platform uses a two-layer testing strategy:

| Layer | Framework | Target | Speed | Config |
|-------|-----------|--------|-------|--------|
| **Unit** | vitest + convex-test | In-memory Convex simulation | ~1.5s for 245 tests | `vitest.config.ts` |
| **Integration** | vitest + ConvexHttpClient | Real Convex deployment | ~30s (network-bound) | `vitest.integration.config.ts` |

## Quick Start

```bash
# Run unit tests (no setup required)
npm run test:unit

# Run integration tests (requires setup below)
npm run test:integration

# Run integration tests against pre-prod
npm run test:integration:preprod

# Run both unit and integration
npm run test:all
```

---

## Unit Tests

Unit tests use `convex-test` to simulate the Convex backend in-memory. No external services required.

### Running

```bash
npm run test:unit
```

### Location

All unit test files live alongside their source in `convex/`:

```
convex/
├── users.ts
├── users.test.ts        # <-- unit test
├── tenants.ts
├── tenants.test.ts
└── ...
```

### Writing Unit Tests

```ts
import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("myModule", () => {
  test("happy path", async () => {
    const t = convexTest(schema);

    // Seed data directly into the in-memory DB
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Alice", email: "alice@example.com" });
    });

    // Call functions as an authenticated user
    const asAlice = t.withIdentity({ email: "alice@example.com", subject: "user|alice" });
    const result = await asAlice.query(api.myModule.myQuery, { /* args */ });

    expect(result).toBeDefined();
  });
});
```

### Test Helpers

Import from `convex/test/setup.ts`:

- `seedUserWithTenant(t, options?)` — creates user + tenant + membership + default roles
- `seedSecondUser(t, tenantId, options?)` — adds another user to an existing tenant
- `seedUserInDifferentTenant(t, options?)` — creates an isolated user in a separate tenant
- `asUser(email)` — returns a `withIdentity` object for authenticated calls

### Required Coverage (per CLAUDE.md)

Every unit test file must cover:
- CRUD happy path
- Authentication enforcement (unauthenticated calls rejected)
- RBAC enforcement (insufficient role rejected)
- Tenant isolation (cross-tenant data never leaks)
- Ownership enforcement (where applicable)

---

## Integration Tests

Integration tests run against a **real Convex deployment** via HTTP. They test the full request path including auth resolution, tenant verification, and role enforcement.

### Prerequisites

1. A running Convex deployment (dev or pre-prod)
2. The `ENABLE_TEST_ENDPOINTS` environment variable set on the Convex deployment
3. A configured `.env.test` file locally

### Setup

#### Step 1: Configure Convex Deployment

Set the `ENABLE_TEST_ENDPOINTS` environment variable on your Convex deployment. The value you set becomes the test API key:

```bash
# Via Convex dashboard: Settings > Environment Variables
# Or via CLI:
npx convex env set ENABLE_TEST_ENDPOINTS "your-secret-test-api-key"
```

> **Security:** This env var gates the `/test/seed` and `/test/cleanup` HTTP endpoints. Only set it on dev/staging deployments. Never set it on production.

#### Step 2: Configure Auth Provider

Integration tests need to generate valid auth tokens. Configure your Convex deployment to accept tokens from the test JWT issuer:

- **Issuer:** `https://insight-test.example.com`
- **Audience:** `convex`

Add this to your Convex auth configuration so the deployment accepts test JWTs.

Alternatively, if using Clerk/Auth0, update `integration/clients/auth.ts` to generate tokens via your auth provider's API.

#### Step 3: Create `.env.test`

```bash
cp .env.test.example .env.test
```

Edit `.env.test`:

```env
# Target environment
TEST_TARGET=dev

# Your Convex deployment URL (from Convex dashboard)
CONVEX_URL=https://your-deployment-123.convex.cloud

# Must match the ENABLE_TEST_ENDPOINTS value on the deployment
TEST_API_KEY=your-secret-test-api-key

# Optional: for pre-prod testing
CONVEX_PREPROD_URL=https://your-preprod-456.convex.cloud
```

#### Step 4: Deploy Backend

Make sure the backend is deployed with the test endpoints:

```bash
npx convex deploy
```

### Running

```bash
# Against dev deployment
npm run test:integration

# Against pre-prod
npm run test:integration:preprod
```

### How It Works

1. **Global setup** (`integration/global-setup.ts`) runs before all tests:
   - Generates a unique prefix for the test run (e.g., `t-m3k7f-a2b9`)
   - Seeds foundation data (2 tenants, 7 users, 8 memberships) via `/test/seed` HTTP endpoint
   - Writes a `SeedContext` JSON file for test files to load

2. **Each test file** loads the seed context and creates authenticated HTTP clients:
   ```ts
   const ctx = loadSeedContext();
   const token = await getAuthToken(ctx.users.alice.email!);
   const client = createAuthenticatedClient(token);
   ```

3. **Global teardown** cleans up test data via `/test/cleanup`:
   - Dev: hard-deletes all records matching the test run prefix
   - Pre-prod: skips hard-delete (relies on namespaced data isolation)

### Test Personas

All integration tests use these 7 seeded users:

| Persona | Role | Tenant | Use Case |
|---------|------|--------|----------|
| Alice | Owner | CrossFit Alpha | Owner-level operations |
| Bob | Coach | CrossFit Alpha | Coach-level operations |
| Carol | Admin | CrossFit Alpha | Admin-level operations |
| Dave | Athlete | CrossFit Alpha | Athlete operations, lowest role |
| Eve | Athlete | CrossFit Alpha | Second athlete (peer testing) |
| Frank | Athlete | Both Alpha + Beta | Multi-gym membership testing |
| Grace | Owner | CrossFit Beta | Tenant isolation testing |

### Integration Test Structure

```
integration/
├── config/
│   └── env.ts                    # Environment config loader
├── clients/
│   ├── convex-client.ts          # ConvexHttpClient wrapper
│   └── auth.ts                   # JWT token generation
├── seed/
│   ├── scenarios.ts              # Seed data definitions
│   ├── seed-runner.ts            # Seed orchestrator
│   ├── cleanup.ts                # Teardown logic
│   ├── types.ts                  # SeedContext type
│   └── fixtures/                 # Per-domain seed data
├── helpers/
│   ├── assertions.ts             # expectToThrow, expectValidId
│   ├── load-context.ts           # Load SeedContext from file
│   └── wait.ts                   # Polling/delay utilities
├── global-setup.ts               # vitest globalSetup/teardown
└── tests/
    ├── foundation/               # Auth, tenancy, RBAC, user mgmt
    ├── workout/                  # Exercises, logging, benchmarks, programs
    ├── gym-management/           # Members, staff, invitations, waivers
    ├── classes-scheduling/       # Classes, bookings, schedule templates
    ├── social-gamification/      # Feed, challenges, badges, leaderboards
    ├── communication/            # Messaging, notifications
    ├── billing/                  # Plans, subscriptions, invoices
    ├── body-goals/               # Measurements, goals, habits
    ├── equipment/                # Devices, wearables
    └── platform-admin/           # Config, feature flags, audit, GDPR
```

### Writing Integration Tests

```ts
import { describe, test, expect, beforeAll } from "vitest";
import { createAuthenticatedClient } from "../../clients/convex-client";
import { getAuthToken } from "../../clients/auth";
import { loadSeedContext } from "../../helpers/load-context";
import { expectToThrow } from "../../helpers/assertions";
import { api } from "../../../convex/_generated/api";
import type { SeedContext } from "../../seed/types";
import type { Id } from "../../../convex/_generated/dataModel";

describe("[FR-XX] Domain Name", () => {
  let ctx: SeedContext;

  beforeAll(() => {
    ctx = loadSeedContext();
  });

  async function clientFor(userKey: string) {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  const tenantId = () => ctx.tenants.cfAlpha.id as Id<"tenants">;

  test("authenticated user can do the thing", async () => {
    const client = await clientFor("alice");
    const result = await client.query(api.myModule.myQuery, {
      tenantId: tenantId(),
    });
    expect(result).toBeDefined();
  });

  test("unauthenticated user is rejected", async () => {
    const { createTestClient } = await import("../../clients/convex-client");
    const client = createTestClient();
    await expectToThrow(
      () => client.query(api.myModule.myQuery, { tenantId: tenantId() }),
      "Not authenticated"
    );
  });
});
```

---

## Domain Coverage

See `integration/COVERAGE.md` for the full mapping of test suites to requirement domains (FR-PA, FR-UA, FR-MT, etc.).

### Covered Domains (32 test files)

| Domain | Test Files |
|--------|-----------|
| Foundation (auth, tenancy, RBAC, users) | 4 |
| Workout (exercises, logging, benchmarks, programs) | 4 |
| Gym Management (members, staff, invitations, waivers) | 4 |
| Classes & Scheduling (lifecycle, booking, templates) | 3 |
| Social & Gamification (feed, challenges, badges, leaderboards) | 4 |
| Communication (messaging, notifications) | 2 |
| Billing (plans, subscriptions, invoices) | 3 |
| Body & Goals (measurements, goals, habits) | 3 |
| Equipment (devices, wearables) | 2 |
| Platform Admin (config, flags, audit, data requests) | 4 |

### Deferred Domains

- Device sync (HealthKit, BLE/FTMS) — requires physical hardware
- Video upload/analysis — requires video infrastructure
- Retail/POS, Marketing, Reporting — not yet implemented (B11)
- Mobile/Desktop UI — covered by future Playwright E2E tests
- Non-functional requirements — separate performance testing concern

---

## Troubleshooting

### Unit tests fail with "edge-runtime" error

Make sure `@edge-runtime/vm` is installed:
```bash
npm install --save-dev @edge-runtime/vm
```

### Integration tests fail with "Missing CONVEX_URL"

Create `.env.test` from the example:
```bash
cp .env.test.example .env.test
```

### Integration tests fail with "Test endpoints are disabled"

Set the `ENABLE_TEST_ENDPOINTS` env var on your Convex deployment:
```bash
npx convex env set ENABLE_TEST_ENDPOINTS "your-test-api-key"
```

### Integration tests fail with "Invalid test API key"

Make sure `TEST_API_KEY` in `.env.test` matches `ENABLE_TEST_ENDPOINTS` on the deployment.

### Integration tests fail with auth errors

The test JWT issuer must be configured in your Convex auth settings. See Setup Step 2 above.

### Seed context file not found

This means `globalSetup` didn't run. Make sure you're running via:
```bash
npm run test:integration
```
Not `npx vitest run integration/...` directly.

### Leftover test data

Run cleanup manually:
```bash
npm run seed:cleanup
```

Or for a specific prefix:
```bash
npx tsx -e "
import { callTestEndpoint } from './integration/clients/convex-client';
callTestEndpoint('/test/cleanup', { prefix: 't-YOUR-PREFIX' }).then(console.log);
"
```
