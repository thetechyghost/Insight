import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

describe("badges", () => {
  test("awardBadge creates a user_badge record (internal)", async () => {
    const t = convexTest(schema);

    const { userId, tenantId, badgeId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const badgeId = await ctx.db.insert("badges", {
        name: "First Workout", description: "Complete your first workout",
        category: "movement", criteria: { type: "workout_count", threshold: 1 },
      });
      return { userId, tenantId, badgeId };
    });

    const userBadgeId = await t.mutation(internal.badges.awardBadge, {
      userId, tenantId, badgeId,
    });

    const userBadge = await t.run(async (ctx) => ctx.db.get(userBadgeId));
    expect(userBadge!.badgeId).toEqual(badgeId);
    expect(userBadge!.userId).toEqual(userId);
  });

  test("awardBadge is idempotent (no duplicates)", async () => {
    const t = convexTest(schema);

    const { userId, tenantId, badgeId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const badgeId = await ctx.db.insert("badges", {
        name: "Streak Master", description: "7 day streak",
        category: "consistency", criteria: { type: "streak", threshold: 7 },
      });
      return { userId, tenantId, badgeId };
    });

    const firstId = await t.mutation(internal.badges.awardBadge, { userId, tenantId, badgeId });
    const secondId = await t.mutation(internal.badges.awardBadge, { userId, tenantId, badgeId });

    expect(secondId).toEqual(firstId);

    const allBadges = await t.run(async (ctx) => {
      return await ctx.db.query("user_badges")
        .withIndex("by_userId_tenantId", (q) => q.eq("userId", userId).eq("tenantId", tenantId))
        .collect();
    });
    expect(allBadges).toHaveLength(1);
  });

  test("getMyBadges returns badges with details", async () => {
    const t = convexTest(schema);

    const { tenantId, badgeId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Carol", email: "carol@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const badgeId = await ctx.db.insert("badges", {
        name: "Community Star", description: "Help 10 members",
        category: "community", criteria: { type: "help_count", threshold: 10 },
      });
      await ctx.db.insert("user_badges", {
        badgeId, userId, tenantId, earnedAt: Date.now(),
      });
      return { tenantId, badgeId };
    });

    const asCarol = t.withIdentity({ email: "carol@test.com", subject: "user|carol" });

    const myBadges = await asCarol.query(
      api.badges.getMyBadges,
      { tenantId },
    );

    expect(myBadges).toHaveLength(1);
    expect(myBadges[0].badge).not.toBeNull();
    expect(myBadges[0].badge!.name).toBe("Community Star");
  });

  test("list returns all platform badges", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Dave", email: "dave@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("badges", {
        name: "Badge A", description: "Desc A", category: "movement",
        criteria: {}, rarityTier: "common",
      });
      await ctx.db.insert("badges", {
        name: "Badge B", description: "Desc B", category: "competition",
        criteria: {}, rarityTier: "epic",
      });
      return { tenantId };
    });

    const asDave = t.withIdentity({ email: "dave@test.com", subject: "user|dave" });

    const badges = await asDave.query(api.badges.list, { tenantId });
    expect(badges).toHaveLength(2);
  });

  test("getUserBadges returns badges for a specific user", async () => {
    const t = convexTest(schema);

    const { tenantId, athleteId } = await t.run(async (ctx) => {
      const coachId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const athleteId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: coachId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const badgeId = await ctx.db.insert("badges", {
        name: "Competition Winner", description: "Win a challenge",
        category: "competition", criteria: {},
      });
      await ctx.db.insert("user_badges", {
        badgeId, userId: athleteId, tenantId, earnedAt: Date.now(),
      });
      return { tenantId, athleteId };
    });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });

    const badges = await asCoach.query(
      api.badges.getUserBadges,
      { tenantId, userId: athleteId },
    );

    expect(badges).toHaveLength(1);
    expect(badges[0].badge!.name).toBe("Competition Winner");
  });
});
