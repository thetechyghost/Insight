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

describe("workoutLogs", () => {
  test("create stores log with all metadata", async () => {
    const t = convexTest(schema);

    const { tenantId, userId } = await t.run(async (ctx) => {
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
      return { tenantId, userId };
    });

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    const logId = await asAthlete.mutation(api.workoutLogs.create, {
      tenantId,
      date: "2024-06-15",
      workoutType: "AMRAP",
      scalingDesignation: "Rx",
      rpe: 8,
      notes: "Felt strong today",
      isDraft: false,
    });

    expect(logId).toBeDefined();

    const log = await t.run(async (ctx) => {
      return await ctx.db.get(logId);
    });

    expect(log).not.toBeNull();
    expect(log!.userId).toEqual(userId);
    expect(log!.tenantId).toEqual(tenantId);
    expect(log!.date).toBe("2024-06-15");
    expect(log!.workoutType).toBe("AMRAP");
    expect(log!.scalingDesignation).toBe("Rx");
    expect(log!.rpe).toBe(8);
    expect(log!.notes).toBe("Felt strong today");
    expect(log!.isDraft).toBe(false);
  });

  test("create idempotency — second call with same key returns existing ID", async () => {
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

    const firstId = await asAthlete.mutation(api.workoutLogs.create, {
      tenantId,
      date: "2024-06-15",
      workoutType: "ForTime",
      isDraft: false,
      idempotencyKey: "unique-key-123",
    });

    const secondId = await asAthlete.mutation(api.workoutLogs.create, {
      tenantId,
      date: "2024-06-15",
      workoutType: "ForTime",
      isDraft: false,
      idempotencyKey: "unique-key-123",
    });

    expect(secondId).toEqual(firstId);
  });

  test("saveDraft creates with isDraft=true", async () => {
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

    const logId = await asAthlete.mutation(api.workoutLogs.saveDraft, {
      tenantId,
      date: "2024-06-15",
      workoutType: "Strength",
    });

    const log = await t.run(async (ctx) => {
      return await ctx.db.get(logId);
    });

    expect(log!.isDraft).toBe(true);
  });

  test("finalize sets isDraft=false", async () => {
    const t = convexTest(schema);

    const { tenantId, logId } = await t.run(async (ctx) => {
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

      const logId = await ctx.db.insert("workout_logs", {
        userId,
        tenantId,
        date: "2024-06-15",
        workoutType: "AMRAP",
        isDraft: true,
      });

      return { tenantId, logId };
    });

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    await asAthlete.mutation(api.workoutLogs.finalize, { tenantId, logId });

    const log = await t.run(async (ctx) => {
      return await ctx.db.get(logId);
    });

    expect(log!.isDraft).toBe(false);
  });

  test("update only allows own logs (second user should fail)", async () => {
    const t = convexTest(schema);

    const { tenantId, logId } = await t.run(async (ctx) => {
      const user1Id = await ctx.db.insert("users", {
        name: "User One",
        email: "user1@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId: user1Id,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const user2Id = await ctx.db.insert("users", {
        name: "User Two",
        email: "user2@example.com",
      });
      await ctx.db.insert("memberships", {
        userId: user2Id,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const logId = await ctx.db.insert("workout_logs", {
        userId: user1Id,
        tenantId,
        date: "2024-06-15",
        workoutType: "ForTime",
        isDraft: false,
      });

      return { tenantId, logId };
    });

    // User 2 tries to update User 1's log
    const asUser2 = t.withIdentity(identity("user2@example.com"));

    await expect(
      asUser2.mutation(api.workoutLogs.update, {
        tenantId,
        logId,
        notes: "Hijacked",
      })
    ).rejects.toThrow("Workout log not found");
  });

  test("listMine returns only authenticated user's logs", async () => {
    const t = convexTest(schema);

    const { tenantId, user1Id } = await t.run(async (ctx) => {
      const user1Id = await ctx.db.insert("users", {
        name: "User One",
        email: "user1@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId: user1Id,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const user2Id = await ctx.db.insert("users", {
        name: "User Two",
        email: "user2@example.com",
      });
      await ctx.db.insert("memberships", {
        userId: user2Id,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      // User 1's logs
      await ctx.db.insert("workout_logs", {
        userId: user1Id,
        tenantId,
        date: "2024-06-15",
        workoutType: "AMRAP",
        isDraft: false,
      });

      // User 2's logs
      await ctx.db.insert("workout_logs", {
        userId: user2Id,
        tenantId,
        date: "2024-06-15",
        workoutType: "ForTime",
        isDraft: false,
      });

      return { tenantId, user1Id };
    });

    const asUser1 = t.withIdentity(identity("user1@example.com"));

    const logs = await asUser1.query(api.workoutLogs.listMine, { tenantId });

    expect(logs).toHaveLength(1);
    expect(logs[0].userId).toEqual(user1Id);
  });

  test("listMine respects date range filter", async () => {
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

      await ctx.db.insert("workout_logs", {
        userId,
        tenantId,
        date: "2024-06-10",
        workoutType: "AMRAP",
        isDraft: false,
      });

      await ctx.db.insert("workout_logs", {
        userId,
        tenantId,
        date: "2024-06-15",
        workoutType: "ForTime",
        isDraft: false,
      });

      await ctx.db.insert("workout_logs", {
        userId,
        tenantId,
        date: "2024-06-20",
        workoutType: "Strength",
        isDraft: false,
      });

      return { tenantId };
    });

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    const filtered = await asAthlete.query(api.workoutLogs.listMine, {
      tenantId,
      startDate: "2024-06-12",
      endDate: "2024-06-18",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].date).toBe("2024-06-15");
  });

  test("listByUser requires coach role", async () => {
    const t = convexTest(schema);

    const { tenantId, otherUserId } = await t.run(async (ctx) => {
      const athleteId = await ctx.db.insert("users", {
        name: "Athlete",
        email: "athlete@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId: athleteId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const otherUserId = await ctx.db.insert("users", {
        name: "Other",
        email: "other@example.com",
      });
      await ctx.db.insert("memberships", {
        userId: otherUserId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      return { tenantId, otherUserId };
    });

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    await expect(
      asAthlete.query(api.workoutLogs.listByUser, {
        tenantId,
        userId: otherUserId,
      })
    ).rejects.toThrow("Insufficient permissions");
  });

  test("getPreviousScores returns history for same workout", async () => {
    const t = convexTest(schema);

    const { tenantId, workoutDefId } = await t.run(async (ctx) => {
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

      const workoutDefId = await ctx.db.insert("workout_definitions", {
        tenantId,
        name: "Fran",
        workoutType: "ForTime",
        components: [],
      });

      // Two previous logs for this workout definition
      await ctx.db.insert("workout_logs", {
        userId,
        tenantId,
        workoutDefinitionId: workoutDefId,
        date: "2024-05-01",
        workoutType: "ForTime",
        scalingDesignation: "Rx",
        rpe: 9,
        isDraft: false,
      });

      await ctx.db.insert("workout_logs", {
        userId,
        tenantId,
        workoutDefinitionId: workoutDefId,
        date: "2024-06-01",
        workoutType: "ForTime",
        scalingDesignation: "Rx",
        rpe: 8,
        isDraft: false,
      });

      // Log for a different workout (should not appear)
      await ctx.db.insert("workout_logs", {
        userId,
        tenantId,
        date: "2024-06-01",
        workoutType: "AMRAP",
        isDraft: false,
      });

      return { tenantId, workoutDefId };
    });

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    const scores = await asAthlete.query(api.workoutLogs.getPreviousScores, {
      tenantId,
      workoutDefinitionId: workoutDefId,
    });

    expect(scores).toHaveLength(2);
    const dates = scores.map((s) => s.date).sort();
    expect(dates).toEqual(["2024-05-01", "2024-06-01"]);
  });

  test("getDrafts returns only drafts for current user", async () => {
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

      // Draft log
      await ctx.db.insert("workout_logs", {
        userId,
        tenantId,
        date: "2024-06-15",
        workoutType: "AMRAP",
        isDraft: true,
      });

      // Finalized log
      await ctx.db.insert("workout_logs", {
        userId,
        tenantId,
        date: "2024-06-14",
        workoutType: "ForTime",
        isDraft: false,
      });

      return { tenantId };
    });

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    const drafts = await asAthlete.query(api.workoutLogs.getDrafts, {
      tenantId,
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0].isDraft).toBe(true);
    expect(drafts[0].date).toBe("2024-06-15");
  });

  test("Tenant isolation: cannot see other tenant's workout logs", async () => {
    const t = convexTest(schema);

    const { tenantAId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Athlete",
        email: "athlete@example.com",
      });

      // Tenant A
      const tenantAId = await ctx.db.insert("tenants", {
        name: "Gym A",
        slug: "gym-a",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId: tenantAId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      // Tenant B
      const tenantBId = await ctx.db.insert("tenants", {
        name: "Gym B",
        slug: "gym-b",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId: tenantBId,
        role: "athlete",
        status: "active",
        isPrimaryGym: false,
        joinDate: "2024-01-01",
      });

      // Log in Tenant A
      await ctx.db.insert("workout_logs", {
        userId,
        tenantId: tenantAId,
        date: "2024-06-15",
        workoutType: "AMRAP",
        isDraft: false,
      });

      // Log in Tenant B
      await ctx.db.insert("workout_logs", {
        userId,
        tenantId: tenantBId,
        date: "2024-06-16",
        workoutType: "ForTime",
        isDraft: false,
      });

      return { tenantAId };
    });

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    const logsA = await asAthlete.query(api.workoutLogs.listMine, {
      tenantId: tenantAId,
    });

    expect(logsA).toHaveLength(1);
    expect(logsA[0].date).toBe("2024-06-15");
    expect(logsA[0].tenantId).toEqual(tenantAId);
  });
});
