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

describe("platformAnnouncements", () => {
  test("list returns all announcements", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("platform_announcements", {
        title: "Maintenance", content: "Scheduled downtime", priority: "warning",
        status: "published", createdBy: userId, publishedAt: Date.now(),
      });
      await ctx.db.insert("platform_announcements", {
        title: "Draft Note", content: "Not ready", priority: "info",
        status: "draft", createdBy: userId,
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const all = await asAdmin.query(api.platformAnnouncements.list, {});
    expect(all).toHaveLength(2);
  });

  test("list filters by status", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("platform_announcements", {
        title: "Published", content: "Live", priority: "info",
        status: "published", createdBy: userId, publishedAt: Date.now(),
      });
      await ctx.db.insert("platform_announcements", {
        title: "Draft", content: "WIP", priority: "info",
        status: "draft", createdBy: userId,
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const drafts = await asAdmin.query(api.platformAnnouncements.list, { status: "draft" });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].title).toBe("Draft");
  });

  test("create inserts a draft announcement", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const id = await asAdmin.mutation(api.platformAnnouncements.create, {
      title: "New Feature",
      content: "We launched X",
      priority: "info",
    });

    const announcement = await t.run(async (ctx) => ctx.db.get(id));
    expect(announcement!.title).toBe("New Feature");
    expect(announcement!.status).toBe("draft");
    expect(announcement!.publishedAt).toBeUndefined();

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });

  test("create rejects empty title", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.platformAnnouncements.create, {
        title: " ", content: "Body", priority: "info",
      })
    ).rejects.toThrow("title cannot be empty");
  });

  test("publish sets status and publishedAt", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    const announcementId = await t.run(async (ctx) => {
      return await ctx.db.insert("platform_announcements", {
        title: "Publish Me", content: "Content", priority: "info",
        status: "draft", createdBy: userId,
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformAnnouncements.publish, { announcementId });

    const published = await t.run(async (ctx) => ctx.db.get(announcementId));
    expect(published!.status).toBe("published");
    expect(published!.publishedAt).toBeDefined();

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });

  test("publish rejects already-published announcement", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    const announcementId = await t.run(async (ctx) => {
      return await ctx.db.insert("platform_announcements", {
        title: "Already Published", content: "Content", priority: "info",
        status: "published", createdBy: userId, publishedAt: Date.now(),
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.platformAnnouncements.publish, { announcementId })
    ).rejects.toThrow("already published");
  });

  test("archive sets status to archived", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    const announcementId = await t.run(async (ctx) => {
      return await ctx.db.insert("platform_announcements", {
        title: "Archive Me", content: "Content", priority: "info",
        status: "published", createdBy: userId, publishedAt: Date.now(),
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformAnnouncements.archive, { announcementId });

    const archived = await t.run(async (ctx) => ctx.db.get(announcementId));
    expect(archived!.status).toBe("archived");

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });

  test("remove deletes draft announcement", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    const announcementId = await t.run(async (ctx) => {
      return await ctx.db.insert("platform_announcements", {
        title: "Delete Me", content: "Content", priority: "info",
        status: "draft", createdBy: userId,
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformAnnouncements.remove, { announcementId });

    const deleted = await t.run(async (ctx) => ctx.db.get(announcementId));
    expect(deleted).toBeNull();

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });

  test("remove rejects published announcement", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    const announcementId = await t.run(async (ctx) => {
      return await ctx.db.insert("platform_announcements", {
        title: "Published", content: "Content", priority: "info",
        status: "published", createdBy: userId, publishedAt: Date.now(),
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.platformAnnouncements.remove, { announcementId })
    ).rejects.toThrow("Only draft");
  });

  test("list rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.platformAnnouncements.list, {})).rejects.toThrow("Not authenticated");
  });

  test("list rejects non-admin user", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Regular", email: "regular@test.com" });
    });
    const asRegular = t.withIdentity({ email: "regular@test.com", subject: "user|regular" });
    await expect(asRegular.query(api.platformAnnouncements.list, {})).rejects.toThrow("Unauthorized");
  });
});
