import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("benchmarkWorkouts", () => {
  test("list returns platform + tenant benchmarks", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });

      // Platform benchmark (no tenantId)
      await ctx.db.insert("benchmark_workouts", {
        name: "Fran",
        workoutType: "ForTime",
        prescribedMovements: [{ exerciseName: "Thruster", reps: 21 }],
        scoringMethod: "time",
        category: "Girl",
      });

      // Tenant benchmark
      await ctx.db.insert("benchmark_workouts", {
        tenantId,
        name: "Gym Special",
        workoutType: "AMRAP",
        prescribedMovements: [{ exerciseName: "Burpee", reps: 10 }],
        scoringMethod: "reps",
      });

      return { tenantId };
    });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });
    const results = await asCoach.query(api.benchmarkWorkouts.list, { tenantId });

    expect(results).toHaveLength(2);
    const names = results.map((r: { name: string }) => r.name).sort();
    expect(names).toEqual(["Fran", "Gym Special"]);
  });

  test("getById returns a benchmark by ID", async () => {
    const t = convexTest(schema);

    const { tenantId, benchmarkId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });

      const benchmarkId = await ctx.db.insert("benchmark_workouts", {
        tenantId,
        name: "Murph",
        workoutType: "ForTime",
        prescribedMovements: [{ exerciseName: "Run", distance: { value: 1600, unit: "m" } }],
        scoringMethod: "time",
        category: "Hero",
      });

      return { tenantId, benchmarkId };
    });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });
    const result = await asCoach.query(api.benchmarkWorkouts.getById, { tenantId, benchmarkId });

    expect(result.name).toBe("Murph");
  });

  test("create inserts a tenant benchmark (coach)", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });

    const id = await asCoach.mutation(api.benchmarkWorkouts.create, {
      tenantId,
      name: "Custom WOD",
      workoutType: "AMRAP",
      scoringMethod: "reps",
      category: "custom",
    });

    expect(id).toBeDefined();
    const created = await t.run(async (ctx) => ctx.db.get(id));
    expect(created!.name).toBe("Custom WOD");
    expect(created!.tenantId).toEqual(tenantId);
  });

  test("update modifies a tenant benchmark (coach)", async () => {
    const t = convexTest(schema);

    const { tenantId, benchmarkId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });

      const benchmarkId = await ctx.db.insert("benchmark_workouts", {
        tenantId,
        name: "Old Name",
        workoutType: "ForTime",
        prescribedMovements: [{ exerciseName: "Squat", reps: 50 }],
        scoringMethod: "time",
      });

      return { tenantId, benchmarkId };
    });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });

    await asCoach.mutation(api.benchmarkWorkouts.update, {
      tenantId,
      benchmarkId,
      name: "New Name",
    });

    const updated = await t.run(async (ctx) => ctx.db.get(benchmarkId));
    expect(updated!.name).toBe("New Name");
  });
});
