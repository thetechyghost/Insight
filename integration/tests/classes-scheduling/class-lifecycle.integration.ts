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
 * [FR-SB, FR-CT] Class Lifecycle
 *
 * Tests the full lifecycle of classes and class sessions:
 * - Class CRUD (create, read, update, remove)
 * - Class session CRUD (create, update, cancel)
 * - Auth enforcement (unauthenticated rejected)
 * - RBAC enforcement (athlete cannot manage classes, coach+ can)
 * - Tenant isolation (cross-tenant data never visible)
 */
describe("[FR-SB, FR-CT] Class Lifecycle", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  beforeAll(() => {
    ctx = loadSeedContext();
    unauthenticatedClient = createTestClient();
  });

  async function clientFor(userKey: string) {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  const tenantId = () => ctx.tenants.cfAlpha.id as Id<"tenants">;
  const betaTenantId = () => ctx.tenants.cfBeta.id as Id<"tenants">;

  // --------------------------------------------------------------------------
  // Auth enforcement
  // --------------------------------------------------------------------------

  test("unauthenticated user cannot list classes", async () => {
    await expectToThrow(
      () => unauthenticatedClient.query(api.classes.list, { tenantId: tenantId() }),
      "Not authenticated"
    );
  });

  test("unauthenticated user cannot create a class", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.classes.create, {
          tenantId: tenantId(),
          name: "Hacked Class",
          capacity: 20,
        }),
      "Not authenticated"
    );
  });

  // --------------------------------------------------------------------------
  // RBAC enforcement — classes (coach+)
  // --------------------------------------------------------------------------

  test("athlete cannot create a class (coach+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.classes.create, {
          tenantId: tenantId(),
          name: "Athlete Class",
          capacity: 10,
        }),
      "Insufficient role"
    );
  });

  test("coach can create a class", async () => {
    const client = await clientFor("bob");

    const classId = await client.mutation(api.classes.create, {
      tenantId: tenantId(),
      name: "Integration WOD",
      capacity: 15,
      track: "CrossFit",
      location: "Main Floor",
    });

    expectValidId(classId);
  });

  test("athlete can list classes (read access)", async () => {
    const client = await clientFor("dave");

    const classes = await client.query(api.classes.list, {
      tenantId: tenantId(),
    });

    expect(classes.length).toBeGreaterThan(0);
    const names = classes.map((c: any) => c.name);
    expect(names).toContain("Integration WOD");
  });

  test("coach can update a class", async () => {
    const client = await clientFor("bob");

    // Find the class we created
    const classes = await client.query(api.classes.list, { tenantId: tenantId() });
    const target = classes.find((c: any) => c.name === "Integration WOD");
    expect(target).toBeDefined();

    await client.mutation(api.classes.update, {
      tenantId: tenantId(),
      classId: target!._id,
      capacity: 20,
    });

    const updated = await client.query(api.classes.getById, {
      tenantId: tenantId(),
      classId: target!._id,
    });
    expect(updated.capacity).toBe(20);
  });

  test("athlete cannot update a class (coach+ required)", async () => {
    const client = await clientFor("dave");

    const coachClient = await clientFor("bob");
    const classes = await coachClient.query(api.classes.list, { tenantId: tenantId() });
    const target = classes.find((c: any) => c.name === "Integration WOD");

    if (target) {
      await expectToThrow(
        () =>
          client.mutation(api.classes.update, {
            tenantId: tenantId(),
            classId: target._id,
            name: "Hacked Name",
          }),
        "Insufficient role"
      );
    }
  });

  test("athlete cannot remove a class (coach+ required)", async () => {
    const client = await clientFor("dave");

    const coachClient = await clientFor("bob");
    const classes = await coachClient.query(api.classes.list, { tenantId: tenantId() });
    const target = classes.find((c: any) => c.name === "Integration WOD");

    if (target) {
      await expectToThrow(
        () =>
          client.mutation(api.classes.remove, {
            tenantId: tenantId(),
            classId: target._id,
          }),
        "Insufficient role"
      );
    }
  });

  // --------------------------------------------------------------------------
  // Class Session CRUD (coach+)
  // --------------------------------------------------------------------------

  test("athlete cannot create a class session (coach+ required)", async () => {
    const client = await clientFor("dave");

    const coachClient = await clientFor("bob");
    const classes = await coachClient.query(api.classes.list, { tenantId: tenantId() });
    const target = classes.find((c: any) => c.name === "Integration WOD");

    if (target) {
      await expectToThrow(
        () =>
          client.mutation(api.classSessions.create, {
            tenantId: tenantId(),
            classId: target._id,
            date: "2026-03-20",
            startTime: "09:00",
          }),
        "Insufficient role"
      );
    }
  });

  test("coach can create a class session", async () => {
    const client = await clientFor("bob");

    const classes = await client.query(api.classes.list, { tenantId: tenantId() });
    const target = classes.find((c: any) => c.name === "Integration WOD");
    expect(target).toBeDefined();

    const sessionId = await client.mutation(api.classSessions.create, {
      tenantId: tenantId(),
      classId: target!._id,
      date: "2026-03-20",
      startTime: "09:00",
    });

    expectValidId(sessionId);
  });

  test("coach can retrieve a class session by ID", async () => {
    const client = await clientFor("bob");

    const sessions = await client.query(api.classSessions.listByDate, {
      tenantId: tenantId(),
      date: "2026-03-20",
    });
    const target = sessions.find((s: any) => s.startTime === "09:00");
    expect(target).toBeDefined();

    const session = await client.query(api.classSessions.getById, {
      tenantId: tenantId(),
      sessionId: target!._id,
    });
    expect(session.date).toBe("2026-03-20");
    expect(session.status).toBe("scheduled");
  });

  test("athlete cannot retrieve a class session by ID (coach+ required)", async () => {
    const client = await clientFor("dave");

    const coachClient = await clientFor("bob");
    const sessions = await coachClient.query(api.classSessions.listByDate, {
      tenantId: tenantId(),
      date: "2026-03-20",
    });
    const target = sessions[0];

    if (target) {
      await expectToThrow(
        () =>
          client.query(api.classSessions.getById, {
            tenantId: tenantId(),
            sessionId: target._id,
          }),
        "Insufficient role"
      );
    }
  });

  test("coach can update a class session status", async () => {
    const client = await clientFor("bob");

    const sessions = await client.query(api.classSessions.listByDate, {
      tenantId: tenantId(),
      date: "2026-03-20",
    });
    const target = sessions.find((s: any) => s.startTime === "09:00");
    expect(target).toBeDefined();

    await client.mutation(api.classSessions.update, {
      tenantId: tenantId(),
      sessionId: target!._id,
      status: "in_progress",
    });

    const updated = await client.query(api.classSessions.getById, {
      tenantId: tenantId(),
      sessionId: target!._id,
    });
    expect(updated.status).toBe("in_progress");
  });

  test("coach can cancel a class session", async () => {
    const client = await clientFor("bob");

    // Create a session specifically for cancellation
    const classes = await client.query(api.classes.list, { tenantId: tenantId() });
    const target = classes.find((c: any) => c.name === "Integration WOD");
    expect(target).toBeDefined();

    const sessionId = await client.mutation(api.classSessions.create, {
      tenantId: tenantId(),
      classId: target!._id,
      date: "2026-03-21",
      startTime: "10:00",
    });

    await client.mutation(api.classSessions.cancel, {
      tenantId: tenantId(),
      sessionId,
    });

    const cancelled = await client.query(api.classSessions.getById, {
      tenantId: tenantId(),
      sessionId,
    });
    expect(cancelled.status).toBe("cancelled");
  });

  test("coach can assign a coach to a session", async () => {
    const client = await clientFor("bob");

    const sessions = await client.query(api.classSessions.listByDate, {
      tenantId: tenantId(),
      date: "2026-03-20",
    });
    const target = sessions.find((s: any) => s.startTime === "09:00");
    expect(target).toBeDefined();

    await client.mutation(api.classSessions.assignCoach, {
      tenantId: tenantId(),
      sessionId: target!._id,
      coachId: ctx.users.bob.id as Id<"users">,
    });

    const updated = await client.query(api.classSessions.getById, {
      tenantId: tenantId(),
      sessionId: target!._id,
    });
    expect(updated.coachId).toBe(ctx.users.bob.id);
  });

  // --------------------------------------------------------------------------
  // Tenant isolation
  // --------------------------------------------------------------------------

  test("grace (cf-beta owner) cannot see cf-alpha classes", async () => {
    const client = await clientFor("grace");

    await expectToThrow(
      () => client.query(api.classes.list, { tenantId: tenantId() }),
      "not a member"
    );
  });

  test("cf-beta class sessions are isolated from cf-alpha", async () => {
    const client = await clientFor("grace");

    const sessions = await client.query(api.classSessions.listByDate, {
      tenantId: betaTenantId(),
      date: "2026-03-20",
    });

    // Should not contain any cf-alpha sessions
    for (const s of sessions) {
      expect(s.tenantId).toBe(betaTenantId());
    }
  });

  // --------------------------------------------------------------------------
  // Cleanup — remove the integration class
  // --------------------------------------------------------------------------

  test("coach can remove a class", async () => {
    const client = await clientFor("bob");

    const classes = await client.query(api.classes.list, { tenantId: tenantId() });
    const target = classes.find((c: any) => c.name === "Integration WOD");

    if (target) {
      await client.mutation(api.classes.remove, {
        tenantId: tenantId(),
        classId: target._id,
      });

      const remaining = await client.query(api.classes.list, { tenantId: tenantId() });
      const found = remaining.find((c: any) => c.name === "Integration WOD");
      expect(found).toBeUndefined();
    }
  });
});
