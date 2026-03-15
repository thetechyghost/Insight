import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("membershipPlans", () => {
  test("create inserts a new plan (owner)", async () => {
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
    const planId = await asOwner.mutation(api.membershipPlans.create, {
      tenantId, name: "Premium", type: "recurring", price: 99,
      billingInterval: "monthly",
    });

    const plan = await t.run(async (ctx) => ctx.db.get(planId));
    expect(plan!.name).toBe("Premium");
    expect(plan!.isActive).toBe(true);
    expect(plan!.type).toBe("recurring");
  });

  test("list returns plans for the tenant", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("membership_plans", {
        tenantId, name: "Basic", type: "recurring", price: 49, isActive: true,
      });
      await ctx.db.insert("membership_plans", {
        tenantId, name: "Drop-In", type: "drop_in", price: 15, isActive: true,
      });
      return { tenantId };
    });

    const asAthlete = t.withIdentity({ email: "athlete@test.com", subject: "user|athlete" });
    const plans = await asAthlete.query(api.membershipPlans.list, { tenantId });
    expect(plans).toHaveLength(2);
  });

  test("deactivate sets isActive to false", async () => {
    const t = convexTest(schema);

    const { tenantId, planId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Owner", email: "owner@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "owner", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const planId = await ctx.db.insert("membership_plans", {
        tenantId, name: "Old Plan", type: "recurring", price: 79, isActive: true,
      });
      return { tenantId, planId };
    });

    const asOwner = t.withIdentity({ email: "owner@test.com", subject: "user|owner" });
    await asOwner.mutation(api.membershipPlans.deactivate, { tenantId, planId });

    const plan = await t.run(async (ctx) => ctx.db.get(planId));
    expect(plan!.isActive).toBe(false);
  });

  test("getById returns a specific plan", async () => {
    const t = convexTest(schema);

    const { tenantId, planId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const planId = await ctx.db.insert("membership_plans", {
        tenantId, name: "Trial", type: "trial", price: 0, isActive: true, trialDays: 7,
      });
      return { tenantId, planId };
    });

    const asAthlete = t.withIdentity({ email: "athlete@test.com", subject: "user|athlete" });
    const plan = await asAthlete.query(api.membershipPlans.getById, { tenantId, planId });
    expect(plan.name).toBe("Trial");
    expect(plan.trialDays).toBe(7);
  });
});
