import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("conversations", () => {
  test("create direct conversation includes creator as participant", async () => {
    const t = convexTest(schema);

    const { tenantId, user2Id } = await t.run(async (ctx) => {
      const user1Id = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const user2Id = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: user1Id, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId, user2Id };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    const convId = await asAlice.mutation(
      api.conversations.create,
      { tenantId, type: "direct", participantIds: [user2Id] },
    );

    const conv = await t.run(async (ctx) => ctx.db.get(convId));
    expect(conv!.type).toBe("direct");
    expect(conv!.participantIds).toHaveLength(2);
    expect(conv!.participantIds).toContain(user2Id);
  });

  test("listMine filters by participant", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const user1Id = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const user2Id = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const user3Id = await ctx.db.insert("users", { name: "Carol", email: "carol@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: user1Id, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      // Conversation with Alice
      await ctx.db.insert("conversations", {
        tenantId, type: "direct", participantIds: [user1Id, user2Id],
      });
      // Conversation without Alice
      await ctx.db.insert("conversations", {
        tenantId, type: "direct", participantIds: [user2Id, user3Id],
      });
      return { tenantId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    const mine = await asAlice.query(
      api.conversations.listMine,
      { tenantId },
    );

    expect(mine).toHaveLength(1);
  });

  test("addParticipant adds a user to the conversation", async () => {
    const t = convexTest(schema);

    const { tenantId, convId, user3Id } = await t.run(async (ctx) => {
      const user1Id = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const user2Id = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const user3Id = await ctx.db.insert("users", { name: "Carol", email: "carol@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: user1Id, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const convId = await ctx.db.insert("conversations", {
        tenantId, type: "group", participantIds: [user1Id, user2Id],
      });
      return { tenantId, convId, user3Id };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    await asAlice.mutation(
      api.conversations.addParticipant,
      { tenantId, conversationId: convId, userId: user3Id },
    );

    const conv = await t.run(async (ctx) => ctx.db.get(convId));
    expect(conv!.participantIds).toHaveLength(3);
    expect(conv!.participantIds).toContain(user3Id);
  });

  test("removeParticipant removes a user from the conversation", async () => {
    const t = convexTest(schema);

    const { tenantId, convId, user2Id } = await t.run(async (ctx) => {
      const user1Id = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const user2Id = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: user1Id, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const convId = await ctx.db.insert("conversations", {
        tenantId, type: "group", participantIds: [user1Id, user2Id],
      });
      return { tenantId, convId, user2Id };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    await asAlice.mutation(
      api.conversations.removeParticipant,
      { tenantId, conversationId: convId, userId: user2Id },
    );

    const conv = await t.run(async (ctx) => ctx.db.get(convId));
    expect(conv!.participantIds).not.toContain(user2Id);
  });

  test("getById rejects non-participant", async () => {
    const t = convexTest(schema);

    const { tenantId, convId } = await t.run(async (ctx) => {
      const user1Id = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const user2Id = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const outsiderId = await ctx.db.insert("users", { name: "Outsider", email: "outsider@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: outsiderId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const convId = await ctx.db.insert("conversations", {
        tenantId, type: "direct", participantIds: [user1Id, user2Id],
      });
      return { tenantId, convId };
    });

    const asOutsider = t.withIdentity({ email: "outsider@test.com", subject: "user|outsider" });

    await expect(
      asOutsider.query(
        api.conversations.getById,
        { tenantId, conversationId: convId },
      )
    ).rejects.toThrow("You are not a participant in this conversation");
  });
});
