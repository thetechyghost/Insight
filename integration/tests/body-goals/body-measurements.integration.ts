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
 * [FR-UA] Body Measurements (Body Composition)
 *
 * Tests body measurement CRUD operations:
 * - Create, list, get by date, update, remove
 * - Auth enforcement (unauthenticated rejected)
 * - Ownership enforcement (can only modify own measurements)
 * - Tenant isolation
 */
describe("[FR-UA] Body Measurements", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  let daveMeasurementId: Id<"body_measurements">;

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

  test("unauthenticated user cannot list body measurements", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.query(api.bodyMeasurements.listMine, {
          tenantId: tenantId(),
        }),
      "Not authenticated"
    );
  });

  test("unauthenticated user cannot create a body measurement", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.bodyMeasurements.create, {
          tenantId: tenantId(),
          date: "2026-03-15",
          waist: 80,
        }),
      "Not authenticated"
    );
  });

  // --------------------------------------------------------------------------
  // CRUD happy path
  // --------------------------------------------------------------------------

  test("athlete can create a body measurement", async () => {
    const client = await clientFor("dave");

    daveMeasurementId = await client.mutation(api.bodyMeasurements.create, {
      tenantId: tenantId(),
      date: "2026-03-15",
      waist: 80,
      hips: 95,
      chest: 100,
      leftArm: 35,
      rightArm: 36,
      neck: 40,
      notes: "Morning measurement",
    });

    expectValidId(daveMeasurementId);
  });

  test("athlete can list their own body measurements", async () => {
    const client = await clientFor("dave");

    const measurements = await client.query(api.bodyMeasurements.listMine, {
      tenantId: tenantId(),
    });

    expect(measurements.length).toBeGreaterThan(0);
    const target = measurements.find((m: any) => m._id === daveMeasurementId);
    expect(target).toBeDefined();
    expect(target!.waist).toBe(80);
    expect(target!.notes).toBe("Morning measurement");
  });

  test("athlete can get measurement by date", async () => {
    const client = await clientFor("dave");

    const measurement = await client.query(api.bodyMeasurements.getByDate, {
      tenantId: tenantId(),
      date: "2026-03-15",
    });

    expect(measurement).not.toBeNull();
    expect(measurement!.waist).toBe(80);
  });

  test("getByDate returns null for date with no measurement", async () => {
    const client = await clientFor("dave");

    const measurement = await client.query(api.bodyMeasurements.getByDate, {
      tenantId: tenantId(),
      date: "2020-01-01",
    });

    expect(measurement).toBeNull();
  });

  test("athlete can update their own measurement", async () => {
    const client = await clientFor("dave");

    await client.mutation(api.bodyMeasurements.update, {
      tenantId: tenantId(),
      measurementId: daveMeasurementId,
      waist: 79,
      notes: "Updated measurement",
    });

    const measurements = await client.query(api.bodyMeasurements.listMine, {
      tenantId: tenantId(),
    });
    const target = measurements.find((m: any) => m._id === daveMeasurementId);
    expect(target!.waist).toBe(79);
    expect(target!.notes).toBe("Updated measurement");
    // Other fields remain unchanged
    expect(target!.hips).toBe(95);
  });

  test("athlete can create a second measurement on a different date", async () => {
    const client = await clientFor("dave");

    const secondId = await client.mutation(api.bodyMeasurements.create, {
      tenantId: tenantId(),
      date: "2026-03-16",
      waist: 78.5,
      chest: 101,
    });

    expectValidId(secondId);

    const measurements = await client.query(api.bodyMeasurements.listMine, {
      tenantId: tenantId(),
    });
    expect(measurements.length).toBeGreaterThanOrEqual(2);

    // Clean up second measurement
    await client.mutation(api.bodyMeasurements.remove, {
      tenantId: tenantId(),
      measurementId: secondId,
    });
  });

  // --------------------------------------------------------------------------
  // Ownership enforcement
  // --------------------------------------------------------------------------

  test("another user cannot update someone else's measurement", async () => {
    const client = await clientFor("eve");

    await expectToThrow(
      () =>
        client.mutation(api.bodyMeasurements.update, {
          tenantId: tenantId(),
          measurementId: daveMeasurementId,
          waist: 999,
        }),
      "Body measurement not found"
    );
  });

  test("another user cannot delete someone else's measurement", async () => {
    const client = await clientFor("eve");

    await expectToThrow(
      () =>
        client.mutation(api.bodyMeasurements.remove, {
          tenantId: tenantId(),
          measurementId: daveMeasurementId,
        }),
      "Body measurement not found"
    );
  });

  test("eve sees only her own measurements (empty initially)", async () => {
    const client = await clientFor("eve");

    const measurements = await client.query(api.bodyMeasurements.listMine, {
      tenantId: tenantId(),
    });

    // Eve should not see Dave's measurements
    const daveEntry = measurements.find((m: any) => m._id === daveMeasurementId);
    expect(daveEntry).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Tenant isolation
  // --------------------------------------------------------------------------

  test("grace (cf-beta) cannot create measurements in cf-alpha", async () => {
    const client = await clientFor("grace");

    await expectToThrow(
      () =>
        client.mutation(api.bodyMeasurements.create, {
          tenantId: tenantId(),
          date: "2026-03-15",
          waist: 70,
        }),
      "not a member"
    );
  });

  test("grace (cf-beta) cannot list measurements in cf-alpha", async () => {
    const client = await clientFor("grace");

    await expectToThrow(
      () =>
        client.query(api.bodyMeasurements.listMine, { tenantId: tenantId() }),
      "not a member"
    );
  });

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  test("cleanup: athlete removes own measurement", async () => {
    const client = await clientFor("dave");

    await client.mutation(api.bodyMeasurements.remove, {
      tenantId: tenantId(),
      measurementId: daveMeasurementId,
    });

    const measurements = await client.query(api.bodyMeasurements.listMine, {
      tenantId: tenantId(),
    });
    const found = measurements.find((m: any) => m._id === daveMeasurementId);
    expect(found).toBeUndefined();
  });
});
