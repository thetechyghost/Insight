#!/usr/bin/env npx tsx
/**
 * CLI cleanup script — removes test data from a Convex deployment by prefix.
 *
 * Usage:
 *   npm run seed:cleanup -- --prefix <prefix>
 *   TEST_TARGET=preprod npm run seed:cleanup -- --prefix <prefix>
 *
 * The prefix is printed at the end of every `npm run seed:dev` run.
 */

import "dotenv/config";
import { callTestEndpoint } from "../integration/clients/convex-client";
import { getTestConfig } from "../integration/config/env";

// ── Argument parsing ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const prefix = getArg("--prefix");

if (!prefix) {
  console.error("Usage: npm run seed:cleanup -- --prefix <prefix>");
  process.exit(1);
}

// ── Run ───────────────────────────────────────────────────────────────────────

const config = getTestConfig();

console.log(`\n[cleanup] Target: ${config.target}`);
console.log(`[cleanup] Prefix: ${prefix}\n`);

if (config.target === "preprod") {
  console.warn(
    "[cleanup] Pre-prod mode — hard deletes are skipped. Data will be cleaned by scheduled maintenance job."
  );
  process.exit(0);
}

try {
  const result = await callTestEndpoint("/test/cleanup", { prefix });
  console.log("✓ Cleanup complete\n");
  console.log("Result:", JSON.stringify(result, null, 2));
} catch (err) {
  console.error("[cleanup] Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
