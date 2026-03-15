import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("scheduleTemplates", () => {
  test("create inserts a schedule template (admin)", async () => {
    const t = convexTest(schema);

    const { tenantId, classId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "admin", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const classId = await ctx.db.insert("classes", {
        tenantId, name: "CrossFit", capacity: 20,
      });
      return { tenantId, classId };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const templateId = await asAdmin.mutation(api.scheduleTemplates.create, {
      tenantId, name: "Morning WOD", classId, dayOfWeek: 1,
      startTime: "06:00", endTime: "07:00",
    });

    const template = await t.run(async (ctx) => ctx.db.get(templateId));
    expect(template!.name).toBe("Morning WOD");
    expect(template!.isActive).toBe(true);
  });

  test("list returns all templates for the tenant", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const classId = await ctx.db.insert("classes", {
        tenantId, name: "Yoga", capacity: 15,
      });
      await ctx.db.insert("schedule_templates", {
        tenantId, name: "Template A", classId, dayOfWeek: 2,
        startTime: "08:00", endTime: "09:00", isActive: true,
      });
      return { tenantId };
    });

    const asAthlete = t.withIdentity({ email: "athlete@test.com", subject: "user|athlete" });
    const templates = await asAthlete.query(api.scheduleTemplates.list, { tenantId });
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe("Template A");
  });

  test("remove sets isActive to false (soft delete)", async () => {
    const t = convexTest(schema);

    const { tenantId, templateId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "admin", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const classId = await ctx.db.insert("classes", {
        tenantId, name: "Boxing", capacity: 12,
      });
      const templateId = await ctx.db.insert("schedule_templates", {
        tenantId, name: "Evening Class", classId, dayOfWeek: 3,
        startTime: "18:00", endTime: "19:00", isActive: true,
      });
      return { tenantId, templateId };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await asAdmin.mutation(api.scheduleTemplates.remove, { tenantId, templateId });

    const template = await t.run(async (ctx) => ctx.db.get(templateId));
    expect(template!.isActive).toBe(false);
  });
});
