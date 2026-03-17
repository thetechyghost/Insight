#!/usr/bin/env npx tsx
/**
 * CLI seed script — seeds foundation data into a Convex deployment.
 *
 * Usage:
 *   npm run seed:dev                          # seed foundation scenario
 *   npm run seed:dev -- --scenario foundation # same (default)
 *   npm run seed:dev -- --prefix my-test      # use a fixed prefix
 *   TEST_TARGET=preprod npm run seed:dev      # seed against pre-prod
 *
 * Prints created entity IDs to stdout so you can use them in manual testing.
 * Save the printed prefix to clean up later with: npm run seed:cleanup -- --prefix <prefix>
 */

import "dotenv/config";
import { foundationScenario, generateTestPrefix } from "../integration/seed/scenarios";
import { runSeed } from "../integration/seed/seed-runner";

// ── Argument parsing ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const scenario = getArg("--scenario") ?? "foundation";
const prefix = getArg("--prefix") ?? generateTestPrefix();

// ── Run ───────────────────────────────────────────────────────────────────────

const SUPPORTED_SCENARIOS = ["foundation"] as const;

if (!SUPPORTED_SCENARIOS.includes(scenario as (typeof SUPPORTED_SCENARIOS)[number])) {
  console.error(`Unknown scenario: "${scenario}". Supported: ${SUPPORTED_SCENARIOS.join(", ")}`);
  process.exit(1);
}

console.log(`\n[seed] Target:   ${process.env.TEST_TARGET ?? "dev"}`);
console.log(`[seed] Scenario: ${scenario}`);
console.log(`[seed] Prefix:   ${prefix}\n`);

try {
  const ctx = await runSeed(foundationScenario(prefix));

  console.log("✓ Seed complete\n");

  console.log("─── Tenants ──────────────────────────────────────");
  for (const [key, tenant] of Object.entries(ctx.tenants)) {
    console.log(`  ${key.padEnd(12)} id=${tenant.id}  slug=${tenant.slug}`);
  }

  console.log("\n─── Users ────────────────────────────────────────");
  for (const [key, user] of Object.entries(ctx.users)) {
    console.log(`  ${key.padEnd(12)} id=${user.id}  email=${user.email}`);
  }

  console.log("\n─── Memberships ──────────────────────────────────");
  for (const [key, membership] of Object.entries(ctx.memberships)) {
    console.log(`  ${key.padEnd(24)} id=${membership.id}`);
  }

  console.log(`\n─── To clean up ──────────────────────────────────`);
  console.log(`  npm run seed:cleanup -- --prefix ${prefix}\n`);
} catch (err) {
  console.error("[seed] Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
