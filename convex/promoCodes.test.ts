import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("promoCodes", () => {
  test("create inserts a new promo code (admin)", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "admin", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const promoId = await asAdmin.mutation(api.promoCodes.create, {
      tenantId, code: "SUMMER20", discountType: "percentage", discountValue: 20,
      maxUses: 100,
    });

    const promo = await t.run(async (ctx) => ctx.db.get(promoId));
    expect(promo!.code).toBe("SUMMER20");
    expect(promo!.currentUses).toBe(0);
    expect(promo!.isActive).toBe(true);
  });

  test("validate returns valid for active promo code", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("promo_codes", {
        tenantId, code: "VALID10", discountType: "fixed", discountValue: 10,
        currentUses: 0, isActive: true,
      });
      return { tenantId };
    });

    const asAthlete = t.withIdentity({ email: "athlete@test.com", subject: "user|athlete" });
    const result = await asAthlete.query(api.promoCodes.validate, { tenantId, code: "VALID10" });
    expect(result.valid).toBe(true);
    expect(result.discountType).toBe("fixed");
    expect(result.discountValue).toBe(10);
  });

  test("apply increments currentUses and returns discount", async () => {
    const t = convexTest(schema);

    const { tenantId, promoId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const promoId = await ctx.db.insert("promo_codes", {
        tenantId, code: "APPLY5", discountType: "percentage", discountValue: 5,
        currentUses: 0, isActive: true,
      });
      return { tenantId, promoId };
    });

    const asAthlete = t.withIdentity({ email: "athlete@test.com", subject: "user|athlete" });
    const result = await asAthlete.mutation(api.promoCodes.apply, { tenantId, code: "APPLY5" });
    expect(result.discountType).toBe("percentage");
    expect(result.discountValue).toBe(5);

    const promo = await t.run(async (ctx) => ctx.db.get(promoId));
    expect(promo!.currentUses).toBe(1);
  });

  test("deactivate sets isActive to false (admin)", async () => {
    const t = convexTest(schema);

    const { tenantId, promoCodeId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "admin", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const promoCodeId = await ctx.db.insert("promo_codes", {
        tenantId, code: "EXPIRE", discountType: "fixed", discountValue: 15,
        currentUses: 5, isActive: true,
      });
      return { tenantId, promoCodeId };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await asAdmin.mutation(api.promoCodes.deactivate, { tenantId, promoCodeId });

    const promo = await t.run(async (ctx) => ctx.db.get(promoCodeId));
    expect(promo!.isActive).toBe(false);
  });
});
