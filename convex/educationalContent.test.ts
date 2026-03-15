import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("educationalContent", () => {
  test("list returns platform + tenant content", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });

      // Platform content (no tenantId)
      await ctx.db.insert("educational_content", {
        title: "Nutrition Basics",
        body: "Eat well.",
        tags: ["nutrition"],
      });

      // Tenant content
      await ctx.db.insert("educational_content", {
        tenantId,
        title: "Gym Rules",
        body: "Follow the rules.",
        tags: ["gym"],
      });

      return { tenantId };
    });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });
    const results = await asCoach.query(api.educationalContent.list, { tenantId });

    expect(results).toHaveLength(2);
    const titles = results.map((r: { title: string }) => r.title).sort();
    expect(titles).toEqual(["Gym Rules", "Nutrition Basics"]);
  });

  test("create inserts tenant educational content (coach)", async () => {
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

    const id = await asCoach.mutation(api.educationalContent.create, {
      tenantId,
      title: "Recovery Tips",
      body: "Sleep and stretch.",
      tags: ["recovery"],
    });

    expect(id).toBeDefined();
    const content = await t.run(async (ctx) => ctx.db.get(id));
    expect(content!.title).toBe("Recovery Tips");
    expect(content!.tenantId).toEqual(tenantId);
  });

  test("search matches title case-insensitively", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });

      await ctx.db.insert("educational_content", {
        tenantId,
        title: "Mobility Guide",
        body: "Foam roll daily.",
        tags: ["mobility"],
      });

      await ctx.db.insert("educational_content", {
        tenantId,
        title: "Strength Training",
        body: "Lift heavy.",
        tags: ["strength"],
      });

      return { tenantId };
    });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });
    const results = await asCoach.query(api.educationalContent.search, {
      tenantId,
      query: "mobility",
    });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Mobility Guide");
  });

  test("remove deletes tenant-owned content only", async () => {
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

    const contentId = await asCoach.mutation(api.educationalContent.create, {
      tenantId,
      title: "To Delete",
      body: "Temporary content.",
    });

    await asCoach.mutation(api.educationalContent.remove, { tenantId, contentId });

    const deleted = await t.run(async (ctx) => ctx.db.get(contentId));
    expect(deleted).toBeNull();
  });
});
