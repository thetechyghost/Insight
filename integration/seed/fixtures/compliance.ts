import type { ConvexHttpClient } from "convex/browser";
import type { SeedContext } from "../types";

/**
 * Seed compliance data — waivers, consent records, audit logs.
 */
export async function seedCompliance(
  _client: ConvexHttpClient,
  _ctx: SeedContext
): Promise<void> {
  // TODO: Implement once compliance mutations are deployed.
  // Will create:
  // - 1-2 waiver templates
  // - Signed waivers for Dave and Eve
  // - Consent records
  console.log("[seed:compliance] Placeholder — no compliance data seeded yet");
}

export async function cleanupCompliance(
  _client: ConvexHttpClient,
  _ctx: SeedContext
): Promise<void> {
  // Cleanup handled by prefix-based cleanup in foundation
}
