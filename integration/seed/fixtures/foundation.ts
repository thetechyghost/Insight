import { foundationScenario } from "../scenarios";
import { runSeed, generateTestPrefix } from "../seed-runner";
import type { SeedContext } from "../types";

/**
 * Seed the foundation scenario — users, tenants, memberships, and roles.
 *
 * This is the base fixture that most integration tests depend on.
 * It creates two tenants with users across all role types.
 */
export async function seedFoundation(): Promise<SeedContext> {
  const prefix = generateTestPrefix();
  const scenario = foundationScenario(prefix);
  return runSeed(scenario);
}
