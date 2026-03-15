import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

describe("concept2Streaks", () => {
  test("getMine returns zeros when no streak record exists", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Alice",
        email: "alice@test.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Gym",
        slug: "gym",
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

    const asAlice = t.withIdentity({
      email: "alice@test.com",
      subject: "user|alice",
    });

    const result = await asAlice.query(api.concept2Streaks.getMine, {
      tenantId,
    });

    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.lastActivityDate).toBeUndefined();
  });

  test("updateStreak creates a new streak record on first activity", async () => {
    const t = convexTest(schema);

    const { userId, tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Bob",
        email: "bob@test.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Gym",
        slug: "gym",
      });
      return { userId, tenantId };
    });

    await t.mutation(internal.concept2Streaks.updateStreak, {
      userId,
      tenantId,
      activityDate: "2024-06-01",
    });

    const streak = await t.run(async (ctx) => {
      return await ctx.db
        .query("concept2_streaks")
        .withIndex("by_userId_tenantId", (q) =>
          q.eq("userId", userId).eq("tenantId", tenantId)
        )
        .first();
    });

    expect(streak).not.toBeNull();
    expect(streak!.currentStreak).toBe(1);
    expect(streak!.longestStreak).toBe(1);
    expect(streak!.lastActivityDate).toBe("2024-06-01");
  });

  test("updateStreak increments streak on consecutive days then getMine returns it", async () => {
    const t = convexTest(schema);

    const { userId, tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Carol",
        email: "carol@test.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Gym",
        slug: "gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { userId, tenantId };
    });

    await t.mutation(internal.concept2Streaks.updateStreak, {
      userId,
      tenantId,
      activityDate: "2024-06-01",
    });
    await t.mutation(internal.concept2Streaks.updateStreak, {
      userId,
      tenantId,
      activityDate: "2024-06-02",
    });
    await t.mutation(internal.concept2Streaks.updateStreak, {
      userId,
      tenantId,
      activityDate: "2024-06-03",
    });

    const asCarol = t.withIdentity({
      email: "carol@test.com",
      subject: "user|carol",
    });

    const result = await asCarol.query(api.concept2Streaks.getMine, {
      tenantId,
    });

    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.lastActivityDate).toBe("2024-06-03");
  });
});
