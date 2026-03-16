import { callTestEndpoint } from "../clients/convex-client";
import type { SeedScenario } from "./scenarios";
import type { SeedContext } from "./types";

/**
 * Generate a unique prefix for a test run to namespace all test data.
 */
export function generateTestPrefix(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `t-${timestamp}-${random}`;
}

/**
 * Run a seed scenario against the Convex deployment via HTTP endpoints.
 *
 * Seeds in dependency order:
 * 1. Tenants
 * 2. Users
 * 3. Memberships (requires tenant + user IDs)
 * 4. Roles/permissions (auto-seeded per tenant)
 *
 * Returns a SeedContext with all created entity IDs for test assertions.
 */
export async function runSeed(scenario: SeedScenario): Promise<SeedContext> {
  // Step 1: Seed tenants and users
  const seedResult = (await callTestEndpoint("/test/seed", {
    tenants: scenario.tenants.map((t) => ({ name: t.name, slug: t.slug })),
    users: scenario.users.map((u) => ({ name: u.name, email: u.email })),
    memberships: [], // will seed in step 2
  })) as {
    tenants: Record<string, string>;
    users: Record<string, string>;
    memberships: string[];
  };

  // Build lookup maps
  const tenantIdBySlug: Record<string, string> = seedResult.tenants;
  const userIdByEmail: Record<string, string> = seedResult.users;

  // Map keys to IDs
  const tenantIdByKey: Record<string, string> = {};
  for (const t of scenario.tenants) {
    tenantIdByKey[t.key] = tenantIdBySlug[t.slug];
  }

  const userIdByKey: Record<string, string> = {};
  for (const u of scenario.users) {
    userIdByKey[u.key] = userIdByEmail[u.email];
  }

  // Step 2: Seed memberships (need userId and tenantId)
  const membershipPayload = scenario.memberships.map((m) => ({
    userId: userIdByKey[m.userKey],
    tenantId: tenantIdByKey[m.tenantKey],
    role: m.role,
    isPrimaryGym: m.isPrimaryGym,
  }));

  const membershipResult = (await callTestEndpoint("/test/seed", {
    memberships: membershipPayload,
  })) as { memberships: string[] };

  // Build SeedContext
  const ctx: SeedContext = {
    prefix: scenario.tenants[0]?.slug.split("-").slice(0, 3).join("-") ?? "unknown",
    tenants: {},
    users: {},
    memberships: {},
  };

  for (const t of scenario.tenants) {
    ctx.tenants[t.key] = {
      id: tenantIdByKey[t.key],
      slug: t.slug,
    };
  }

  for (const u of scenario.users) {
    ctx.users[u.key] = {
      id: userIdByKey[u.key],
      email: u.email,
    };
  }

  for (let i = 0; i < scenario.memberships.length; i++) {
    const m = scenario.memberships[i];
    const key = `${m.userKey}:${m.tenantKey}`;
    ctx.memberships[key] = {
      id: membershipResult.memberships[i],
    };
  }

  return ctx;
}
