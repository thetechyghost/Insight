import { expect, test, describe, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlatformAdmin(t: ReturnType<typeof convexTest>, options?: { email?: string }) {
  const email = options?.email ?? "admin@platform.com";
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Platform Admin", email });
    await ctx.db.insert("platform_admins", {
      userId,
      platformRole: "super_admin" as const,
      status: "active" as const,
    });
    return { userId };
  });
}

describe("platformModeration", () => {
  test("flag creates a pending moderation item", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const tenantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const id = await asAdmin.mutation(api.platformModeration.flag, {
      contentType: "post",
      contentId: "some-post-id",
      tenantId,
      reason: "Inappropriate content",
    });

    const item = await t.run(async (ctx) => ctx.db.get(id));
    expect(item!.status).toBe("pending");
    expect(item!.reason).toBe("Inappropriate content");

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });

  test("approve marks item as approved with reviewer", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const itemId = await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "G", slug: "g" });
      return await ctx.db.insert("moderation_queue", {
        contentType: "comment",
        contentId: "c1",
        tenantId,
        reason: "Spam",
        status: "pending",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformModeration.approve, { itemId });

    const item = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(item!.status).toBe("approved");
    expect(item!.reviewedBy).toBeDefined();
    expect(item!.reviewedAt).toBeDefined();

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });

  test("remove marks item as removed", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const itemId = await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "G", slug: "g" });
      return await ctx.db.insert("moderation_queue", {
        contentType: "media",
        contentId: "m1",
        tenantId,
        reason: "Nudity",
        status: "pending",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformModeration.remove, { itemId });

    const item = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(item!.status).toBe("removed");

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });

  test("list returns all items", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "G", slug: "g" });
      await ctx.db.insert("moderation_queue", {
        contentType: "post", contentId: "p1", tenantId, reason: "Spam", status: "pending",
      });
      await ctx.db.insert("moderation_queue", {
        contentType: "comment", contentId: "c1", tenantId, reason: "Abuse", status: "approved",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const all = await asAdmin.query(api.platformModeration.list, {});
    expect(all).toHaveLength(2);
  });

  test("list filters by status", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "G", slug: "g" });
      await ctx.db.insert("moderation_queue", {
        contentType: "post", contentId: "p1", tenantId, reason: "Spam", status: "pending",
      });
      await ctx.db.insert("moderation_queue", {
        contentType: "post", contentId: "p2", tenantId, reason: "Ok", status: "approved",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const pending = await asAdmin.query(api.platformModeration.list, { status: "pending" });
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe("pending");
  });

  test("list rejects unauthenticated", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.platformModeration.list, {})).rejects.toThrow();
  });

  test("list rejects non-admin", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "R", email: "r@test.com" });
    });
    const asR = t.withIdentity({ email: "r@test.com", subject: "user|r" });
    await expect(asR.query(api.platformModeration.list, {})).rejects.toThrow("Unauthorized");
  });
});
