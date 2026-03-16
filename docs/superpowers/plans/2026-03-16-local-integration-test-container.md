# Local Integration Test Container Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `npm run test:local` that spins up a self-hosted Convex Docker container, deploys functions, seeds data, runs integration tests, and tears everything down automatically.

**Architecture:** A TypeScript orchestration script (`scripts/test-local.ts`) manages the full container lifecycle. A `docker/docker-compose.test.yml` defines the ephemeral SQLite-backed Convex backend. Two existing files (`integration/config/env.ts` and `integration/clients/convex-client.ts`) need a targeted fix to correctly derive the HTTP actions URL for localhost.

**Tech Stack:** Docker Compose, `ghcr.io/get-convex/convex-backend`, TypeScript + tsx, vitest, Node.js `child_process.spawnSync`/`spawn`

**Spec:** `docs/superpowers/specs/2026-03-16-local-integration-test-container-design.md`

---

## Chunk 1: Fix env.ts and convex-client.ts

These two changes fix a latent bug where HTTP action (seed/cleanup) calls hit port 3210 instead of 3211 for localhost. Must be done first — everything else depends on it.

**Files:**
- Modify: `integration/config/env.ts`
- Modify: `integration/clients/convex-client.ts`

### Task 1: Add `convexSiteUrl` to `TestConfig`

- [ ] **Read `integration/config/env.ts`**

- [ ] **Add `convexSiteUrl: string` to the `TestConfig` interface** — insert after `convexUrl: string`:

```ts
export interface TestConfig {
  target: TestTarget;
  convexUrl: string;
  convexSiteUrl: string;   // ← new
  testApiKey: string;
}
```

- [ ] **Add the `convexSiteUrl` variable and update the return statement in `getTestConfig()`**

  The existing code ends with:
  ```ts
  const testApiKey = process.env.TEST_API_KEY ?? "";

  return { target, convexUrl, testApiKey };
  ```

  Replace it with:
  ```ts
  const convexSiteUrl =
    process.env.CONVEX_SITE_URL ??
    convexUrl.replace(".convex.cloud", ".convex.site");

  const testApiKey = process.env.TEST_API_KEY ?? "";

  return { target, convexUrl, convexSiteUrl, testApiKey };
  ```

  Only the new `convexSiteUrl` variable and the updated return object are added — `testApiKey` already exists and must NOT be re-declared.

- [ ] **Verify the file compiles**

```bash
npx tsc --noEmit -p tsconfig.json
```

Expected: no errors from `integration/config/env.ts` (pre-existing errors in other files are acceptable)

- [ ] **Commit**

```bash
git add integration/config/env.ts
git commit -m "fix: add convexSiteUrl to TestConfig for localhost port support"
```

---

### Task 2: Use `convexSiteUrl` in `callTestEndpoint`

- [ ] **Read `integration/clients/convex-client.ts`**

- [ ] **Update `callTestEndpoint`** — in the function body, replace:

  ```ts
  const { convexUrl, testApiKey } = config();

  // Convex HTTP actions are at the deployment URL's httpAction path
  // The site URL is derived from the Convex URL
  const siteUrl = convexUrl.replace(".convex.cloud", ".convex.site");

  const response = await fetch(`${siteUrl}${path}`, {
  ```

  with:

  ```ts
  const { convexSiteUrl, testApiKey } = config();

  const response = await fetch(`${convexSiteUrl}${path}`, {
  ```

  `convexUrl` is no longer used in this function after the fix — remove it from the destructure entirely. The comment explaining the old transform is also removed.

- [ ] **Verify the file compiles**

```bash
npx tsc --noEmit -p tsconfig.json
```

Expected: no errors from `integration/clients/convex-client.ts`

- [ ] **Commit**

```bash
git add integration/clients/convex-client.ts
git commit -m "fix: use convexSiteUrl in callTestEndpoint to support localhost port 3211"
```

---

## Chunk 2: docker/docker-compose.test.yml

**Files:**
- Create: `docker/docker-compose.test.yml`

### Task 3: Create the Docker Compose file

- [ ] **Create the `docker/` directory**

```bash
mkdir docker
```

