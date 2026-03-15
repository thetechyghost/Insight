import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

function identity(email: string) {
  return {
    email,
    subject: `user|${email}`,
    tokenIdentifier: `test|${email}`,
  };
}

describe("subscriptions", () => {
  test("getMySubscription returns active subscription", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const planId = await ctx.db.insert("membership_plans", {
        tenantId, name: "Monthly", type: "recurring", price: 99,
      });
      await ctx.db.insert("subscriptions", {
        userId, tenantId, planId, status: "active", startDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asAlice = t.withIdentity(identity("alice@test.com"));

    const sub = await asAlice.query(
      api.subscriptions.getMySubscription,
      { tenantId },
    );

    expect(sub).not.toBeNull();
    expect(sub!.status).toBe("active");
  });

  test("changePlan updates subscription planId", async () => {
    const t = convexTest(schema);

    const { tenantId, subId, newPlanId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const planId = await ctx.db.insert("membership_plans", {
        tenantId, name: "Monthly", type: "recurring", price: 99,
      });
      const newPlanId = await ctx.db.insert("membership_plans", {
        tenantId, name: "Annual", type: "recurring", price: 999,
      });
      const subId = await ctx.db.insert("subscriptions", {
        userId, tenantId, planId, status: "active", startDate: "2024-01-01",
      });
      return { tenantId, subId, newPlanId };
    });

    const asBob = t.withIdentity(identity("bob@test.com"));

    await asBob.mutation(
      api.subscriptions.changePlan,
      { tenantId, subscriptionId: subId, newPlanId },
    );

    const sub = await t.run(async (ctx) => ctx.db.get(subId));
    expect(sub!.planId).toEqual(newPlanId);
  });

  test("freeze sets status to paused", async () => {
    const t = convexTest(schema);

    const { tenantId, subId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Carol", email: "carol@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const planId = await ctx.db.insert("membership_plans", {
        tenantId, name: "Monthly", type: "recurring", price: 99,
      });
      const subId = await ctx.db.insert("subscriptions", {
        userId, tenantId, planId, status: "active", startDate: "2024-01-01",
      });
      return { tenantId, subId };
    });

    const asCarol = t.withIdentity(identity("carol@test.com"));

    await asCarol.mutation(
      api.subscriptions.freeze,
      { tenantId, subscriptionId: subId },
    );

    const sub = await t.run(async (ctx) => ctx.db.get(subId));
    expect(sub!.status).toBe("paused");
    expect(sub!.frozenAt).toBeDefined();
  });

  test("cancel sets cancelAtPeriodEnd to true", async () => {
    const t = convexTest(schema);

    const { tenantId, subId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Dave", email: "dave@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const planId = await ctx.db.insert("membership_plans", {
        tenantId, name: "Monthly", type: "recurring", price: 99,
      });
      const subId = await ctx.db.insert("subscriptions", {
        userId, tenantId, planId, status: "active", startDate: "2024-01-01",
      });
      return { tenantId, subId };
    });

    const asDave = t.withIdentity(identity("dave@test.com"));

    await asDave.mutation(
      api.subscriptions.cancel,
      { tenantId, subscriptionId: subId },
    );

    const sub = await t.run(async (ctx) => ctx.db.get(subId));
    expect(sub!.cancelAtPeriodEnd).toBe(true);
  });

  test("syncFromStripe updates subscription from Stripe webhook (internal)", async () => {
    const t = convexTest(schema);

    const { subId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Eve", email: "eve@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const planId = await ctx.db.insert("membership_plans", {
        tenantId, name: "Monthly", type: "recurring", price: 99,
      });
      const subId = await ctx.db.insert("subscriptions", {
        userId, tenantId, planId, status: "active", startDate: "2024-01-01",
        stripeSubscriptionId: "sub_test_123",
      });
      return { subId };
    });

    await t.mutation(internal.subscriptions.syncFromStripe, {
      stripeSubscriptionId: "sub_test_123",
      status: "past_due",
      currentPeriodEnd: "2024-07-01",
    });

    const sub = await t.run(async (ctx) => ctx.db.get(subId));
    expect(sub!.status).toBe("past_due");
    expect(sub!.currentPeriodEnd).toBe("2024-07-01");
  });
});
