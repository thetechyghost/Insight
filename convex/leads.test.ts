import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("leads", () => {
  test("create inserts a new lead with status new (admin)", async () => {
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
    const leadId = await asAdmin.mutation(api.leads.create, {
      tenantId, name: "Jane Prospect", email: "jane@example.com", source: "web_form",
    });

    const lead = await t.run(async (ctx) => ctx.db.get(leadId));
    expect(lead!.name).toBe("Jane Prospect");
    expect(lead!.status).toBe("new");
  });

  test("list returns leads for the tenant (admin)", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "admin", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("leads", {
        tenantId, name: "Lead A", status: "new",
      });
      await ctx.db.insert("leads", {
        tenantId, name: "Lead B", status: "contacted",
      });
      return { tenantId };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const leads = await asAdmin.query(api.leads.list, { tenantId });
    expect(leads).toHaveLength(2);
  });

  test("assign sets assignedStaffId on a lead", async () => {
    const t = convexTest(schema);

    const { tenantId, leadId, staffId } = await t.run(async (ctx) => {
      const adminId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const staffId = await ctx.db.insert("users", { name: "Staff", email: "staff@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: adminId, tenantId, role: "admin", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const leadId = await ctx.db.insert("leads", {
        tenantId, name: "Prospect", status: "new",
      });
      return { tenantId, leadId, staffId };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await asAdmin.mutation(api.leads.assign, { tenantId, leadId, userId: staffId });

    const lead = await t.run(async (ctx) => ctx.db.get(leadId));
    expect(lead!.assignedStaffId).toEqual(staffId);
  });

  test("convert sets status to converted", async () => {
    const t = convexTest(schema);

    const { tenantId, leadId } = await t.run(async (ctx) => {
      const adminId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: adminId, tenantId, role: "admin", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const leadId = await ctx.db.insert("leads", {
        tenantId, name: "Hot Lead", status: "trial",
      });
      return { tenantId, leadId };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await asAdmin.mutation(api.leads.convert, { tenantId, leadId });

    const lead = await t.run(async (ctx) => ctx.db.get(leadId));
    expect(lead!.status).toBe("converted");
  });
});
