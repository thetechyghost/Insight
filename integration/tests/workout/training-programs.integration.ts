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
 * [FR-TP] Training Programs
 *
 * Tests training program CRUD, publishing workflow, user assignments,
 * auth enforcement, RBAC gating, and tenant isolation.
 */
describe("[FR-TP] Training Programs", () => {
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

  test("unauthenticated user cannot list training programs", async () => {
    await expectToThrow(
      () => unauthenticatedClient.query(api.trainingPrograms.list, { tenantId: tenantId() }),
      "Not authenticated"
    );
  });

  test("unauthenticated user cannot create training programs", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.trainingPrograms.create, {
          tenantId: tenantId(),
          name: "Hack Program",
          weeks: 8,
          publishedStatus: "draft",
        }),
      "Not authenticated"
    );
  });

  // --------------------------------------------------------------------------
  // RBAC enforcement — create/update/assign requires coach+
  // --------------------------------------------------------------------------

  test("athlete cannot create training programs (coach+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.trainingPrograms.create, {
          tenantId: tenantId(),
          name: "Athlete Program",
          weeks: 4,
          publishedStatus: "draft",
        }),
      "Insufficient role"
    );
  });

  test("coach can create a training program", async () => {
    const client = await clientFor("bob");

    const programId = await client.mutation(api.trainingPrograms.create, {
      tenantId: tenantId(),
      name: "Beginner Strength 101",
      description: "An 8-week introductory strength program.",
      weeks: 8,
      phaseLabels: ["Foundation", "Build", "Peak", "Deload"],
      publishedStatus: "draft",
    });

    expectValidId(programId);
  });

  test("admin can create a training program", async () => {
    const client = await clientFor("carol");

    const programId = await client.mutation(api.trainingPrograms.create, {
      tenantId: tenantId(),
      name: "Admin Created Program",
      weeks: 6,
      publishedStatus: "draft",
    });

    expectValidId(programId);
  });

  // --------------------------------------------------------------------------
  // CRUD happy path
  // --------------------------------------------------------------------------

  test("coach can create, read, update a training program", async () => {
    const client = await clientFor("bob");

    // Create
    const programId = await client.mutation(api.trainingPrograms.create, {
      tenantId: tenantId(),
      name: "CRUD Training Program",
      description: "For CRUD testing",
      weeks: 12,
      phaseLabels: ["Base", "Build", "Peak"],
      publishedStatus: "draft",
      price: 4999,
      currency: "USD",
    });
    expectValidId(programId);

    // Read
    const program = await client.query(api.trainingPrograms.getById, {
      tenantId: tenantId(),
      programId: programId as Id<"training_programs">,
    });
    expect(program.name).toBe("CRUD Training Program");
    expect(program.description).toBe("For CRUD testing");
    expect(program.weeks).toBe(12);
    expect(program.phaseLabels).toEqual(["Base", "Build", "Peak"]);
    expect(program.publishedStatus).toBe("draft");
    expect(program.price).toBe(4999);
    expect(program.currency).toBe("USD");
    expect(program.tenantId).toBe(ctx.tenants.cfAlpha.id);

    // Update
    await client.mutation(api.trainingPrograms.update, {
      tenantId: tenantId(),
      programId: programId as Id<"training_programs">,
      name: "CRUD Training Program Updated",
      description: "Updated description",
      weeks: 10,
      publishedStatus: "published",
    });

    const updated = await client.query(api.trainingPrograms.getById, {
      tenantId: tenantId(),
      programId: programId as Id<"training_programs">,
    });
    expect(updated.name).toBe("CRUD Training Program Updated");
    expect(updated.description).toBe("Updated description");
    expect(updated.weeks).toBe(10);
    expect(updated.publishedStatus).toBe("published");
    // Unchanged fields should persist
    expect(updated.price).toBe(4999);
    expect(updated.currency).toBe("USD");
  });

  // --------------------------------------------------------------------------
  // List and filter by published status
  // --------------------------------------------------------------------------

  test("athlete can list training programs", async () => {
    const client = await clientFor("dave");

    const programs = await client.query(api.trainingPrograms.list, {
      tenantId: tenantId(),
    });

    expect(programs.length).toBeGreaterThan(0);
  });

  test("list can filter by published status", async () => {
    const client = await clientFor("bob");

    // Create a draft and a published program
    await client.mutation(api.trainingPrograms.create, {
      tenantId: tenantId(),
      name: "Status Filter Draft Program",
      weeks: 4,
      publishedStatus: "draft",
    });

    const publishedId = await client.mutation(api.trainingPrograms.create, {
      tenantId: tenantId(),
      name: "Status Filter Published Program",
      weeks: 6,
      publishedStatus: "published",
    });

    const drafts = await client.query(api.trainingPrograms.list, {
      tenantId: tenantId(),
      publishedStatus: "draft",
    });

    for (const p of drafts) {
      expect(p.publishedStatus).toBe("draft");
    }

    const published = await client.query(api.trainingPrograms.list, {
      tenantId: tenantId(),
      publishedStatus: "published",
    });

    for (const p of published) {
      expect(p.publishedStatus).toBe("published");
    }
  });

  // --------------------------------------------------------------------------
  // Publishing workflow (draft → published → archived)
  // --------------------------------------------------------------------------

  test("coach can transition program through publishing states", async () => {
    const client = await clientFor("bob");

    const programId = await client.mutation(api.trainingPrograms.create, {
      tenantId: tenantId(),
      name: "Publishing Workflow Test",
      weeks: 4,
      publishedStatus: "draft",
    });

    // Draft → Published
    await client.mutation(api.trainingPrograms.update, {
      tenantId: tenantId(),
      programId: programId as Id<"training_programs">,
      publishedStatus: "published",
    });

    let program = await client.query(api.trainingPrograms.getById, {
      tenantId: tenantId(),
      programId: programId as Id<"training_programs">,
    });
    expect(program.publishedStatus).toBe("published");

    // Published → Archived
    await client.mutation(api.trainingPrograms.update, {
      tenantId: tenantId(),
      programId: programId as Id<"training_programs">,
      publishedStatus: "archived",
    });

    program = await client.query(api.trainingPrograms.getById, {
      tenantId: tenantId(),
      programId: programId as Id<"training_programs">,
    });
    expect(program.publishedStatus).toBe("archived");
  });

  // --------------------------------------------------------------------------
  // User assignments
  // --------------------------------------------------------------------------

  test("coach can assign a program to an athlete", async () => {
    const client = await clientFor("bob");

    // Create a program
    const programId = await client.mutation(api.trainingPrograms.create, {
      tenantId: tenantId(),
      name: "Assignment Test Program",
      weeks: 6,
      publishedStatus: "published",
    });

    // Assign to Dave
    const assignmentId = await client.mutation(api.trainingPrograms.assignToUser, {
      tenantId: tenantId(),
      programId: programId as Id<"training_programs">,
      userId: ctx.users.dave.id as Id<"users">,
      startDate: "2026-03-15",
    });

    expectValidId(assignmentId);
  });

  test("athlete cannot assign programs (coach+ required)", async () => {
    const coachClient = await clientFor("bob");

    const programId = await coachClient.mutation(api.trainingPrograms.create, {
      tenantId: tenantId(),
      name: "Athlete Assign Attempt Program",
      weeks: 4,
      publishedStatus: "published",
    });

    const athleteClient = await clientFor("dave");

    await expectToThrow(
      () =>
        athleteClient.mutation(api.trainingPrograms.assignToUser, {
          tenantId: tenantId(),
          programId: programId as Id<"training_programs">,
          userId: ctx.users.eve.id as Id<"users">,
          startDate: "2026-03-15",
        }),
      "Insufficient role"
    );
  });

  test("athlete can view their own program assignments", async () => {
    const coachClient = await clientFor("bob");

    // Create and assign a program to Eve
    const programId = await coachClient.mutation(api.trainingPrograms.create, {
      tenantId: tenantId(),
      name: "Eve Assignment Program",
      weeks: 4,
      publishedStatus: "published",
    });

    await coachClient.mutation(api.trainingPrograms.assignToUser, {
      tenantId: tenantId(),
      programId: programId as Id<"training_programs">,
      userId: ctx.users.eve.id as Id<"users">,
      startDate: "2026-04-01",
    });

    // Eve checks her assignments
    const eveClient = await clientFor("eve");
    const assignments = await eveClient.query(api.trainingPrograms.getMyAssignments, {
      tenantId: tenantId(),
    });

    expect(assignments.length).toBeGreaterThanOrEqual(1);

    const eveProgramAssignment = assignments.find(
      (a) => a.program?.name === "Eve Assignment Program"
    );
    expect(eveProgramAssignment).toBeDefined();
    expect(eveProgramAssignment!.assignment.startDate).toBe("2026-04-01");
    expect(eveProgramAssignment!.assignment.currentWeek).toBe(1);
    expect(eveProgramAssignment!.assignment.status).toBe("active");
  });

  test("coach can unassign a program from a user", async () => {
    const client = await clientFor("bob");

    // Create and assign
    const programId = await client.mutation(api.trainingPrograms.create, {
      tenantId: tenantId(),
      name: "Unassign Test Program",
      weeks: 4,
      publishedStatus: "published",
    });

    const assignmentId = await client.mutation(api.trainingPrograms.assignToUser, {
      tenantId: tenantId(),
      programId: programId as Id<"training_programs">,
      userId: ctx.users.eve.id as Id<"users">,
      startDate: "2026-05-01",
    });

    // Unassign
    await client.mutation(api.trainingPrograms.unassign, {
      tenantId: tenantId(),
      assignmentId: assignmentId as Id<"program_assignments">,
    });

    // Verify the assignment is gone from Eve's list
    const eveClient = await clientFor("eve");
    const assignments = await eveClient.query(api.trainingPrograms.getMyAssignments, {
      tenantId: tenantId(),
    });

    const found = assignments.find((a) => a.assignment._id === assignmentId);
    expect(found).toBeUndefined();
  });

  test("athlete cannot unassign programs (coach+ required)", async () => {
    const coachClient = await clientFor("bob");

    const programId = await coachClient.mutation(api.trainingPrograms.create, {
      tenantId: tenantId(),
      name: "Athlete Unassign Test Program",
      weeks: 4,
      publishedStatus: "published",
    });

    const assignmentId = await coachClient.mutation(api.trainingPrograms.assignToUser, {
      tenantId: tenantId(),
      programId: programId as Id<"training_programs">,
      userId: ctx.users.dave.id as Id<"users">,
      startDate: "2026-06-01",
    });

    const athleteClient = await clientFor("dave");

    await expectToThrow(
      () =>
        athleteClient.mutation(api.trainingPrograms.unassign, {
          tenantId: tenantId(),
          assignmentId: assignmentId as Id<"program_assignments">,
        }),
      "Insufficient role"
    );
  });

  // --------------------------------------------------------------------------
  // RBAC enforcement — update requires coach+
  // --------------------------------------------------------------------------

  test("athlete cannot update training programs (coach+ required)", async () => {
    const coachClient = await clientFor("bob");

    const programId = await coachClient.mutation(api.trainingPrograms.create, {
      tenantId: tenantId(),
      name: "Athlete Update Target Program",
      weeks: 4,
      publishedStatus: "draft",
    });

    const athleteClient = await clientFor("dave");

    await expectToThrow(
      () =>
        athleteClient.mutation(api.trainingPrograms.update, {
          tenantId: tenantId(),
          programId: programId as Id<"training_programs">,
          name: "Hacked by Athlete",
        }),
      "Insufficient role"
    );
  });

  // --------------------------------------------------------------------------
  // Tenant isolation
  // --------------------------------------------------------------------------

  test("user cannot access training programs from another tenant via getById", async () => {
    const graceClient = await clientFor("grace");

    const betaProgramId = await graceClient.mutation(api.trainingPrograms.create, {
      tenantId: betaTenantId(),
      name: "Beta Only Program",
      weeks: 8,
      publishedStatus: "published",
    });

    const daveClient = await clientFor("dave");

    await expectToThrow(
      () =>
        daveClient.query(api.trainingPrograms.getById, {
          tenantId: tenantId(),
          programId: betaProgramId as Id<"training_programs">,
        }),
      "does not belong to this tenant"
    );
  });

  test("training programs listed for one tenant do not include another tenant's programs", async () => {
    const graceClient = await clientFor("grace");

    await graceClient.mutation(api.trainingPrograms.create, {
      tenantId: betaTenantId(),
      name: "IsolationProgramBetaOnly",
      weeks: 4,
      publishedStatus: "published",
    });

    const daveClient = await clientFor("dave");
    const alphaPrograms = await daveClient.query(api.trainingPrograms.list, {
      tenantId: tenantId(),
    });

    const names = alphaPrograms.map((p) => p.name);
    expect(names).not.toContain("IsolationProgramBetaOnly");
  });

  test("coach in tenant A cannot update program in tenant B", async () => {
    const graceClient = await clientFor("grace");

    const betaProgramId = await graceClient.mutation(api.trainingPrograms.create, {
      tenantId: betaTenantId(),
      name: "Cross Tenant Update Target",
      weeks: 4,
      publishedStatus: "draft",
    });

    const bobClient = await clientFor("bob");

    await expectToThrow(
      () =>
        bobClient.mutation(api.trainingPrograms.update, {
          tenantId: tenantId(),
          programId: betaProgramId as Id<"training_programs">,
          name: "Hacked Cross Tenant",
        }),
      "does not belong to this tenant"
    );
  });

  test("coach in tenant A cannot assign program from tenant B", async () => {
    const graceClient = await clientFor("grace");

    const betaProgramId = await graceClient.mutation(api.trainingPrograms.create, {
      tenantId: betaTenantId(),
      name: "Cross Tenant Assign Target",
      weeks: 4,
      publishedStatus: "published",
    });

    const bobClient = await clientFor("bob");

    await expectToThrow(
      () =>
        bobClient.mutation(api.trainingPrograms.assignToUser, {
          tenantId: tenantId(),
          programId: betaProgramId as Id<"training_programs">,
          userId: ctx.users.dave.id as Id<"users">,
          startDate: "2026-07-01",
        }),
      "does not belong to this tenant"
    );
  });

  test("coach in tenant A cannot unassign assignment in tenant B", async () => {
    const graceClient = await clientFor("grace");

    const betaProgramId = await graceClient.mutation(api.trainingPrograms.create, {
      tenantId: betaTenantId(),
      name: "Cross Tenant Unassign Target",
      weeks: 4,
      publishedStatus: "published",
    });

    // Assign Frank (who is in both tenants) to the Beta program
    const assignmentId = await graceClient.mutation(api.trainingPrograms.assignToUser, {
      tenantId: betaTenantId(),
      programId: betaProgramId as Id<"training_programs">,
      userId: ctx.users.frank.id as Id<"users">,
      startDate: "2026-08-01",
    });

    // Bob (coach in cfAlpha) tries to unassign
    const bobClient = await clientFor("bob");

    await expectToThrow(
      () =>
        bobClient.mutation(api.trainingPrograms.unassign, {
          tenantId: tenantId(),
          assignmentId: assignmentId as Id<"program_assignments">,
        }),
      "does not belong to this tenant"
    );
  });
});
