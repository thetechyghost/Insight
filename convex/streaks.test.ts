import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

describe("streaks", () => {
  test("updateStreak increments count on consecutive days", async () => {
    const t = convexTest(schema);

    const { userId, tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      return { userId, tenantId };
    });

    await t.mutation(internal.streaks.updateStreak, {
      userId, tenantId, type: "workout", activityDate: "2024-06-01",
    });
    await t.mutation(internal.streaks.updateStreak, {
      userId, tenantId, type: "workout", activityDate: "2024-06-02",
    });

    const streak = await t.run(async (ctx) => {
      return await ctx.db.query("streaks")
        .withIndex("by_userId_type", (q) => q.eq("userId", userId).eq("type", "workout"))
        .first();
    });

    expect(streak!.currentCount).toBe(2);
    expect(streak!.longestCount).toBe(2);
  });

  test("updateStreak resets count on gap of more than one day", async () => {
    const t = convexTest(schema);

    const { userId, tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("streaks", {
        userId, tenantId, type: "workout", currentCount: 5, longestCount: 5,
        lastActivityDate: "2024-06-01",
      });
      return { userId, tenantId };
    });

    await t.mutation(internal.streaks.updateStreak, {
      userId, tenantId, type: "workout", activityDate: "2024-06-05",
    });

    const streak = await t.run(async (ctx) => {
      return await ctx.db.query("streaks")
        .withIndex("by_userId_type", (q) => q.eq("userId", userId).eq("type", "workout"))
        .first();
    });

    expect(streak!.currentCount).toBe(1);
    expect(streak!.longestCount).toBe(5); // preserves longest
  });

  test("updateStreak same-day activity is a no-op", async () => {
    const t = convexTest(schema);

    const { userId, tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Carol", email: "carol@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("streaks", {
        userId, tenantId, type: "logging", currentCount: 3, longestCount: 3,
        lastActivityDate: "2024-06-10",
      });
      return { userId, tenantId };
    });

    await t.mutation(internal.streaks.updateStreak, {
      userId, tenantId, type: "logging", activityDate: "2024-06-10",
    });

    const streak = await t.run(async (ctx) => {
      return await ctx.db.query("streaks")
        .withIndex("by_userId_type", (q) => q.eq("userId", userId).eq("type", "logging"))
        .first();
    });

    expect(streak!.currentCount).toBe(3); // unchanged
  });

  test("useFreeze decrements freeze credits", async () => {
    const t = convexTest(schema);

    const { tenantId, streakId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Dave", email: "dave@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const streakId = await ctx.db.insert("streaks", {
        userId, tenantId, type: "workout", currentCount: 10, longestCount: 10,
        lastActivityDate: "2024-06-10", freezeCreditsRemaining: 2,
      });
      return { tenantId, streakId };
    });

    const asDave = t.withIdentity({ email: "dave@test.com", subject: "user|dave" });

    await asDave.mutation(
      api.streaks.useFreeze,
      { tenantId, streakId },
    );

    const streak = await t.run(async (ctx) => ctx.db.get(streakId));
    expect(streak!.freezeCreditsRemaining).toBe(1);
  });

  test("getMine returns empty array when no streaks exist", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Eve", email: "eve@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asEve = t.withIdentity({ email: "eve@test.com", subject: "user|eve" });

    const streaks = await asEve.query(
      api.streaks.getMine,
      { tenantId },
    );

    expect(streaks).toHaveLength(0);
  });
});
