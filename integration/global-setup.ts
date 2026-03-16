import * as fs from "node:fs";
import * as path from "node:path";
import { seedFoundation } from "./seed/fixtures/foundation";
import { cleanup } from "./seed/cleanup";
import type { SeedContext } from "./seed/types";

const CONTEXT_FILE = path.join(__dirname, ".seed-context.json");

let seedContext: SeedContext | null = null;

/**
 * vitest globalSetup: runs once before all integration tests.
 *
 * 1. Validates the test environment is reachable
 * 2. Seeds foundation data
 * 3. Writes SeedContext to a temp file for test files to load
 */
export async function setup() {
  console.log("\n[global-setup] Seeding integration test data...\n");

  try {
    seedContext = await seedFoundation();
    fs.writeFileSync(CONTEXT_FILE, JSON.stringify(seedContext, null, 2));
    console.log(`[global-setup] Seed complete. Context written to ${CONTEXT_FILE}`);
    console.log(`[global-setup] Prefix: ${seedContext.prefix}`);
    console.log(
      `[global-setup] Tenants: ${Object.keys(seedContext.tenants).join(", ")}`
    );
    console.log(
      `[global-setup] Users: ${Object.keys(seedContext.users).join(", ")}`
    );
  } catch (error) {
    console.error("[global-setup] Seed failed:", error);
    throw error;
  }
}

/**
 * vitest globalTeardown: runs once after all integration tests.
 */
export async function teardown() {
  if (seedContext) {
    console.log("\n[global-teardown] Cleaning up test data...\n");
    try {
      await cleanup(seedContext);
    } catch (error) {
      console.error("[global-teardown] Cleanup failed:", error);
    }
  }

  // Remove temp context file
  if (fs.existsSync(CONTEXT_FILE)) {
    fs.unlinkSync(CONTEXT_FILE);
  }
}
