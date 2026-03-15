import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("workoutDefinitions", () => {
  test("list returns tenant workout definitions", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });

      await ctx.db.insert("workout_definitions", {
        tenantId,
        createdBy: userId,
        name: "Morning WOD",
        workoutType: "AMRAP",
        components: [{ exerciseName: "Pull-up", reps: 10, order: 1 }],
      });

      return { tenantId };
    });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });
    const results = await asCoach.query(api.workoutDefinitions.list, { tenantId });

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Morning WOD");
  });

  test("create inserts a workout definition (coach)", async () => {
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

    const id = await asCoach.mutation(api.workoutDefinitions.create, {
      tenantId,
      name: "Evening WOD",
      workoutType: "ForTime",
    });

    expect(id).toBeDefined();
    const created = await t.run(async (ctx) => ctx.db.get(id));
    expect(created!.name).toBe("Evening WOD");
    expect(created!.tenantId).toEqual(tenantId);
  });

  test("duplicate creates a copy with (Copy) suffix", async () => {
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

    const originalId = await asCoach.mutation(api.workoutDefinitions.create, {
      tenantId,
      name: "Template WOD",
      workoutType: "AMRAP",
    });

    const copyId = await asCoach.mutation(api.workoutDefinitions.duplicate, {
      tenantId,
      workoutDefinitionId: originalId,
    });

    expect(copyId).not.toEqual(originalId);
    const copy = await t.run(async (ctx) => ctx.db.get(copyId));
    expect(copy!.name).toBe("Template WOD (Copy)");
  });

  test("getById returns a single workout definition", async () => {
    const t = convexTest(schema);

    const { tenantId, defId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });

      const defId = await ctx.db.insert("workout_definitions", {
        tenantId,
        createdBy: userId,
        name: "Strength Day",
        workoutType: "Strength",
        components: [{ exerciseName: "Deadlift", sets: 5, reps: 3, order: 1 }],
      });

      return { tenantId, defId };
    });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });
    const result = await asCoach.query(api.workoutDefinitions.getById, {
      tenantId,
      workoutDefinitionId: defId,
    });

    expect(result.name).toBe("Strength Day");
    expect(result._id).toEqual(defId);
  });
});
