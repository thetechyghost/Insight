import type { ConvexHttpClient } from "convex/browser";
import type { SeedContext } from "../types";

/**
 * Seed billing data — membership plans, subscriptions, invoices.
 */
export async function seedBilling(
  _client: ConvexHttpClient,
  _ctx: SeedContext
): Promise<void> {
  // TODO: Implement once billing mutations are deployed.
  // Will create:
  // - 2-3 membership plans (Basic, Premium, Unlimited)
  // - Subscriptions for Dave and Eve
  // - 1-2 invoices
  console.log("[seed:billing] Placeholder — no billing data seeded yet");
}

export async function cleanupBilling(
  _client: ConvexHttpClient,
  _ctx: SeedContext
): Promise<void> {
  // Cleanup handled by prefix-based cleanup in foundation
}
