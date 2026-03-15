import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("habits", () => {
  test("create inserts a new habit", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    const habitId = await asAlice.mutation(api.habits.create, {
      tenantId,
      name: "Drink 3L water",
      frequency: "daily",
    });

    expect(habitId).toBeDefined();
    const habit = await t.run(async (ctx) => ctx.db.get(habitId));
    expect(habit!.name).toBe("Drink 3L water");
    expect(habit!.trackingRecords).toEqual([]);
  });

  test("listMine returns only the user's habits", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId1 = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const userId2 = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: userId1, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("memberships", {
        userId: userId2, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });

      // Alice's habit
      await ctx.db.insert("habits", {
        userId: userId1, tenantId, name: "Stretch", frequency: "daily",
      });
      // Bob's habit
      await ctx.db.insert("habits", {
        userId: userId2, tenantId, name: "Meditate", frequency: "daily",
      });

      return { tenantId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    const habits = await asAlice.query(api.habits.listMine, { tenantId });

    expect(habits).toHaveLength(1);
    expect(habits[0].name).toBe("Stretch");
  });

  test("logCompletion appends a date to trackingRecords", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    const habitId = await asAlice.mutation(api.habits.create, {
      tenantId,
      name: "Sleep 8h",
      frequency: "daily",
    });

    await asAlice.mutation(api.habits.logCompletion, {
      tenantId,
      habitId,
      date: "2024-06-15",
    });

    const habit = await t.run(async (ctx) => ctx.db.get(habitId));
    expect(habit!.trackingRecords).toContain("2024-06-15");
  });

  test("remove deletes own habit only", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    const habitId = await asAlice.mutation(api.habits.create, {
      tenantId,
      name: "Read 30min",
      frequency: "daily",
    });

    await asAlice.mutation(api.habits.remove, { tenantId, habitId });

    const deleted = await t.run(async (ctx) => ctx.db.get(habitId));
    expect(deleted).toBeNull();
  });
});
