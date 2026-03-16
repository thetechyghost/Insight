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
 * [FR-WD] Wearable Connections
 *
 * Tests wearable device connection management:
 * - Create, list, get by provider, disconnect
 * - Auth enforcement
 * - Ownership enforcement (can only manage own connections)
 * - Tenant isolation
 */
describe("[FR-WD] Wearable Connections", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  let daveConnectionId: Id<"wearable_connections">;

  beforeAll(() => {
    ctx = loadSeedContext();
    unauthenticatedClient = createTestClient();
  });

  async function clientFor(userKey: string) {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  const tenantId = () => ctx.tenants.cfAlpha.id as Id<"tenants">;

  // --------------------------------------------------------------------------
  // Auth enforcement
  // --------------------------------------------------------------------------

  test("unauthenticated user cannot list wearable connections", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.query(api.wearableConnections.listMine, {
          tenantId: tenantId(),
        }),
      "Not authenticated"
    );
  });

  test("unauthenticated user cannot create a wearable connection", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.wearableConnections.create, {
          tenantId: tenantId(),
          provider: "garmin",
        }),
      "Not authenticated"
    );
  });

  // --------------------------------------------------------------------------
  // CRUD happy path
  // --------------------------------------------------------------------------

  test("athlete can connect a wearable (garmin)", async () => {
    const client = await clientFor("dave");

    daveConnectionId = await client.mutation(api.wearableConnections.create, {
      tenantId: tenantId(),
      provider: "garmin",
      accessToken: "test-garmin-access-token",
      refreshToken: "test-garmin-refresh-token",
      expiresAt: Date.now() + 3600000,
      scopes: ["activity", "heartrate", "sleep"],
    });

    expectValidId(daveConnectionId);
  });

  test("athlete can list their wearable connections", async () => {
    const client = await clientFor("dave");

    const connections = await client.query(api.wearableConnections.listMine, {
      tenantId: tenantId(),
    });

    expect(connections.length).toBeGreaterThan(0);
    const garmin = connections.find((c: any) => c.provider === "garmin");
    expect(garmin).toBeDefined();
    expect(garmin!.syncStatus).toBe("active");
    expect(garmin!.scopes).toContain("heartrate");
  });

  test("athlete can get wearable connection by provider", async () => {
    const client = await clientFor("dave");

    const connection = await client.query(api.wearableConnections.getByProvider, {
      tenantId: tenantId(),
      provider: "garmin",
    });

    expect(connection).not.toBeNull();
    expect(connection!.provider).toBe("garmin");
    expect(connection!.accessToken).toBe("test-garmin-access-token");
  });

  test("getByProvider returns null for unconnected provider", async () => {
    const client = await clientFor("dave");

    const connection = await client.query(api.wearableConnections.getByProvider, {
      tenantId: tenantId(),
      provider: "whoop",
    });

    expect(connection).toBeNull();
  });

  test("athlete can connect a second provider (apple_health)", async () => {
    const client = await clientFor("dave");

    const appleId = await client.mutation(api.wearableConnections.create, {
      tenantId: tenantId(),
      provider: "apple_health",
      scopes: ["activity", "heartrate"],
    });
    expectValidId(appleId);

    const connections = await client.query(api.wearableConnections.listMine, {
      tenantId: tenantId(),
    });
    expect(connections.length).toBeGreaterThanOrEqual(2);

    // Clean up apple_health connection
    await client.mutation(api.wearableConnections.disconnect, {
      tenantId: tenantId(),
      connectionId: appleId,
    });
  });

  // --------------------------------------------------------------------------
  // Ownership enforcement
  // --------------------------------------------------------------------------

  test("another user cannot disconnect someone else's wearable", async () => {
    const client = await clientFor("eve");

    await expectToThrow(
      () =>
        client.mutation(api.wearableConnections.disconnect, {
          tenantId: tenantId(),
          connectionId: daveConnectionId,
        }),
      "does not belong to you"
    );
  });

  test("eve sees only her own connections (empty initially)", async () => {
    const client = await clientFor("eve");

    const connections = await client.query(api.wearableConnections.listMine, {
      tenantId: tenantId(),
    });

    const daveConn = connections.find((c: any) => c._id === daveConnectionId);
    expect(daveConn).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Tenant isolation
  // --------------------------------------------------------------------------

  test("grace (cf-beta) cannot list wearable connections in cf-alpha", async () => {
    const client = await clientFor("grace");

    await expectToThrow(
      () =>
        client.query(api.wearableConnections.listMine, { tenantId: tenantId() }),
      "not a member"
    );
  });

  test("grace (cf-beta) cannot create a wearable connection in cf-alpha", async () => {
    const client = await clientFor("grace");

    await expectToThrow(
      () =>
        client.mutation(api.wearableConnections.create, {
          tenantId: tenantId(),
          provider: "garmin",
        }),
      "not a member"
    );
  });

  // --------------------------------------------------------------------------
  // Disconnect flow
  // --------------------------------------------------------------------------

  test("athlete can disconnect their own wearable", async () => {
    const client = await clientFor("dave");

    await client.mutation(api.wearableConnections.disconnect, {
      tenantId: tenantId(),
      connectionId: daveConnectionId,
    });

    const connections = await client.query(api.wearableConnections.listMine, {
      tenantId: tenantId(),
    });
    const found = connections.find((c: any) => c._id === daveConnectionId);
    expect(found).toBeUndefined();
  });

  test("getByProvider returns null after disconnect", async () => {
    const client = await clientFor("dave");

    const connection = await client.query(api.wearableConnections.getByProvider, {
      tenantId: tenantId(),
      provider: "garmin",
    });

    expect(connection).toBeNull();
  });
});
