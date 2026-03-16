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
 * [FR-AD] Platform Configuration
 *
 * Tests platform-wide config key-value store:
 * - Get/set config values
 * - Upsert behavior (set updates existing key)
 * - Public read (get is a public query)
 * - Auth enforcement on write (set requires authentication)
 */
describe("[FR-AD] Platform Configuration", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  const testKey = `test_config_${Date.now()}`;

  beforeAll(() => {
    ctx = loadSeedContext();
    unauthenticatedClient = createTestClient();
  });

  async function clientFor(userKey: string) {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  // --------------------------------------------------------------------------
  // Public read access
  // --------------------------------------------------------------------------

  test("get returns null for non-existent config key", async () => {
    const result = await unauthenticatedClient.query(api.platformConfig.get, {
      key: "non_existent_key_12345",
    });

    expect(result).toBeNull();
  });

  test("get is accessible without authentication (public query)", async () => {
    // This should not throw — get is a public query
    const result = await unauthenticatedClient.query(api.platformConfig.get, {
      key: testKey,
    });

    // Key doesn't exist yet, should be null
    expect(result).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Auth enforcement on write
  // --------------------------------------------------------------------------

  test("unauthenticated user cannot set a config value", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.platformConfig.set, {
          key: testKey,
          value: "hacked",
        }),
      "Not authenticated"
    );
  });

  // --------------------------------------------------------------------------
  // CRUD happy path
  // --------------------------------------------------------------------------

  test("authenticated user can set a config value", async () => {
    const client = await clientFor("alice");

    const configId = await client.mutation(api.platformConfig.set, {
      key: testKey,
      value: { maxTenantsPerUser: 5, defaultTrialDays: 14 },
    });

    expectValidId(configId);
  });

  test("config value can be retrieved after set", async () => {
    const result = await unauthenticatedClient.query(api.platformConfig.get, {
      key: testKey,
    });

    expect(result).not.toBeNull();
    expect(result!.key).toBe(testKey);
    expect(result!.value).toEqual({ maxTenantsPerUser: 5, defaultTrialDays: 14 });
  });

  test("set upserts an existing key (updates value)", async () => {
    const client = await clientFor("alice");

    const configId = await client.mutation(api.platformConfig.set, {
      key: testKey,
      value: { maxTenantsPerUser: 10, defaultTrialDays: 30 },
    });

    // Should return the same document ID
    expectValidId(configId);

    const result = await unauthenticatedClient.query(api.platformConfig.get, {
      key: testKey,
    });

    expect(result!.value).toEqual({ maxTenantsPerUser: 10, defaultTrialDays: 30 });
  });

  test("config supports different value types (string)", async () => {
    const client = await clientFor("alice");
    const stringKey = `test_string_${Date.now()}`;

    await client.mutation(api.platformConfig.set, {
      key: stringKey,
      value: "simple string value",
    });

    const result = await unauthenticatedClient.query(api.platformConfig.get, {
      key: stringKey,
    });

    expect(result!.value).toBe("simple string value");
  });

  test("config supports different value types (number)", async () => {
    const client = await clientFor("alice");
    const numberKey = `test_number_${Date.now()}`;

    await client.mutation(api.platformConfig.set, {
      key: numberKey,
      value: 42,
    });

    const result = await unauthenticatedClient.query(api.platformConfig.get, {
      key: numberKey,
    });

    expect(result!.value).toBe(42);
  });

  test("config supports different value types (boolean)", async () => {
    const client = await clientFor("alice");
    const boolKey = `test_bool_${Date.now()}`;

    await client.mutation(api.platformConfig.set, {
      key: boolKey,
      value: true,
    });

    const result = await unauthenticatedClient.query(api.platformConfig.get, {
      key: boolKey,
    });

    expect(result!.value).toBe(true);
  });
});
