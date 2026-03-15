import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("messages", () => {
  test("send updates conversation.lastMessageTimestamp", async () => {
    const t = convexTest(schema);

    const { tenantId, convId } = await t.run(async (ctx) => {
      const user1Id = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const user2Id = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: user1Id, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const convId = await ctx.db.insert("conversations", {
        tenantId, type: "direct", participantIds: [user1Id, user2Id],
      });
      return { tenantId, convId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    await asAlice.mutation(
      api.messages.send,
      { tenantId, conversationId: convId, content: "Hello!" },
    );

    const conv = await t.run(async (ctx) => ctx.db.get(convId));
    expect(conv!.lastMessageTimestamp).toBeDefined();
    expect(conv!.lastMessageTimestamp).toBeGreaterThan(0);
  });

  test("listByConversation returns messages ordered desc", async () => {
    const t = convexTest(schema);

    const { tenantId, convId } = await t.run(async (ctx) => {
      const user1Id = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const user2Id = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: user1Id, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const convId = await ctx.db.insert("conversations", {
        tenantId, type: "direct", participantIds: [user1Id, user2Id],
      });
      return { tenantId, convId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    await asAlice.mutation(api.messages.send, { tenantId, conversationId: convId, content: "First" });
    await asAlice.mutation(api.messages.send, { tenantId, conversationId: convId, content: "Second" });

    const messages = await asAlice.query(
      api.messages.listByConversation,
      { tenantId, conversationId: convId },
    );

    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe("Second");
    expect(messages[1].content).toBe("First");
  });

  test("markRead sets read receipt for the user", async () => {
    const t = convexTest(schema);

    const { tenantId, convId } = await t.run(async (ctx) => {
      const user1Id = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const user2Id = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: user1Id, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const convId = await ctx.db.insert("conversations", {
        tenantId, type: "direct", participantIds: [user1Id, user2Id],
      });
      return { tenantId, convId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    const messageId = await asAlice.mutation(
      api.messages.send,
      { tenantId, conversationId: convId, content: "Read me" },
    );

    await asAlice.mutation(
      api.messages.markRead,
      { tenantId, messageId },
    );

    const msg = await t.run(async (ctx) => ctx.db.get(messageId));
    expect(msg!.readReceipts).toBeDefined();
  });

  test("search filters messages by content", async () => {
    const t = convexTest(schema);

    const { tenantId, convId } = await t.run(async (ctx) => {
      const user1Id = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const user2Id = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: user1Id, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const convId = await ctx.db.insert("conversations", {
        tenantId, type: "direct", participantIds: [user1Id, user2Id],
      });
      return { tenantId, convId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    await asAlice.mutation(api.messages.send, { tenantId, conversationId: convId, content: "Let us do squats tomorrow" });
    await asAlice.mutation(api.messages.send, { tenantId, conversationId: convId, content: "I prefer deadlifts" });
    await asAlice.mutation(api.messages.send, { tenantId, conversationId: convId, content: "Squats are great" });

    const results = await asAlice.query(
      api.messages.search,
      { tenantId, conversationId: convId, query: "squats" },
    );

    expect(results).toHaveLength(2);
  });

  test("send rejects non-participant", async () => {
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
      asOutsider.mutation(
        api.messages.send,
        { tenantId, conversationId: convId, content: "Intruder!" },
      )
    ).rejects.toThrow("You are not a participant in this conversation");
  });
});
