import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("follows", () => {
  test("request creates a pending follow", async () => {
    const t = convexTest(schema);

    const { tenantId, followeeId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const followeeId = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId, followeeId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    const followId = await asAlice.mutation(api.follows.request, { tenantId, followeeId });

    const follow = await t.run(async (ctx) => ctx.db.get(followId));
    expect(follow!.status).toBe("pending");
    expect(follow!.followedId).toEqual(followeeId);
  });

  test("accept changes status to accepted (followee only)", async () => {
    const t = convexTest(schema);

    const { tenantId, followId } = await t.run(async (ctx) => {
      const aliceId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const bobId = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: bobId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const followId = await ctx.db.insert("follows", {
        followerId: aliceId, followedId: bobId, tenantId, status: "pending",
      });
      return { tenantId, followId };
    });

    const asBob = t.withIdentity({ email: "bob@test.com", subject: "user|bob" });
    await asBob.mutation(api.follows.accept, { tenantId, followId });

    const follow = await t.run(async (ctx) => ctx.db.get(followId));
    expect(follow!.status).toBe("accepted");
  });

  test("listFollowing returns only accepted follows", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const aliceId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const bobId = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const carolId = await ctx.db.insert("users", { name: "Carol", email: "carol@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: aliceId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("follows", {
        followerId: aliceId, followedId: bobId, tenantId, status: "accepted",
      });
      await ctx.db.insert("follows", {
        followerId: aliceId, followedId: carolId, tenantId, status: "pending",
      });
      return { tenantId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    const following = await asAlice.query(api.follows.listFollowing, { tenantId });
    expect(following).toHaveLength(1);
    expect(following[0].status).toBe("accepted");
  });

  test("remove deletes the follow relationship", async () => {
    const t = convexTest(schema);

    const { tenantId, followId } = await t.run(async (ctx) => {
      const aliceId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const bobId = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: aliceId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const followId = await ctx.db.insert("follows", {
        followerId: aliceId, followedId: bobId, tenantId, status: "accepted",
      });
      return { tenantId, followId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    await asAlice.mutation(api.follows.remove, { tenantId, followId });

    const deleted = await t.run(async (ctx) => ctx.db.get(followId));
    expect(deleted).toBeNull();
  });
});
