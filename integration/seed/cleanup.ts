import { callTestEndpoint } from "../clients/convex-client";
import { getTestConfig } from "../config/env";
import type { SeedContext } from "./types";

/**
 * Clean up test data created by a seed run.
 *
 * Strategy depends on the target environment:
 * - dev: hard-delete all test records matching the prefix
 * - preprod: soft-delete only (mark as cancelled/inactive)
 */
export async function cleanup(ctx: SeedContext): Promise<void> {
  const config = getTestConfig();

  if (config.target === "preprod") {
    console.log(
      `[cleanup] Pre-prod mode — skipping hard delete. Prefix: ${ctx.prefix}`
    );
    // In pre-prod, we rely on test data being namespaced and eventually
    // cleaned by a scheduled maintenance job.
    return;
  }

  console.log(`[cleanup] Cleaning up test data with prefix: ${ctx.prefix}`);

  const result = await callTestEndpoint("/test/cleanup", {
    prefix: ctx.prefix,
  });

  console.log("[cleanup] Result:", result);
}
