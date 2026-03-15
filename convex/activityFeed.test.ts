import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

describe("activityFeed", () => {
  test("createItem inserts a feed item (internal)", async () => {
    const t = convexTest(schema);

    const { userId, tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      return { userId, tenantId };
    });

    const feedItemId = await t.mutation(internal.activityFeed.createItem, {
      type: "workout_logged", userId, tenantId, visibility: "gym",
    });

    const item = await t.run(async (ctx) => ctx.db.get(feedItemId));
    expect(item!.type).toBe("workout_logged");
    expect(item!.visibility).toBe("gym");
  });

  test("getFeed returns own and gym-visible items", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("activity_feed", {
        type: "pr_achieved", userId, tenantId,
        timestamp: Date.now(), visibility: "gym",
      });
      return { tenantId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    const result = await asAlice.query(api.activityFeed.getFeed, { tenantId });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe("pr_achieved");
  });

  test("hide deletes own feed item only", async () => {
    const t = convexTest(schema);

    const { tenantId, feedItemId, otherFeedItemId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const otherId = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const feedItemId = await ctx.db.insert("activity_feed", {
        type: "workout_logged", userId, tenantId,
        timestamp: Date.now(), visibility: "gym",
      });
      const otherFeedItemId = await ctx.db.insert("activity_feed", {
        type: "pr_achieved", userId: otherId, tenantId,
        timestamp: Date.now(), visibility: "gym",
      });
      return { tenantId, feedItemId, otherFeedItemId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    await asAlice.mutation(api.activityFeed.hide, { tenantId, feedItemId });

    const deleted = await t.run(async (ctx) => ctx.db.get(feedItemId));
    expect(deleted).toBeNull();

    await expect(
      asAlice.mutation(api.activityFeed.hide, { tenantId, feedItemId: otherFeedItemId })
    ).rejects.toThrow();
  });

  test("remove deletes own feed item", async () => {
    const t = convexTest(schema);

    const { tenantId, feedItemId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const feedItemId = await ctx.db.insert("activity_feed", {
        type: "milestone", userId, tenantId,
        timestamp: Date.now(), visibility: "friends",
      });
      return { tenantId, feedItemId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    await asAlice.mutation(api.activityFeed.remove, { tenantId, feedItemId });

    const deleted = await t.run(async (ctx) => ctx.db.get(feedItemId));
    expect(deleted).toBeNull();
  });
});
