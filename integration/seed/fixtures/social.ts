import type { ConvexHttpClient } from "convex/browser";
import type { SeedContext } from "../types";

/**
 * Seed social and gamification data.
 */
export async function seedSocial(
  _client: ConvexHttpClient,
  _ctx: SeedContext
): Promise<void> {
  // TODO: Implement once social mutations are deployed.
  // Will create:
  // - Follow relationships between athletes
  // - 1-2 challenges
  // - Badge definitions
  // - Activity feed entries
  console.log("[seed:social] Placeholder — no social data seeded yet");
}

export async function cleanupSocial(
  _client: ConvexHttpClient,
  _ctx: SeedContext
): Promise<void> {
  // Cleanup handled by prefix-based cleanup in foundation
}