- [ ] **Create `docker/docker-compose.test.yml`**

```yaml
# docker/docker-compose.test.yml
# Ephemeral self-hosted Convex backend for local integration tests.
# Started and torn down by scripts/test-local.ts.
# Uses SQLite (no DATABASE_URL) — data lives in the named volume below.

services:
  convex-backend:
    image: ghcr.io/get-convex/convex-backend:latest
    container_name: convex-test
    ports:
      - "3210:3210"
      - "3211:3211"
    environment:
      CONVEX_CLOUD_ORIGIN: "http://localhost:3210"
      CONVEX_SITE_ORIGIN: "http://localhost:3211"
      ENABLE_TEST_ENDPOINTS: "test-local-key"
    volumes:
      - convex-test-data:/convex/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3210/version"]
      interval: 2s
      timeout: 5s
      retries: 30
      start_period: 5s

volumes:
  convex-test-data:
```

Note: the service name is `convex-backend`; the `container_name` is `convex-test` (for display only). `docker compose exec` uses the **service name** (`convex-backend`), not the container name.

- [ ] **Verify Docker can parse the file** (requires Docker to be running):

```bash
docker compose -f docker/docker-compose.test.yml config
```

Expected: prints the resolved compose configuration with no errors.

- [ ] **Commit**

```bash
git add docker/docker-compose.test.yml
git commit -m "feat: add docker-compose.test.yml for local integration test container"
```

---

## Chunk 3: scripts/test-local.ts

**Files:**
- Create: `scripts/test-local.ts`

### Task 4: Write the orchestration script

Note on top-level `await`: this script uses top-level `await`. `tsx` handles this correctly regardless of `"type": "commonjs"` in `package.json`. Do not run `npx tsc --noEmit` on this file — it is invoked exclusively via `tsx`, not compiled by `tsc`.

Note on `docker compose exec`: use the **service name** `convex-backend` (not the container name `convex-test`). `docker compose exec` resolves services, not container names.

- [ ] **Create `scripts/test-local.ts`**

```ts
#!/usr/bin/env npx tsx
/**
 * Local integration test runner.
 *
 * Lifecycle:
 *   1. Start self-hosted Convex container (docker/docker-compose.test.yml)
 *   2. Wait for the backend to be healthy (poll /version on host port 3210)
 *   3. Generate an admin key inside the container
 *   4. Deploy Convex functions to the local instance
 *   5. Run vitest integration tests with env vars pointing at the container
 *   6. Tear down the container (always, via try/finally)
 *
 * Usage:
 *   npm run test:local
 */

import { spawnSync, spawn } from "node:child_process";

const COMPOSE_FILE = "docker/docker-compose.test.yml";
const BACKEND_URL = "http://localhost:3210";
const SITE_URL = "http://localhost:3211";
const TEST_API_KEY = "test-local-key";
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 60_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function run(cmd: string, args: string[], env?: NodeJS.ProcessEnv): void {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (exit ${result.status}): ${cmd} ${args.join(" ")}`);
  }
}

function capture(cmd: string, args: string[], env?: NodeJS.ProcessEnv): string {
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    throw new Error(
      `Command failed (exit ${result.status}): ${cmd} ${args.join(" ")}\n${result.stderr}`
    );
  }
  return result.stdout.trim();
}

async function waitForBackend(): Promise<void> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  process.stdout.write("[test-local] Waiting for backend");
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BACKEND_URL}/version`);
      if (res.ok) {
        process.stdout.write(" ready\n");
        return;
      }
    } catch {
      // not yet up
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Backend did not become healthy within ${POLL_TIMEOUT_MS / 1000}s`);
}

function runVitest(env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["vitest", "run", "-c", "vitest.integration.config.ts"],
      { stdio: "inherit", env: { ...process.env, ...env } }
    );
    child.on("close", resolve);
    child.on("error", reject);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

let exitCode = 0;

