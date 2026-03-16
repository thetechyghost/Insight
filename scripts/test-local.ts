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
    child.on("close", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
    child.on("error", reject);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<number> {
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
    run("npx", ["convex", "deploy", "--yes", "--typecheck=disable"], {
      CONVEX_SELF_HOSTED_URL: BACKEND_URL,
      CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
    });

    // Step 4b: Set ENABLE_TEST_ENDPOINTS in the Convex deployment env store
    // (Container-level env vars are NOT exposed to Convex function process.env —
    // Convex functions read from the deployment's own env store, set via convex env.)
    console.log("[test-local] Enabling test endpoints...");
    run("npx", ["convex", "env", "set", "ENABLE_TEST_ENDPOINTS", TEST_API_KEY], {
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

  return exitCode;
}

main().then(process.exit).catch((err) => {
  console.error("[test-local] Fatal error:", err);
  process.exit(1);
});
