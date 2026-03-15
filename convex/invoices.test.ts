import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("invoices", () => {
  test("createManual inserts an open invoice (admin)", async () => {
    const t = convexTest(schema);

    const { tenantId, athleteId } = await t.run(async (ctx) => {
      const adminId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const athleteId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: adminId, tenantId, role: "admin", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId, athleteId };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const invoiceId = await asAdmin.mutation(api.invoices.createManual, {
      tenantId, userId: athleteId, amount: 5000, currency: "USD",
    });

    const invoice = await t.run(async (ctx) => ctx.db.get(invoiceId));
    expect(invoice!.status).toBe("open");
    expect(invoice!.amount).toBe(5000);
  });

  test("listMine returns invoices for the current user", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("invoices", {
        userId, tenantId, amount: 100, currency: "USD",
        status: "open", createdAt: Date.now(),
      });
      return { tenantId };
    });

    const asAthlete = t.withIdentity({ email: "athlete@test.com", subject: "user|athlete" });
    const invoices = await asAthlete.query(api.invoices.listMine, { tenantId });
    expect(invoices).toHaveLength(1);
    expect(invoices[0].amount).toBe(100);
  });

  test("listByTenant returns all invoices (admin)", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const adminId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const athleteId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: adminId, tenantId, role: "admin", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("invoices", {
        userId: athleteId, tenantId, amount: 200, currency: "USD",
        status: "paid", createdAt: Date.now(),
      });
      await ctx.db.insert("invoices", {
        userId: adminId, tenantId, amount: 50, currency: "USD",
        status: "open", createdAt: Date.now(),
      });
      return { tenantId };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const invoices = await asAdmin.query(api.invoices.listByTenant, { tenantId });
    expect(invoices).toHaveLength(2);
  });

  test("voidInvoice sets status to void (admin)", async () => {
    const t = convexTest(schema);

    const { tenantId, invoiceId } = await t.run(async (ctx) => {
      const adminId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: adminId, tenantId, role: "admin", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const invoiceId = await ctx.db.insert("invoices", {
        userId: adminId, tenantId, amount: 300, currency: "USD",
        status: "open", createdAt: Date.now(),
      });
      return { tenantId, invoiceId };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await asAdmin.mutation(api.invoices.voidInvoice, { tenantId, invoiceId });

    const invoice = await t.run(async (ctx) => ctx.db.get(invoiceId));
    expect(invoice!.status).toBe("void");
  });
});
