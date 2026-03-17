#!/usr/bin/env npx tsx
/**
 * Local development environment launcher.
 *
 * Lifecycle:
 *   1. Start self-hosted Convex container (docker/docker-compose.test.yml)
 *   2. Wait for the backend to be healthy (poll /version on host port 3210)
 *   3. Generate an admin key inside the container
 *   4. Deploy Convex functions to the local instance
 *   5. Enable test endpoints (needed for seed/cleanup)
 *   6. Seed foundation scenario data
 *   7. Start the super-admin UI dev server (Vite on port 5174)
 *   8. Wait — print instructions and block until Ctrl+C
 *   9. On exit: tear down the container (always, via signal/finally)
 *
 * Usage:
 *   npm run dev:local
 */

import { spawnSync, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const COMPOSE_FILE = "docker/docker-compose.test.yml";
const BACKEND_URL = "http://localhost:3210";
const SITE_URL = "http://localhost:3211";
const UI_URL = "http://localhost:5174";
const TEST_API_KEY = "test-local-key";
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 60_000;
const SUPER_ADMIN_DIR = path.resolve("apps/super-admin");
const ENV_LOCAL_FILE = path.join(SUPER_ADMIN_DIR, ".env.local");

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
  process.stdout.write("[dev-local] Waiting for backend");
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

async function seedData(adminKey: string): Promise<string> {
  // Inline minimal seed to avoid dotenv/config interference — call the HTTP
  // test endpoint directly the same way the seed runner does.
  const { foundationScenario } = await import("../integration/seed/scenarios");
  const { generateTestPrefix, runSeed } = await import("../integration/seed/seed-runner");

  const prefix = generateTestPrefix();
  const scenario = foundationScenario(prefix);

  // Point the seed runner at the local container via env vars it reads.
  process.env.CONVEX_URL = BACKEND_URL;
  process.env.CONVEX_SITE_URL = SITE_URL;
  process.env.TEST_API_KEY = TEST_API_KEY;
  process.env.TEST_TARGET = "dev";

  const ctx = await runSeed(scenario);
  return prefix;
}

function writeEnvLocal(adminEmail?: string): void {
  let contents = `VITE_CONVEX_URL=${BACKEND_URL}\n`;
  if (adminEmail) {
    contents += `VITE_TEST_ADMIN_EMAIL=${adminEmail}\n`;
  }
  fs.writeFileSync(ENV_LOCAL_FILE, contents, "utf8");
}

function removeEnvLocal(): void {
  try {
    fs.unlinkSync(ENV_LOCAL_FILE);
  } catch {
    // ignore if already gone
  }
}

function startVite(): ReturnType<typeof spawn> {
  // Ensure deps are installed in the sub-package before starting.
  const nmDir = path.join(SUPER_ADMIN_DIR, "node_modules");
  if (!fs.existsSync(nmDir)) {
    console.log("[dev-local] Installing super-admin dependencies...");
    const result = spawnSync("npm", ["install"], {
      stdio: "inherit",
      cwd: SUPER_ADMIN_DIR,
    });
    if (result.status !== 0) {
      throw new Error("npm install failed in apps/super-admin");
    }
  }

  return spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    cwd: SUPER_ADMIN_DIR,
  });
}

function teardown(): void {
  console.log("\n[dev-local] Tearing down container...");
  try {
    run("docker", ["compose", "-f", COMPOSE_FILE, "down", "-v"]);
    console.log("[dev-local] Container removed");
  } catch (err) {
    console.error("[dev-local] Teardown failed:", err);
  }
  removeEnvLocal();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  let viteProcess: ReturnType<typeof spawn> | null = null;
  let shuttingDown = false;

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    viteProcess?.kill();
    teardown();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    // Step 1: Start container
    console.log("[dev-local] Starting container...");
    run("docker", ["compose", "-f", COMPOSE_FILE, "up", "-d", "--pull", "always"]);

    // Step 2: Wait for backend health
    await waitForBackend();

    // Step 3: Generate admin key
    console.log("[dev-local] Generating admin key...");
    const adminKey = capture("docker", [
      "compose", "-f", COMPOSE_FILE,
      "exec", "-T", "convex-backend",
      "./generate_admin_key.sh",
    ]);
    if (!adminKey) throw new Error("generate_admin_key.sh returned empty output");
    console.log("[dev-local] Admin key obtained");

    // Step 4: Deploy Convex functions
    console.log("[dev-local] Deploying Convex functions...");
    run("npx", ["convex", "deploy", "--yes", "--typecheck=disable"], {
      CONVEX_SELF_HOSTED_URL: BACKEND_URL,
      CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
    });

    // Step 5: Enable test endpoints
    console.log("[dev-local] Enabling test endpoints...");
    run("npx", ["convex", "env", "set", "ENABLE_TEST_ENDPOINTS", TEST_API_KEY], {
      CONVEX_SELF_HOSTED_URL: BACKEND_URL,
      CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
    });

    // Step 6: Seed foundation data
    console.log("[dev-local] Seeding foundation data...");
    const prefix = await seedData(adminKey);
    const adminEmail = `alice+${prefix}@test.insight.app`;
    console.log(`[dev-local] Seed complete (prefix: ${prefix})`);
    console.log(`[dev-local] Super admin login: ${adminEmail}`);
    console.log(`[dev-local] To clean up seeded data later:`);
    console.log(`  CONVEX_URL=${BACKEND_URL} CONVEX_SITE_URL=${SITE_URL} TEST_API_KEY=${TEST_API_KEY} npm run seed:cleanup -- --prefix ${prefix}`);

    // Step 7: Write .env.local and start Vite
    console.log("[dev-local] Writing apps/super-admin/.env.local...");
    writeEnvLocal(adminEmail);

    console.log("[dev-local] Starting super-admin UI...");
    viteProcess = startVite();

    viteProcess.on("error", (err) => {
      console.error("[dev-local] Vite error:", err);
    });

    viteProcess.on("close", (code) => {
      if (!shuttingDown) {
        console.log(`[dev-local] Vite exited (code ${code}), shutting down...`);
        shutdown();
      }
    });

    // Step 8: Block and print instructions
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Local dev environment ready                                 ║
║                                                              ║
║  Convex backend:  ${BACKEND_URL}                    ║
║  Convex site:     ${SITE_URL}                    ║
║  UI:              ${UI_URL}                       ║
║                                                              ║
║  Press Ctrl+C to stop and tear down the container            ║
╚══════════════════════════════════════════════════════════════╝
`);

    // Keep the process alive — Vite runs as a child process.
    await new Promise<void>((resolve) => {
      process.on("SIGINT", resolve);
      process.on("SIGTERM", resolve);
    });
  } catch (err) {
    console.error("[dev-local] Fatal error:", err);
    viteProcess?.kill();
    teardown();
    process.exit(1);
  }
}

main();
