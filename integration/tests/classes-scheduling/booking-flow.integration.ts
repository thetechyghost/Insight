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
 * [FR-SB] Booking Flow
 *
 * Tests the class registration / booking lifecycle:
 * - Register for a class session
 * - Duplicate registration prevention
 * - Cancel own registration
 * - Coach check-in / check-out / mark no-show
 * - Auth enforcement (unauthenticated rejected)
 * - RBAC enforcement (listBySession is coach+, checkIn is coach+)
 * - Ownership enforcement (can only cancel own registration)
 * - Tenant isolation
 */
describe("[FR-SB] Booking Flow", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  // IDs created during tests for cross-test reference
  let testClassId: Id<"classes">;
  let testSessionId: Id<"class_sessions">;
  let daveRegistrationId: Id<"class_registrations">;

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
  // Setup — create a class + session for booking tests
  // --------------------------------------------------------------------------

  test("setup: coach creates a class and session for booking tests", async () => {
    const client = await clientFor("bob");

    testClassId = await client.mutation(api.classes.create, {
      tenantId: tenantId(),
      name: "Booking Test WOD",
      capacity: 2, // Small capacity to test waitlisting
    });
    expectValidId(testClassId);

    testSessionId = await client.mutation(api.classSessions.create, {
      tenantId: tenantId(),
      classId: testClassId,
      date: "2026-03-25",
      startTime: "07:00",
    });
    expectValidId(testSessionId);
  });

  // --------------------------------------------------------------------------
  // Auth enforcement
  // --------------------------------------------------------------------------

  test("unauthenticated user cannot register for a class", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.classRegistrations.register, {
          tenantId: tenantId(),
          classSessionId: testSessionId,
          bookingSource: "app",
        }),
      "Not authenticated"
    );
  });

  // --------------------------------------------------------------------------
  // Registration happy path
  // --------------------------------------------------------------------------

  test("athlete can register for a class session", async () => {
    const client = await clientFor("dave");

    daveRegistrationId = await client.mutation(api.classRegistrations.register, {
      tenantId: tenantId(),
      classSessionId: testSessionId,
      bookingSource: "app",
    });

    expectValidId(daveRegistrationId);
  });

  test("duplicate registration is rejected", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.classRegistrations.register, {
          tenantId: tenantId(),
          classSessionId: testSessionId,
          bookingSource: "app",
        }),
      "Already registered"
    );
  });

  test("second athlete can register (fills capacity)", async () => {
    const client = await clientFor("eve");

    const regId = await client.mutation(api.classRegistrations.register, {
      tenantId: tenantId(),
      classSessionId: testSessionId,
      bookingSource: "web",
    });

    expectValidId(regId);
  });

  test("third user is waitlisted when capacity is full", async () => {
    // Frank is in cf-alpha — use Frank as the third registrant
    const client = await clientFor("frank");

    const regId = await client.mutation(api.classRegistrations.register, {
      tenantId: tenantId(),
      classSessionId: testSessionId,
      bookingSource: "app",
    });

    expectValidId(regId);

    // Verify frank's registration is waitlisted
    const coachClient = await clientFor("bob");
    const registrations = await coachClient.query(api.classRegistrations.listBySession, {
      tenantId: tenantId(),
      classSessionId: testSessionId,
    });

    const frankReg = registrations.find(
      (r: any) => r.userId === ctx.users.frank.id
    );
    expect(frankReg).toBeDefined();
    expect(frankReg!.status).toBe("waitlisted");
  });

  // --------------------------------------------------------------------------
  // RBAC enforcement — listBySession (coach+)
  // --------------------------------------------------------------------------

  test("athlete cannot list registrations for a session (coach+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.query(api.classRegistrations.listBySession, {
          tenantId: tenantId(),
          classSessionId: testSessionId,
        }),
      "Insufficient role"
    );
  });

  test("coach can list registrations for a session", async () => {
    const client = await clientFor("bob");

    const registrations = await client.query(api.classRegistrations.listBySession, {
      tenantId: tenantId(),
      classSessionId: testSessionId,
    });

    expect(registrations.length).toBe(3); // dave, eve, frank
  });

  // --------------------------------------------------------------------------
  // Check-in / check-out / no-show (coach+)
  // --------------------------------------------------------------------------

  test("coach can check in a registration", async () => {
    const client = await clientFor("bob");

    await client.mutation(api.classRegistrations.checkIn, {
      tenantId: tenantId(),
      registrationId: daveRegistrationId,
    });

    const registrations = await client.query(api.classRegistrations.listBySession, {
      tenantId: tenantId(),
      classSessionId: testSessionId,
    });

    const daveReg = registrations.find((r: any) => r._id === daveRegistrationId);
    expect(daveReg).toBeDefined();
    expect(daveReg!.status).toBe("attended");
    expect(daveReg!.checkInTime).toBeDefined();
  });

  test("coach can check out a registration", async () => {
    const client = await clientFor("bob");

    await client.mutation(api.classRegistrations.checkOut, {
      tenantId: tenantId(),
      registrationId: daveRegistrationId,
    });

    const registrations = await client.query(api.classRegistrations.listBySession, {
      tenantId: tenantId(),
      classSessionId: testSessionId,
    });

    const daveReg = registrations.find((r: any) => r._id === daveRegistrationId);
    expect(daveReg!.checkOutTime).toBeDefined();
  });

  test("athlete cannot check in another user (coach+ required)", async () => {
    const client = await clientFor("dave");

    const coachClient = await clientFor("bob");
    const registrations = await coachClient.query(api.classRegistrations.listBySession, {
      tenantId: tenantId(),
      classSessionId: testSessionId,
    });
    const eveReg = registrations.find((r: any) => r.userId === ctx.users.eve.id);

    if (eveReg) {
      await expectToThrow(
        () =>
          client.mutation(api.classRegistrations.checkIn, {
            tenantId: tenantId(),
            registrationId: eveReg._id,
          }),
        "Insufficient role"
      );
    }
  });

  test("coach can mark a registration as no-show", async () => {
    const client = await clientFor("bob");

    const registrations = await client.query(api.classRegistrations.listBySession, {
      tenantId: tenantId(),
      classSessionId: testSessionId,
    });
    const eveReg = registrations.find((r: any) => r.userId === ctx.users.eve.id);
    expect(eveReg).toBeDefined();

    await client.mutation(api.classRegistrations.markNoShow, {
      tenantId: tenantId(),
      registrationId: eveReg!._id,
    });

    const updated = await client.query(api.classRegistrations.listBySession, {
      tenantId: tenantId(),
      classSessionId: testSessionId,
    });
    const eveUpdated = updated.find((r: any) => r.userId === ctx.users.eve.id);
    expect(eveUpdated!.status).toBe("no_show");
  });

  // --------------------------------------------------------------------------
  // Ownership enforcement — cancel own registration
  // --------------------------------------------------------------------------

  test("user can cancel their own registration", async () => {
    const client = await clientFor("frank");

    // Frank needs to find his registration ID
    const coachClient = await clientFor("bob");
    const registrations = await coachClient.query(api.classRegistrations.listBySession, {
      tenantId: tenantId(),
      classSessionId: testSessionId,
    });
    const frankReg = registrations.find((r: any) => r.userId === ctx.users.frank.id);
    expect(frankReg).toBeDefined();

    await client.mutation(api.classRegistrations.cancel, {
      tenantId: tenantId(),
      registrationId: frankReg!._id,
    });

    const updated = await coachClient.query(api.classRegistrations.listBySession, {
      tenantId: tenantId(),
      classSessionId: testSessionId,
    });
    const frankUpdated = updated.find((r: any) => r.userId === ctx.users.frank.id);
    expect(frankUpdated!.status).toBe("late_cancel");
  });

  test("user cannot cancel another user's registration", async () => {
    const client = await clientFor("eve");

    // Eve tries to cancel Dave's registration
    await expectToThrow(
      () =>
        client.mutation(api.classRegistrations.cancel, {
          tenantId: tenantId(),
          registrationId: daveRegistrationId,
        }),
      "Can only cancel your own registration"
    );
  });

  // --------------------------------------------------------------------------
  // Tenant isolation
  // --------------------------------------------------------------------------

  test("grace (cf-beta) cannot register for a cf-alpha session", async () => {
    const client = await clientFor("grace");

    await expectToThrow(
      () =>
        client.mutation(api.classRegistrations.register, {
          tenantId: tenantId(),
          classSessionId: testSessionId,
          bookingSource: "app",
        }),
      "not a member"
    );
  });

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  test("cleanup: coach removes the test class", async () => {
    const client = await clientFor("bob");

    await client.mutation(api.classes.remove, {
      tenantId: tenantId(),
      classId: testClassId,
    });

    const classes = await client.query(api.classes.list, { tenantId: tenantId() });
    const found = classes.find((c: any) => c._id === testClassId);
    expect(found).toBeUndefined();
  });
});
