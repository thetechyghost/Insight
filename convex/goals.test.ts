import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("goals", () => {
  test("create sets status to active", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const userId = (await ctx.db.query("users").first())!._id;
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    const goalId = await asAlice.mutation(
      api.goals.create,
      { tenantId, type: "strength", title: "Deadlift 200kg" },
    );

    const goal = await t.run(async (ctx) => ctx.db.get(goalId));
    expect(goal!.status).toBe("active");
    expect(goal!.title).toBe("Deadlift 200kg");
  });

  test("listMine returns only the user's goals", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const userId = (await ctx.db.query("users").first())!._id;
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asBob = t.withIdentity({ email: "bob@test.com", subject: "user|bob" });

    await asBob.mutation(api.goals.create, { tenantId, type: "strength", title: "Goal 1" });
    await asBob.mutation(api.goals.create, { tenantId, type: "endurance", title: "Goal 2" });

    const goals = await asBob.query(api.goals.listMine, { tenantId });
    expect(goals).toHaveLength(2);
  });

  test("update modifies own goal only", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Carol", email: "carol@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const userId = (await ctx.db.query("users").first())!._id;
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asCarol = t.withIdentity({ email: "carol@test.com", subject: "user|carol" });

    const goalId = await asCarol.mutation(
      api.goals.create,
      { tenantId, type: "skill", title: "Muscle-up" },
    );

    await asCarol.mutation(
      api.goals.update,
      { tenantId, goalId, title: "Strict Muscle-up" },
    );

    const updated = await t.run(async (ctx) => ctx.db.get(goalId));
    expect(updated!.title).toBe("Strict Muscle-up");
  });

  test("update rejects another user's goal", async () => {
    const t = convexTest(schema);

    const { tenantId, goalId } = await t.run(async (ctx) => {
      const userId1 = await ctx.db.insert("users", { name: "Owner", email: "owner@test.com" });
      await ctx.db.insert("users", { name: "Other", email: "other@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: userId1, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const otherUserId = (await ctx.db.query("users").collect())[1]._id;
      await ctx.db.insert("memberships", {
        userId: otherUserId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const goalId = await ctx.db.insert("goals", {
        userId: userId1, tenantId, type: "strength", title: "Test",
        status: "active", createdAt: Date.now(),
      });
      return { tenantId, goalId };
    });

    const asOther = t.withIdentity({ email: "other@test.com", subject: "user|other" });

    await expect(
      asOther.mutation(api.goals.update, { tenantId, goalId, title: "Hacked" })
    ).rejects.toThrow("Goal not found");
  });

  test("markComplete transitions status to completed", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Dave", email: "dave@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const userId = (await ctx.db.query("users").first())!._id;
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asDave = t.withIdentity({ email: "dave@test.com", subject: "user|dave" });

    const goalId = await asDave.mutation(
      api.goals.create,
      { tenantId, type: "body_comp", title: "Lose 5kg" },
    );

    await asDave.mutation(api.goals.markComplete, { tenantId, goalId });

    const goal = await t.run(async (ctx) => ctx.db.get(goalId));
    expect(goal!.status).toBe("completed");
  });

  test("abandon transitions status to abandoned", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Eve", email: "eve@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const userId = (await ctx.db.query("users").first())!._id;
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asEve = t.withIdentity({ email: "eve@test.com", subject: "user|eve" });

    const goalId = await asEve.mutation(
      api.goals.create,
      { tenantId, type: "consistency", title: "Train 5x/week" },
    );

    await asEve.mutation(api.goals.abandon, { tenantId, goalId });

    const goal = await t.run(async (ctx) => ctx.db.get(goalId));
    expect(goal!.status).toBe("abandoned");
  });
});