try {
  // Step 1: Start container
  console.log("[test-local] Starting container...");
  run("docker", ["compose", "-f", COMPOSE_FILE, "up", "-d", "--pull", "always"]);

  // Step 2: Wait for backend health (host-side poll of mapped port 3210)
  await waitForBackend();

  // Step 3: Generate admin key
  // Uses service name "convex-backend" (not container_name "convex-test")
  // -T disables TTY to avoid terminal control characters in captured output
  console.log("[test-local] Generating admin key...");
  const adminKey = capture("docker", [
    "compose", "-f", COMPOSE_FILE,
    "exec", "-T", "convex-backend",
    "./generate_admin_key.sh",
  ]);
  if (!adminKey) throw new Error("generate_admin_key.sh returned empty output");
  console.log("[test-local] Admin key obtained");

  // Step 4: Deploy Convex functions to the local instance
  console.log("[test-local] Deploying Convex functions...");
  run("npx", ["convex", "deploy", "--yes"], {
    CONVEX_SELF_HOSTED_URL: BACKEND_URL,
    CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
  });

  // Step 5: Run integration tests
  // TEST_TARGET=dev forces getTestConfig() to read CONVEX_URL (not CONVEX_PREPROD_URL),
  // making the run hermetic regardless of shell environment.
  console.log("[test-local] Running integration tests...");
  exitCode = await runVitest({
    TEST_TARGET: "dev",
    CONVEX_URL: BACKEND_URL,
    CONVEX_SITE_URL: SITE_URL,
    TEST_API_KEY,
  });
} finally {
  // Step 6: Always tear down — prevents orphaned containers on failure
  console.log("\n[test-local] Tearing down container...");
  try {
    run("docker", ["compose", "-f", COMPOSE_FILE, "down", "-v"]);
    console.log("[test-local] Container removed");
  } catch (err) {
    console.error("[test-local] Teardown failed:", err);
  }
}

process.exit(exitCode);
```

- [ ] **Commit**

```bash
git add scripts/test-local.ts
git commit -m "feat: add test-local.ts orchestration script for self-hosted integration tests"
```

---

## Chunk 4: package.json + end-to-end verification

**Files:**
- Modify: `package.json`

### Task 5: Add npm script

- [ ] **Read `package.json`**

- [ ] **Add `"test:local": "npx tsx scripts/test-local.ts"` to the `scripts` block**

  Final scripts block:

  ```json
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run",
    "test:integration": "vitest run -c vitest.integration.config.ts",
    "test:integration:preprod": "TEST_TARGET=preprod vitest run -c vitest.integration.config.ts",
    "test:all": "vitest run && vitest run -c vitest.integration.config.ts",
    "test:local": "npx tsx scripts/test-local.ts",
    "seed:dev": "npx tsx scripts/seed.ts",
    "seed:cleanup": "npx tsx scripts/cleanup.ts"
  }
  ```

- [ ] **Commit**

```bash
git add package.json
git commit -m "feat: add test:local npm script for self-hosted integration test runner"
```

---

### Task 6: End-to-end verification

- [ ] **Confirm Docker is running**

```bash
docker info
```

Expected: Docker daemon info printed, no error.

- [ ] **Run the full local test suite**

```bash
npm run test:local
```

Expected output (approximate — test counts will vary):
```
[test-local] Starting container...
[test-local] Waiting for backend.......ready
[test-local] Generating admin key...
[test-local] Admin key obtained
[test-local] Deploying Convex functions...
[test-local] Running integration tests...
[global-setup] Seeding integration test data...
[global-setup] Seed complete. ...

✓ foundation/auth.integration.ts
✓ foundation/rbac.integration.ts
... (remaining test files)

[test-local] Tearing down container...
[test-local] Container removed
```

- [ ] **Verify no containers left running after the test**

```bash
docker ps --filter name=convex-test
```

Expected: empty table (no `convex-test` container listed).

- [ ] **Verify no volumes left behind**

```bash
docker volume ls --filter name=convex-test
```

Expected: empty list.

- [ ] **Verify existing cloud-targeted tests still work** (only if `.env.test` is configured with a cloud deployment):

```bash
npm run test:integration
```

Expected: same behaviour as before — the `convexSiteUrl` fix is backwards-compatible; cloud deployments use the `.replace()` fallback when `CONVEX_SITE_URL` is absent.
