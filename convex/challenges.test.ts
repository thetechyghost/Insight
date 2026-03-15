import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

describe("challenges", () => {
  test("create makes a new challenge (coach)", async () => {
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

    const challengeId = await asCoach.mutation(
      api.challenges.create,
      { tenantId, name: "Row 100k", type: "distance", startDate: "2024-07-01", endDate: "2024-07-31" },
    );

    const challenge = await t.run(async (ctx) => ctx.db.get(challengeId));
    expect(challenge!.name).toBe("Row 100k");
    expect(challenge!.type).toBe("distance");
  });

  test("join adds participant and leave removes them", async () => {
    const t = convexTest(schema);

    const { tenantId, challengeId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const challengeId = await ctx.db.insert("challenges", {
        name: "Summer Challenge", type: "frequency", tenantId,
        startDate: "2024-07-01", endDate: "2024-07-31",
      });
      return { tenantId, challengeId };
    });

    const asAthlete = t.withIdentity({ email: "athlete@test.com", subject: "user|athlete" });

    const participantId = await asAthlete.mutation(
      api.challenges.join,
      { tenantId, challengeId },
    );
    expect(participantId).toBeDefined();

    await asAthlete.mutation(
      api.challenges.leave,
      { tenantId, challengeId },
    );

    const participant = await t.run(async (ctx) => ctx.db.get(participantId));
    expect(participant).toBeNull();
  });

  test("join rejects duplicate enrollment", async () => {
    const t = convexTest(schema);

    const { tenantId, challengeId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const challengeId = await ctx.db.insert("challenges", {
        name: "Challenge", type: "volume", tenantId,
        startDate: "2024-07-01", endDate: "2024-07-31",
      });
      return { tenantId, challengeId };
    });

    const asAthlete = t.withIdentity({ email: "athlete@test.com", subject: "user|athlete" });

    await asAthlete.mutation(api.challenges.join, { tenantId, challengeId });

    await expect(
      asAthlete.mutation(api.challenges.join, { tenantId, challengeId })
    ).rejects.toThrow("Already joined this challenge");
  });

  test("updateProgress updates participant progress (internal)", async () => {
    const t = convexTest(schema);

    const { participantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const challengeId = await ctx.db.insert("challenges", {
        name: "Challenge", type: "distance",
        startDate: "2024-07-01", endDate: "2024-07-31",
      });
      const participantId = await ctx.db.insert("challenge_participants", {
        challengeId, userId, progress: 0, enrolledAt: Date.now(),
      });
      return { participantId };
    });

    await t.mutation(internal.challenges.updateProgress, {
      participantId, progress: 50000,
    });

    const updated = await t.run(async (ctx) => ctx.db.get(participantId));
    expect(updated!.progress).toBe(50000);
  });

  test("getStandings returns participants sorted by progress descending", async () => {
    const t = convexTest(schema);

    const { tenantId, challengeId } = await t.run(async (ctx) => {
      const user1 = await ctx.db.insert("users", { name: "Fast", email: "fast@test.com" });
      const user2 = await ctx.db.insert("users", { name: "Slow", email: "slow@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: user1, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const challengeId = await ctx.db.insert("challenges", {
        name: "Race", type: "distance", tenantId,
        startDate: "2024-07-01", endDate: "2024-07-31",
      });
      await ctx.db.insert("challenge_participants", {
        challengeId, userId: user1, progress: 80000, enrolledAt: Date.now(),
      });
      await ctx.db.insert("challenge_participants", {
        challengeId, userId: user2, progress: 120000, enrolledAt: Date.now(),
      });
      return { tenantId, challengeId };
    });

    const asFast = t.withIdentity({ email: "fast@test.com", subject: "user|fast" });

    const standings = await asFast.query(
      api.challenges.getStandings,
      { tenantId, challengeId },
    );

    expect(standings).toHaveLength(2);
    expect(standings[0].progress).toBe(120000);
    expect(standings[1].progress).toBe(80000);
  });

  test("close sets endDate to today (coach)", async () => {
    const t = convexTest(schema);

    const { tenantId, challengeId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const challengeId = await ctx.db.insert("challenges", {
        name: "Long Challenge", type: "benchmark", tenantId,
        startDate: "2024-01-01", endDate: "2025-12-31",
      });
      return { tenantId, challengeId };
    });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });

    await asCoach.mutation(
      api.challenges.close,
      { tenantId, challengeId },
    );

    const challenge = await t.run(async (ctx) => ctx.db.get(challengeId));
    const today = new Date().toISOString().slice(0, 10);
    expect(challenge!.endDate).toBe(today);
  });
});
