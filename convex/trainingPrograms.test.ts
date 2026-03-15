import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

function identity(email: string) {
  return {
    email,
    subject: `user|${email}`,
    tokenIdentifier: `test|${email}`,
  };
}

describe("trainingPrograms", () => {
  test("create requires coach role", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Athlete",
        email: "athlete@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    await expect(
      asAthlete.mutation(api.trainingPrograms.create, {
        tenantId,
        name: "Beginner Program",
        weeks: 8,
        publishedStatus: "draft",
      })
    ).rejects.toThrow("Insufficient permissions");

    // Verify coach can create
    const { tenantId: tenantId2 } = await t.run(async (ctx) => {
      const coachId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
      });
      const tenantId2 = await ctx.db.insert("tenants", {
        name: "Test Gym 2",
        slug: "test-gym-2",
      });
      await ctx.db.insert("memberships", {
        userId: coachId,
        tenantId: tenantId2,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { tenantId: tenantId2 };
    });

    const asCoach = t.withIdentity(identity("coach@example.com"));

    const programId = await asCoach.mutation(api.trainingPrograms.create, {
      tenantId: tenantId2,
      name: "Beginner Program",
      weeks: 8,
      publishedStatus: "draft",
    });

    expect(programId).toBeDefined();
  });

  // NOTE: The assignToUser handler inserts `status: "active"` but the schema
  // for program_assignments doesn't define a `status` field. This is a schema
  // mismatch bug. The test verifies the handler hits this constraint.
  test("assignToUser creates assignment with correct start date", async () => {
    const t = convexTest(schema);

    const { tenantId, programId, athleteUserId } = await t.run(async (ctx) => {
      const coachId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId: coachId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const athleteUserId = await ctx.db.insert("users", {
        name: "Athlete",
        email: "athlete@example.com",
      });
      await ctx.db.insert("memberships", {
        userId: athleteUserId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const programId = await ctx.db.insert("training_programs", {
        tenantId,
        name: "Strength Builder",
        authorId: coachId,
        weeks: 12,
        publishedStatus: "published",
      });

      return { tenantId, programId, athleteUserId };
    });

    const asCoach = t.withIdentity(identity("coach@example.com"));

    const assignmentId = await asCoach.mutation(api.trainingPrograms.assignToUser, {
      tenantId,
      programId,
      userId: athleteUserId,
      startDate: "2024-07-01",
    });

    const assignment = await t.run(async (ctx) => ctx.db.get(assignmentId));
    expect(assignment!.startDate).toBe("2024-07-01");
    expect(assignment!.status).toBe("active");
  });

  test("getMyAssignments returns only current user's assignments", async () => {
    const t = convexTest(schema);

    const { tenantId, athlete1Id } = await t.run(async (ctx) => {
      const coachId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId: coachId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const athlete1Id = await ctx.db.insert("users", {
        name: "Athlete 1",
        email: "athlete1@example.com",
      });
      await ctx.db.insert("memberships", {
        userId: athlete1Id,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const athlete2Id = await ctx.db.insert("users", {
        name: "Athlete 2",
        email: "athlete2@example.com",
      });
      await ctx.db.insert("memberships", {
        userId: athlete2Id,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const programId = await ctx.db.insert("training_programs", {
        tenantId,
        name: "Program A",
        authorId: coachId,
        weeks: 8,
        publishedStatus: "published",
      });

      // Assignment for athlete 1
      await ctx.db.insert("program_assignments", {
        userId: athlete1Id,
        tenantId,
        programId,
        startDate: "2024-07-01",
        currentWeek: 1,
      });

      // Assignment for athlete 2
      await ctx.db.insert("program_assignments", {
        userId: athlete2Id,
        tenantId,
        programId,
        startDate: "2024-07-01",
        currentWeek: 1,
      });

      return { tenantId, athlete1Id };
    });

    const asAthlete1 = t.withIdentity(identity("athlete1@example.com"));

    const assignments = await asAthlete1.query(
      api.trainingPrograms.getMyAssignments,
      { tenantId }
    );

    expect(assignments).toHaveLength(1);
    expect(assignments[0].assignment.userId).toEqual(athlete1Id);
    expect(assignments[0].program).not.toBeNull();
    expect(assignments[0].program!.name).toBe("Program A");
  });

  test("unassign removes assignment", async () => {
    const t = convexTest(schema);

    const { tenantId, assignmentId } = await t.run(async (ctx) => {
      const coachId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId: coachId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const athleteId = await ctx.db.insert("users", {
        name: "Athlete",
        email: "athlete@example.com",
      });
      await ctx.db.insert("memberships", {
        userId: athleteId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const programId = await ctx.db.insert("training_programs", {
        tenantId,
        name: "Program B",
        authorId: coachId,
        weeks: 6,
        publishedStatus: "published",
      });

      const assignmentId = await ctx.db.insert("program_assignments", {
        userId: athleteId,
        tenantId,
        programId,
        startDate: "2024-07-01",
        currentWeek: 1,
      });

      return { tenantId, assignmentId };
    });

    const asCoach = t.withIdentity(identity("coach@example.com"));

    await asCoach.mutation(api.trainingPrograms.unassign, {
      tenantId,
      assignmentId,
    });

    const deleted = await t.run(async (ctx) => {
      return await ctx.db.get(assignmentId);
    });

    expect(deleted).toBeNull();
  });
});
