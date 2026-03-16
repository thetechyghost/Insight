import type { ConvexHttpClient } from "convex/browser";
import type { SeedContext } from "../types";

/**
 * Seed class and scheduling data.
 */
export async function seedClasses(
  _client: ConvexHttpClient,
  _ctx: SeedContext
): Promise<void> {
  // TODO: Implement once class mutations are deployed.
  // Will create:
  // - 2-3 class types (CrossFit, Open Gym, PT)
  // - 3-5 class sessions
  // - 5-10 registrations
  // - 1-2 schedule templates
  console.log("[seed:classes] Placeholder — no class data seeded yet");
}

export async function cleanupClasses(
  _client: ConvexHttpClient,
  _ctx: SeedContext
): Promise<void> {
  // Cleanup handled by prefix-based cleanup in foundation
}
