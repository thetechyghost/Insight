import type { ConvexHttpClient } from "convex/browser";
import type { SeedContext } from "../types";

/**
 * Seed equipment data — devices, maintenance records.
 */
export async function seedEquipment(
  _client: ConvexHttpClient,
  _ctx: SeedContext
): Promise<void> {
  // TODO: Implement once equipment mutations are deployed.
  // Will create:
  // - 2-3 devices (RowErg, BikeErg, SkiErg)
  // - 1-2 maintenance records
  // - HR zone configurations
  // - Wearable connection records
  console.log("[seed:equipment] Placeholder — no equipment data seeded yet");
}

export async function cleanupEquipment(
  _client: ConvexHttpClient,
  _ctx: SeedContext
): Promise<void> {
  // Cleanup handled by prefix-based cleanup in foundation
}
