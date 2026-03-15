import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("bookingPolicies", () => {
  test("upsert creates a new booking policy (owner)", async () => {
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
    const policyId = await asOwner.mutation(api.bookingPolicies.upsert, {
      tenantId, cancellationWindowHours: 24,
      waitlistEnabled: true, autoPromoteFromWaitlist: false,
    });

    const policy = await t.run(async (ctx) => ctx.db.get(policyId));
    expect(policy!.cancellationWindowHours).toBe(24);
    expect(policy!.waitlistEnabled).toBe(true);
  });

  test("getForTenant returns the policy or null", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("booking_policies", {
        tenantId, cancellationWindowHours: 12,
        waitlistEnabled: false, autoPromoteFromWaitlist: false,
      });
      return { tenantId };
    });

    const asAthlete = t.withIdentity({ email: "athlete@test.com", subject: "user|athlete" });
    const policy = await asAthlete.query(api.bookingPolicies.getForTenant, { tenantId });
    expect(policy).not.toBeNull();
    expect(policy!.cancellationWindowHours).toBe(12);
  });

  test("upsert updates existing policy instead of creating new", async () => {
    const t = convexTest(schema);

    const { tenantId, existingPolicyId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Owner", email: "owner@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "owner", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const existingPolicyId = await ctx.db.insert("booking_policies", {
        tenantId, cancellationWindowHours: 24,
        waitlistEnabled: false, autoPromoteFromWaitlist: false,
      });
      return { tenantId, existingPolicyId };
    });

    const asOwner = t.withIdentity({ email: "owner@test.com", subject: "user|owner" });
    const returnedId = await asOwner.mutation(api.bookingPolicies.upsert, {
      tenantId, cancellationWindowHours: 48,
      waitlistEnabled: true, autoPromoteFromWaitlist: true,
    });

    expect(returnedId).toEqual(existingPolicyId);
    const policy = await t.run(async (ctx) => ctx.db.get(existingPolicyId));
    expect(policy!.cancellationWindowHours).toBe(48);
    expect(policy!.waitlistEnabled).toBe(true);
  });
});
