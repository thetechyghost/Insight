import type { ConvexHttpClient } from "convex/browser";
import type { SeedContext } from "../types";

/**
 * Seed messaging data — conversations, messages, notifications.
 */
export async function seedMessaging(
  _client: ConvexHttpClient,
  _ctx: SeedContext
): Promise<void> {
  // TODO: Implement once messaging mutations are deployed.
  // Will create:
  // - 1-2 direct conversations (coach-athlete)
  // - 3-5 messages
  // - Notification records
  console.log("[seed:messaging] Placeholder — no messaging data seeded yet");
}

export async function cleanupMessaging(
  _client: ConvexHttpClient,
  _ctx: SeedContext
): Promise<void> {
  // Cleanup handled by prefix-based cleanup in foundation
}
