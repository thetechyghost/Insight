import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("facilityAreas", () => {
  test("create inserts a facility area (admin)", async () => {
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
    const areaId = await asAdmin.mutation(api.facilityAreas.create, {
      tenantId, name: "Weight Room", capacity: 30,
      equipmentList: ["squat rack", "bench press"],
    });

    const area = await t.run(async (ctx) => ctx.db.get(areaId));
    expect(area!.name).toBe("Weight Room");
    expect(area!.capacity).toBe(30);
    expect(area!.equipmentList).toHaveLength(2);
  });

  test("list returns all areas for the tenant", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("facility_areas", { tenantId, name: "Cardio Zone" });
      await ctx.db.insert("facility_areas", { tenantId, name: "Stretching Area" });
      return { tenantId };
    });

    const asAthlete = t.withIdentity({ email: "athlete@test.com", subject: "user|athlete" });
    const areas = await asAthlete.query(api.facilityAreas.list, { tenantId });
    expect(areas).toHaveLength(2);
  });

  test("remove deletes the facility area (admin)", async () => {
    const t = convexTest(schema);

    const { tenantId, areaId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "admin", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const areaId = await ctx.db.insert("facility_areas", {
        tenantId, name: "Old Room", capacity: 10,
      });
      return { tenantId, areaId };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await asAdmin.mutation(api.facilityAreas.remove, { tenantId, areaId });

    const deleted = await t.run(async (ctx) => ctx.db.get(areaId));
    expect(deleted).toBeNull();
  });
});
