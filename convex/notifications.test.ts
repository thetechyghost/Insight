import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

describe("notifications", () => {
  test("dispatch inserts a notification (internal)", async () => {
    const t = convexTest(schema);

    const { userId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      return { userId };
    });

    const notifId = await t.mutation(internal.notifications.dispatch, {
      userId, type: "in_app",
      payload: { title: "Welcome", body: "Welcome to the gym!" },
    });

    const notif = await t.run(async (ctx) => ctx.db.get(notifId));
    expect(notif!.type).toBe("in_app");
    expect(notif!.status).toBe("pending");
  });

  test("listMine returns in_app notifications for current user", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("notification_queue", {
        userId, type: "in_app", payload: { title: "Hi", body: "Hello" }, status: "pending",
      });
      await ctx.db.insert("notification_queue", {
        userId, type: "email", payload: { title: "Email", body: "Email body" }, status: "pending",
      });
      return { tenantId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    const notifs = await asAlice.query(api.notifications.listMine, { tenantId });
    expect(notifs).toHaveLength(1);
    expect(notifs[0].type).toBe("in_app");
  });

  test("markRead sets notification status to read", async () => {
    const t = convexTest(schema);

    const { tenantId, notifId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const notifId = await ctx.db.insert("notification_queue", {
        userId, type: "in_app", payload: { title: "Test", body: "Body" }, status: "pending",
      });
      return { tenantId, notifId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    await asAlice.mutation(api.notifications.markRead, { tenantId, notificationId: notifId });

    const notif = await t.run(async (ctx) => ctx.db.get(notifId));
    expect(notif!.status).toBe("read");
  });

  test("markAllRead marks all pending in_app notifications as read", async () => {
    const t = convexTest(schema);

    const { tenantId, notifId1, notifId2 } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const notifId1 = await ctx.db.insert("notification_queue", {
        userId, type: "in_app", payload: { title: "A", body: "A" }, status: "pending",
      });
      const notifId2 = await ctx.db.insert("notification_queue", {
        userId, type: "in_app", payload: { title: "B", body: "B" }, status: "pending",
      });
      return { tenantId, notifId1, notifId2 };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    await asAlice.mutation(api.notifications.markAllRead, { tenantId });

    const n1 = await t.run(async (ctx) => ctx.db.get(notifId1));
    const n2 = await t.run(async (ctx) => ctx.db.get(notifId2));
    expect(n1!.status).toBe("read");
    expect(n2!.status).toBe("read");
  });
});
