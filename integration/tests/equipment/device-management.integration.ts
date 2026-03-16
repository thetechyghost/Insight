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
 * [FR-CE] Device Management
 *
 * Tests gym equipment device CRUD:
 * - Register, list, get by ID, update, deregister
 * - Auth enforcement (unauthenticated rejected)
 * - RBAC enforcement (admin+ for mutations, coach+ for listing)
 * - Tenant isolation
 */
describe("[FR-CE] Device Management", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  let testDeviceId: Id<"devices">;

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

  test("unauthenticated user cannot list devices", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.query(api.devices.listByTenant, {
          tenantId: tenantId(),
        }),
      "Not authenticated"
    );
  });

  test("unauthenticated user cannot register a device", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.devices.register, {
          tenantId: tenantId(),
          name: "Hacked Rower",
          type: "RowErg",
        }),
      "Not authenticated"
    );
  });

  // --------------------------------------------------------------------------
  // RBAC enforcement — listing (coach+)
  // --------------------------------------------------------------------------

  test("athlete cannot list devices (coach+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.query(api.devices.listByTenant, { tenantId: tenantId() }),
      "Insufficient role"
    );
  });

  test("coach can list devices", async () => {
    const client = await clientFor("bob");

    const devices = await client.query(api.devices.listByTenant, {
      tenantId: tenantId(),
    });

    // May be empty if no seed devices, that's fine
    expect(Array.isArray(devices)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // RBAC enforcement — mutations (admin+)
  // --------------------------------------------------------------------------

  test("athlete cannot register a device (admin+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.devices.register, {
          tenantId: tenantId(),
          name: "Athlete Rower",
          type: "RowErg",
        }),
      "Insufficient role"
    );
  });

  test("coach cannot register a device (admin+ required)", async () => {
    const client = await clientFor("bob");

    await expectToThrow(
      () =>
        client.mutation(api.devices.register, {
          tenantId: tenantId(),
          name: "Coach Rower",
          type: "RowErg",
        }),
      "Insufficient role"
    );
  });

  // --------------------------------------------------------------------------
  // CRUD happy path (admin+)
  // --------------------------------------------------------------------------

  test("admin can register a device", async () => {
    const client = await clientFor("carol");

    testDeviceId = await client.mutation(api.devices.register, {
      tenantId: tenantId(),
      name: "Rower #1",
      type: "RowErg",
      serialNumber: "C2-ROW-12345",
      locationLabel: "Bay 1",
      firmwareVersion: "1.0.0",
    });

    expectValidId(testDeviceId);
  });

  test("any member can get a device by ID", async () => {
    const client = await clientFor("dave");

    const device = await client.query(api.devices.getById, {
      tenantId: tenantId(),
      deviceId: testDeviceId,
    });

    expect(device.name).toBe("Rower #1");
    expect(device.type).toBe("RowErg");
    expect(device.serialNumber).toBe("C2-ROW-12345");
    expect(device.locationLabel).toBe("Bay 1");
    expect(device.isOnline).toBe(false);
  });

  test("admin can update device details", async () => {
    const client = await clientFor("carol");

    await client.mutation(api.devices.update, {
      tenantId: tenantId(),
      deviceId: testDeviceId,
      name: "Rower #1 (Updated)",
      locationLabel: "Bay 2",
    });

    const device = await client.query(api.devices.getById, {
      tenantId: tenantId(),
      deviceId: testDeviceId,
    });

    expect(device.name).toBe("Rower #1 (Updated)");
    expect(device.locationLabel).toBe("Bay 2");
  });

  test("coach cannot update a device (admin+ required)", async () => {
    const client = await clientFor("bob");

    await expectToThrow(
      () =>
        client.mutation(api.devices.update, {
          tenantId: tenantId(),
          deviceId: testDeviceId,
          name: "Coach Update",
        }),
      "Insufficient role"
    );
  });

  test("coach cannot deregister a device (admin+ required)", async () => {
    const client = await clientFor("bob");

    await expectToThrow(
      () =>
        client.mutation(api.devices.deregister, {
          tenantId: tenantId(),
          deviceId: testDeviceId,
        }),
      "Insufficient role"
    );
  });

  test("coach can see registered device in list", async () => {
    const client = await clientFor("bob");

    const devices = await client.query(api.devices.listByTenant, {
      tenantId: tenantId(),
    });

    const found = devices.find((d: any) => d._id === testDeviceId);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Rower #1 (Updated)");
  });

  test("admin can register multiple device types", async () => {
    const client = await clientFor("carol");

    const bikeId = await client.mutation(api.devices.register, {
      tenantId: tenantId(),
      name: "Assault Bike #1",
      type: "AssaultBike",
      locationLabel: "Bay 3",
    });
    expectValidId(bikeId);

    const skiId = await client.mutation(api.devices.register, {
      tenantId: tenantId(),
      name: "SkiErg #1",
      type: "SkiErg",
    });
    expectValidId(skiId);

    // Clean up extra devices
    await client.mutation(api.devices.deregister, {
      tenantId: tenantId(),
      deviceId: bikeId,
    });
    await client.mutation(api.devices.deregister, {
      tenantId: tenantId(),
      deviceId: skiId,
    });
  });

  // --------------------------------------------------------------------------
  // Tenant isolation
  // --------------------------------------------------------------------------

  test("grace (cf-beta) cannot list cf-alpha devices", async () => {
    const client = await clientFor("grace");

    await expectToThrow(
      () =>
        client.query(api.devices.listByTenant, { tenantId: tenantId() }),
      "not a member"
    );
  });

  test("grace (cf-beta) cannot get a cf-alpha device by ID", async () => {
    const client = await clientFor("grace");

    await expectToThrow(
      () =>
        client.query(api.devices.getById, {
          tenantId: tenantId(),
          deviceId: testDeviceId,
        }),
      "not a member"
    );
  });

  test("grace (cf-beta) cannot register a device in cf-alpha", async () => {
    const client = await clientFor("grace");

    await expectToThrow(
      () =>
        client.mutation(api.devices.register, {
          tenantId: tenantId(),
          name: "Cross-tenant Device",
          type: "RowErg",
        }),
      "not a member"
    );
  });

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  test("cleanup: admin deregisters the test device", async () => {
    const client = await clientFor("carol");

    await client.mutation(api.devices.deregister, {
      tenantId: tenantId(),
      deviceId: testDeviceId,
    });

    const coachClient = await clientFor("bob");
    const devices = await coachClient.query(api.devices.listByTenant, {
      tenantId: tenantId(),
    });
    const found = devices.find((d: any) => d._id === testDeviceId);
    expect(found).toBeUndefined();
  });
});
