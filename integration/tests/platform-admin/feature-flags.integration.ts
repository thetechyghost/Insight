import { describe, test, expect, beforeAll } from "vitest";
import { ConvexHttpClient } from "convex/browser";
import { createTestClient, createAuthenticatedClient } from "../../clients/convex-client";
import { getAuthToken } from "../../clients/auth";
import { loadSeedContext } from "../../helpers/load-context";
import { expectToThrow, expectValidId } from "../../helpers/assertions";
import { api } from "../../../convex/_generated/api";
import type { SeedContext } from "../../seed/types";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * [FR-AD] Feature Flags
 *
 * Tests feature flag CRUD and evaluation:
 * - Create, list, update, remove feature flags
 * - isEnabled evaluation (enabled, disabled, tenant-targeted)
 * - getByName public query
 * - Auth enforcement (list/create/update/remove require auth)
 * - Duplicate name prevention
 */
describe("[FR-AD] Feature Flags", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  const uniqueSuffix = Date.now();
  const testFlagName = `test_flag_${uniqueSuffix}`;
  const tenantFlagName = `tenant_flag_${uniqueSuffix}`;

  let testFlagId: Id<"feature_flags">;
  let tenantFlagId: Id<"feature_flags">;

  beforeAll(() => {
    ctx = loadSeedContext();
    unauthenticatedClient = createTestClient();
  });

  async function clientFor(userKey: string) {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  // --------------------------------------------------------------------------
  // Auth enforcement
  // --------------------------------------------------------------------------

  test("unauthenticated user cannot list feature flags", async () => {
    await expectToThrow(
      () => unauthenticatedClient.query(api.featureFlags.list, {}),
      "Not authenticated"
    );
  });

  test("unauthenticated user cannot create a feature flag", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.featureFlags.create, {
          name: "hacked_flag",
          status: "enabled",
        }),
      "Not authenticated"
    );
  });

  // --------------------------------------------------------------------------
  // CRUD happy path
  // --------------------------------------------------------------------------

  test("authenticated user can create a feature flag (enabled)", async () => {
    const client = await clientFor("alice");

    testFlagId = await client.mutation(api.featureFlags.create, {
      name: testFlagName,
      status: "enabled",
    });

    expectValidId(testFlagId);
  });

  test("duplicate flag name is rejected", async () => {
    const client = await clientFor("alice");

    await expectToThrow(
      () =>
        client.mutation(api.featureFlags.create, {
          name: testFlagName,
          status: "enabled",
        }),
      "already exists"
    );
  });

  test("authenticated user can create a tenant-targeted flag", async () => {
    const client = await clientFor("alice");

    tenantFlagId = await client.mutation(api.featureFlags.create, {
      name: tenantFlagName,
      status: "enabled",
      targetTenantIds: [ctx.tenants.cfAlpha.id as Id<"tenants">],
    });

    expectValidId(tenantFlagId);
  });

  test("authenticated user can list feature flags", async () => {
    const client = await clientFor("alice");

    const flags = await client.query(api.featureFlags.list, {});

    expect(flags.length).toBeGreaterThanOrEqual(2);
    const names = flags.map((f: any) => f.name);
    expect(names).toContain(testFlagName);
    expect(names).toContain(tenantFlagName);
  });

  test("authenticated user can update a feature flag", async () => {
    const client = await clientFor("alice");

    await client.mutation(api.featureFlags.update, {
      flagId: testFlagId,
      status: "disabled",
    });

    const flag = await unauthenticatedClient.query(api.featureFlags.getByName, {
      name: testFlagName,
    });

    expect(flag).not.toBeNull();
    expect(flag!.status).toBe("disabled");
  });

  // --------------------------------------------------------------------------
  // Public queries (getByName, isEnabled)
  // --------------------------------------------------------------------------

  test("getByName is accessible without authentication (public query)", async () => {
    const flag = await unauthenticatedClient.query(api.featureFlags.getByName, {
      name: testFlagName,
    });

    expect(flag).not.toBeNull();
    expect(flag!.name).toBe(testFlagName);
  });

  test("getByName returns null for non-existent flag", async () => {
    const flag = await unauthenticatedClient.query(api.featureFlags.getByName, {
      name: "non_existent_flag_12345",
    });

    expect(flag).toBeNull();
  });

  test("isEnabled returns false for disabled flag", async () => {
    const result = await unauthenticatedClient.query(api.featureFlags.isEnabled, {
      name: testFlagName,
    });

    expect(result).toBe(false);
  });

  test("isEnabled returns false for non-existent flag", async () => {
    const result = await unauthenticatedClient.query(api.featureFlags.isEnabled, {
      name: "non_existent_flag_12345",
    });

    expect(result).toBe(false);
  });

  test("isEnabled returns true for tenant-targeted flag with matching tenant", async () => {
    const result = await unauthenticatedClient.query(api.featureFlags.isEnabled, {
      name: tenantFlagName,
      tenantId: ctx.tenants.cfAlpha.id as Id<"tenants">,
    });

    expect(result).toBe(true);
  });

  test("isEnabled returns false for tenant-targeted flag with non-matching tenant", async () => {
    const result = await unauthenticatedClient.query(api.featureFlags.isEnabled, {
      name: tenantFlagName,
      tenantId: ctx.tenants.cfBeta.id as Id<"tenants">,
    });

    expect(result).toBe(false);
  });

  test("re-enable flag and verify isEnabled", async () => {
    const client = await clientFor("alice");

    await client.mutation(api.featureFlags.update, {
      flagId: testFlagId,
      status: "enabled",
    });

    const result = await unauthenticatedClient.query(api.featureFlags.isEnabled, {
      name: testFlagName,
    });

    expect(result).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Percentage rollout
  // --------------------------------------------------------------------------

  test("percentage_rollout flag can be created", async () => {
    const client = await clientFor("alice");
    const rolloutName = `rollout_flag_${uniqueSuffix}`;

    const flagId = await client.mutation(api.featureFlags.create, {
      name: rolloutName,
      status: "percentage_rollout",
      rolloutPercentage: 100, // 100% so it always evaluates true
    });
    expectValidId(flagId);

    const result = await unauthenticatedClient.query(api.featureFlags.isEnabled, {
      name: rolloutName,
    });
    // With 100% rollout, should be true
    expect(result).toBe(true);

    // Clean up
    await client.mutation(api.featureFlags.remove, { flagId });
  });

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  test("cleanup: remove test feature flags", async () => {
    const client = await clientFor("alice");

    await client.mutation(api.featureFlags.remove, { flagId: testFlagId });
    await client.mutation(api.featureFlags.remove, { flagId: tenantFlagId });

    const flagAfterRemove = await unauthenticatedClient.query(api.featureFlags.getByName, {
      name: testFlagName,
    });
    expect(flagAfterRemove).toBeNull();
  });

  test("removing a non-existent flag throws", async () => {
    const client = await clientFor("alice");

    await expectToThrow(
      () =>
        client.mutation(api.featureFlags.remove, { flagId: testFlagId }),
      "not found"
    );
  });
});
