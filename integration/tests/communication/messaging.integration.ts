import { describe, test, expect, beforeAll } from "vitest";
import { ConvexHttpClient } from "convex/browser";
import { createTestClient, createAuthenticatedClient } from "../../clients/convex-client";
import { getAuthToken } from "../../clients/auth";
import { loadSeedContext } from "../../helpers/load-context";
import { expectToThrow, expectValidId } from "../../helpers/assertions";
import { api } from "../../../convex/_generated/api";
import type { SeedContext } from "../../seed/types";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * [FR-CM] Messaging (Conversations + Messages)
 *
 * Tests the messaging subsystem:
 * - Conversation CRUD: create, listMine, getById, addParticipant, removeParticipant
 * - Message flow: send, listByConversation, markRead, search
 * - Participant enforcement: non-participants cannot read/send
 * - Tenant isolation on all operations
 * - Auth enforcement on all endpoints
 */
describe("[FR-CM] Messaging", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  let sharedConversationId: Id<"conversations"> | null = null;
  let sharedMessageId: Id<"messages"> | null = null;

  beforeAll(() => {
    ctx = loadSeedContext();
    unauthenticatedClient = createTestClient();
  });

  async function clientFor(userKey: string) {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  const tenantId = () => ctx.tenants.cfAlpha.id as Id<"tenants">;
  const betaTenantId = () => ctx.tenants.cfBeta.id as Id<"tenants">;

  // ==========================================================================
  // Conversations
  // ==========================================================================

  describe("Conversations", () => {
    // ---- Auth enforcement ----

    test("listMine rejects unauthenticated requests", async () => {
      await expectToThrow(
        () =>
          unauthenticatedClient.query(api.conversations.listMine, {
            tenantId: tenantId(),
          }),
        "Not authenticated"
      );
    });

    test("create rejects unauthenticated requests", async () => {
      await expectToThrow(
        () =>
          unauthenticatedClient.mutation(api.conversations.create, {
            tenantId: tenantId(),
            type: "direct",
            participantIds: [],
          }),
        "Not authenticated"
      );
    });

    test("getById rejects unauthenticated requests", async () => {
      await expectToThrow(
        () =>
          unauthenticatedClient.query(api.conversations.getById, {
            tenantId: tenantId(),
            conversationId: "placeholder" as Id<"conversations">,
          }),
        "Not authenticated"
      );
    });

    // ---- CRUD happy path ----

    test("user can create a direct conversation", async () => {
      const client = await clientFor("alice");

      sharedConversationId = await client.mutation(api.conversations.create, {
        tenantId: tenantId(),
        type: "direct",
        participantIds: [
          ctx.users.alice.id as Id<"users">,
          ctx.users.bob.id as Id<"users">,
        ],
      });

      expectValidId(sharedConversationId);
    });

    test("user can create a group conversation", async () => {
      const client = await clientFor("alice");

      const convId = await client.mutation(api.conversations.create, {
        tenantId: tenantId(),
        type: "group",
        participantIds: [
          ctx.users.alice.id as Id<"users">,
          ctx.users.bob.id as Id<"users">,
          ctx.users.dave.id as Id<"users">,
        ],
        name: "Team Chat",
      });

      expectValidId(convId);
    });

    test("creator is automatically added as participant if not in list", async () => {
      const client = await clientFor("alice");

      // Create conversation with only Bob, Alice should be auto-added
      const convId = await client.mutation(api.conversations.create, {
        tenantId: tenantId(),
        type: "direct",
        participantIds: [ctx.users.bob.id as Id<"users">],
      });

      const conv = await client.query(api.conversations.getById, {
        tenantId: tenantId(),
        conversationId: convId,
      });

      expect(conv.participantIds).toContain(ctx.users.alice.id);
      expect(conv.participantIds).toContain(ctx.users.bob.id);
    });

    test("listMine returns conversations the user participates in", async () => {
      const client = await clientFor("alice");

      const conversations = await client.query(api.conversations.listMine, {
        tenantId: tenantId(),
      });

      expect(conversations.length).toBeGreaterThan(0);
      for (const conv of conversations) {
        expect(conv.tenantId).toBe(tenantId());
        expect(conv.participantIds).toContain(ctx.users.alice.id);
      }
    });

    test("getById returns conversation details", async () => {
      if (!sharedConversationId) return;

      const client = await clientFor("alice");

      const conv = await client.query(api.conversations.getById, {
        tenantId: tenantId(),
        conversationId: sharedConversationId,
      });

      expect(conv._id).toBe(sharedConversationId);
      expect(conv.type).toBe("direct");
      expect(conv.tenantId).toBe(tenantId());
    });

    // ---- Participant enforcement ----

    test("non-participant cannot view a conversation", async () => {
      if (!sharedConversationId) return;

      // Eve is not in the alice-bob conversation
      const client = await clientFor("eve");

      await expectToThrow(
        () =>
          client.query(api.conversations.getById, {
            tenantId: tenantId(),
            conversationId: sharedConversationId!,
          }),
        "not a participant"
      );
    });

    // ---- Add/remove participants ----

    test("participant can add a new user to the conversation", async () => {
      if (!sharedConversationId) return;

      const client = await clientFor("alice");

      await client.mutation(api.conversations.addParticipant, {
        tenantId: tenantId(),
        conversationId: sharedConversationId,
        userId: ctx.users.dave.id as Id<"users">,
      });

      const conv = await client.query(api.conversations.getById, {
        tenantId: tenantId(),
        conversationId: sharedConversationId,
      });

      expect(conv.participantIds).toContain(ctx.users.dave.id);
    });

    test("adding an already-existing participant is a no-op", async () => {
      if (!sharedConversationId) return;

      const client = await clientFor("alice");

      // Adding Bob again should not throw
      await client.mutation(api.conversations.addParticipant, {
        tenantId: tenantId(),
        conversationId: sharedConversationId,
        userId: ctx.users.bob.id as Id<"users">,
      });

      const conv = await client.query(api.conversations.getById, {
        tenantId: tenantId(),
        conversationId: sharedConversationId,
      });

      // Bob should appear exactly once
      const bobCount = conv.participantIds.filter(
        (id: string) => id === ctx.users.bob.id
      ).length;
      expect(bobCount).toBe(1);
    });

    test("non-participant cannot add a user to a conversation", async () => {
      if (!sharedConversationId) return;

      const client = await clientFor("eve");

      await expectToThrow(
        () =>
          client.mutation(api.conversations.addParticipant, {
            tenantId: tenantId(),
            conversationId: sharedConversationId!,
            userId: ctx.users.eve.id as Id<"users">,
          }),
        "not a participant"
      );
    });

    test("participant can remove a user from the conversation", async () => {
      // Create a fresh conversation for this test
      const aliceClient = await clientFor("alice");
      const convId = await aliceClient.mutation(api.conversations.create, {
        tenantId: tenantId(),
        type: "group",
        participantIds: [
          ctx.users.alice.id as Id<"users">,
          ctx.users.bob.id as Id<"users">,
          ctx.users.eve.id as Id<"users">,
        ],
        name: "Remove Test",
      });

      await aliceClient.mutation(api.conversations.removeParticipant, {
        tenantId: tenantId(),
        conversationId: convId,
        userId: ctx.users.eve.id as Id<"users">,
      });

      const conv = await aliceClient.query(api.conversations.getById, {
        tenantId: tenantId(),
        conversationId: convId,
      });

      expect(conv.participantIds).not.toContain(ctx.users.eve.id);
    });

    test("non-participant cannot remove a user from a conversation", async () => {
      if (!sharedConversationId) return;

      const client = await clientFor("eve");

      await expectToThrow(
        () =>
          client.mutation(api.conversations.removeParticipant, {
            tenantId: tenantId(),
            conversationId: sharedConversationId!,
            userId: ctx.users.bob.id as Id<"users">,
          }),
        "not a participant"
      );
    });

    // ---- Tenant isolation ----

    test("user cannot list conversations from tenant they don't belong to", async () => {
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.query(api.conversations.listMine, {
            tenantId: betaTenantId(),
          }),
        "not a member"
      );
    });

    test("user cannot create a conversation in another tenant", async () => {
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.mutation(api.conversations.create, {
            tenantId: betaTenantId(),
            type: "direct",
            participantIds: [ctx.users.dave.id as Id<"users">],
          }),
        "not a member"
      );
    });
  });

  // ==========================================================================
  // Messages
  // ==========================================================================

  describe("Messages", () => {
    // ---- Auth enforcement ----

    test("send rejects unauthenticated requests", async () => {
      await expectToThrow(
        () =>
          unauthenticatedClient.mutation(api.messages.send, {
            tenantId: tenantId(),
            conversationId: "placeholder" as Id<"conversations">,
            content: "Hello",
          }),
        "Not authenticated"
      );
    });

    test("listByConversation rejects unauthenticated requests", async () => {
      await expectToThrow(
        () =>
          unauthenticatedClient.query(api.messages.listByConversation, {
            tenantId: tenantId(),
            conversationId: "placeholder" as Id<"conversations">,
          }),
        "Not authenticated"
      );
    });

    test("markRead rejects unauthenticated requests", async () => {
      await expectToThrow(
        () =>
          unauthenticatedClient.mutation(api.messages.markRead, {
            tenantId: tenantId(),
            messageId: "placeholder" as Id<"messages">,
          }),
        "Not authenticated"
      );
    });

    // ---- Send + list happy path ----

    test("participant can send a message", async () => {
      if (!sharedConversationId) return;

      const client = await clientFor("alice");

      sharedMessageId = await client.mutation(api.messages.send, {
        tenantId: tenantId(),
        conversationId: sharedConversationId,
        content: "Hello team! Integration test message.",
      });

      expectValidId(sharedMessageId);
    });

    test("participant can list messages in a conversation", async () => {
      if (!sharedConversationId) return;

      const client = await clientFor("alice");

      const messages = await client.query(api.messages.listByConversation, {
        tenantId: tenantId(),
        conversationId: sharedConversationId,
      });

      expect(messages.length).toBeGreaterThan(0);
      const firstMsg = messages.find((m) => m._id === sharedMessageId);
      expect(firstMsg).toBeDefined();
      expect(firstMsg!.content).toBe("Hello team! Integration test message.");
      expect(firstMsg!.senderId).toBe(ctx.users.alice.id);
    });

    test("sending a message updates conversation lastMessageTimestamp", async () => {
      if (!sharedConversationId) return;

      const aliceClient = await clientFor("alice");

      // Get timestamp before sending
      const convBefore = await aliceClient.query(api.conversations.getById, {
        tenantId: tenantId(),
        conversationId: sharedConversationId,
      });

      // Send new message as bob
      const bobClient = await clientFor("bob");
      await bobClient.mutation(api.messages.send, {
        tenantId: tenantId(),
        conversationId: sharedConversationId,
        content: "Reply from Bob",
      });

      const convAfter = await aliceClient.query(api.conversations.getById, {
        tenantId: tenantId(),
        conversationId: sharedConversationId,
      });

      expect(convAfter.lastMessageTimestamp).toBeGreaterThanOrEqual(
        convBefore.lastMessageTimestamp ?? 0
      );
    });

    // ---- Mark read ----

    test("participant can mark a message as read", async () => {
      if (!sharedMessageId) return;

      const client = await clientFor("bob");

      await client.mutation(api.messages.markRead, {
        tenantId: tenantId(),
        messageId: sharedMessageId,
      });

      // Marking again should be idempotent (no error)
      await client.mutation(api.messages.markRead, {
        tenantId: tenantId(),
        messageId: sharedMessageId,
      });
    });

    // ---- Search ----

    test("participant can search messages in a conversation", async () => {
      if (!sharedConversationId) return;

      const client = await clientFor("alice");

      const results = await client.query(api.messages.search, {
        tenantId: tenantId(),
        conversationId: sharedConversationId,
        query: "Integration test",
      });

      expect(results.length).toBeGreaterThan(0);
      for (const msg of results) {
        expect(msg.content.toLowerCase()).toContain("integration test");
      }
    });

    test("search returns empty for non-matching query", async () => {
      if (!sharedConversationId) return;

      const client = await clientFor("alice");

      const results = await client.query(api.messages.search, {
        tenantId: tenantId(),
        conversationId: sharedConversationId,
        query: "xyzzy_nonexistent_term_12345",
      });

      expect(results).toHaveLength(0);
    });

    // ---- Participant enforcement ----

    test("non-participant cannot send a message", async () => {
      if (!sharedConversationId) return;

      const client = await clientFor("eve");

      await expectToThrow(
        () =>
          client.mutation(api.messages.send, {
            tenantId: tenantId(),
            conversationId: sharedConversationId!,
            content: "Sneaky message",
          }),
        "not a participant"
      );
    });

    test("non-participant cannot list messages", async () => {
      if (!sharedConversationId) return;

      const client = await clientFor("eve");

      await expectToThrow(
        () =>
          client.query(api.messages.listByConversation, {
            tenantId: tenantId(),
            conversationId: sharedConversationId!,
          }),
        "not a participant"
      );
    });

    test("non-participant cannot search messages", async () => {
      if (!sharedConversationId) return;

      const client = await clientFor("eve");

      await expectToThrow(
        () =>
          client.query(api.messages.search, {
            tenantId: tenantId(),
            conversationId: sharedConversationId!,
            query: "hello",
          }),
        "not a participant"
      );
    });

    // ---- Tenant isolation ----

    test("user cannot send messages in another tenant's conversation", async () => {
      // Create a conversation in cf-beta
      const graceClient = await clientFor("grace");
      const betaConvId = await graceClient.mutation(api.conversations.create, {
        tenantId: betaTenantId(),
        type: "direct",
        participantIds: [ctx.users.grace.id as Id<"users">],
      });

      const daveClient = await clientFor("dave");
      await expectToThrow(
        () =>
          daveClient.mutation(api.messages.send, {
            tenantId: betaTenantId(),
            conversationId: betaConvId,
            content: "Cross-tenant message",
          }),
        "not a member"
      );
    });
  });
});
