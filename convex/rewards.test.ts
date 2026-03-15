import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("rewards", () => {
  test("create inserts a reward (owner)", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Owner", email: "owner@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "owner", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asOwner = t.withIdentity({ email: "owner@test.com", subject: "user|owner" });
    const rewardId = await asOwner.mutation(api.rewards.create, {
      tenantId, name: "Free T-Shirt", pointCost: 500, quantityAvailable: 10,
    });

    const reward = await t.run(async (ctx) => ctx.db.get(rewardId));
    expect(reward!.name).toBe("Free T-Shirt");
    expect(reward!.pointCost).toBe(500);
  });

  test("list returns rewards with available quantity", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("rewards", {
        name: "Available", pointCost: 100, tenantId, quantityAvailable: 5,
      });
      await ctx.db.insert("rewards", {
        name: "Sold Out", pointCost: 200, tenantId, quantityAvailable: 0,
      });
      return { tenantId };
    });

    const asAthlete = t.withIdentity({ email: "athlete@test.com", subject: "user|athlete" });
    const rewards = await asAthlete.query(api.rewards.list, { tenantId });
    expect(rewards).toHaveLength(1);
    expect(rewards[0].name).toBe("Available");
  });

  test("redeem deducts points and records redemption", async () => {
    const t = convexTest(schema);

    const { tenantId, rewardId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("points", {
        userId, tenantId, actionType: "earned", pointsEarned: 1000, timestamp: Date.now(),
      });
      const rewardId = await ctx.db.insert("rewards", {
        name: "Water Bottle", pointCost: 200, tenantId, quantityAvailable: 3,
      });
      return { tenantId, rewardId };
    });

    const asAthlete = t.withIdentity({ email: "athlete@test.com", subject: "user|athlete" });
    const redemptionId = await asAthlete.mutation(api.rewards.redeem, { tenantId, rewardId });

    const redemption = await t.run(async (ctx) => ctx.db.get(redemptionId));
    expect(redemption!.rewardId).toEqual(rewardId);

    const reward = await t.run(async (ctx) => ctx.db.get(rewardId));
    expect(reward!.quantityAvailable).toBe(2);
  });

  test("remove sets quantityAvailable to 0 (owner)", async () => {
    const t = convexTest(schema);

    const { tenantId, rewardId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Owner", email: "owner@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "owner", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const rewardId = await ctx.db.insert("rewards", {
        name: "Prize", pointCost: 300, tenantId, quantityAvailable: 5,
      });
      return { tenantId, rewardId };
    });

    const asOwner = t.withIdentity({ email: "owner@test.com", subject: "user|owner" });
    await asOwner.mutation(api.rewards.remove, { tenantId, rewardId });

    const reward = await t.run(async (ctx) => ctx.db.get(rewardId));
    expect(reward!.quantityAvailable).toBe(0);
  });
});
