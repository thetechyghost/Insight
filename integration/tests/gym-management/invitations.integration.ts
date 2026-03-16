import { describe, test, expect, beforeAll } from "vitest";
import { ConvexHttpClient } from "convex/browser";
import { createAuthenticatedClient, createTestClient } from "../../clients/convex-client";
import { getAuthToken } from "../../clients/auth";
import { loadSeedContext } from "../../helpers/load-context";
import { expectToThrow, expectValidId } from "../../helpers/assertions";
import { api } from "../../../convex/_generated/api";
import type { SeedContext } from "../../seed/types";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * [FR-TG] Invitation Flow
 *
 * Tests the complete invitation lifecycle: create, list, lookup by token,
 * accept, and revoke. Covers RBAC enforcement (admin+ for create/list/revoke),
 * duplicate prevention, and tenant isolation.
 */
describe("[FR-TG] Invitation Flow", () => {
  let ctx: SeedContext;
  let createdInvitationId: Id<"invitations"> | null = null;
  let createdInvitationToken: string | null = null;

  beforeAll(() => {
    ctx = loadSeedContext();
  });

  // Helper to get an authenticated client for a user
  async function clientFor(userKey: string): Promise<ConvexHttpClient> {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  const tenantId = () => ctx.tenants.cfAlpha.id as Id<"tenants">;
  const betaTenantId = () => ctx.tenants.cfBeta.id as Id<"tenants">;

  // Use a unique email per test run to avoid collisions
  const inviteEmail = () => `invite-${ctx.prefix}@test.insight.app`;
  const inviteEmail2 = () => `invite2-${ctx.prefix}@test.insight.app`;
  const inviteEmailRevoke = () => `invite-revoke-${ctx.prefix}@test.insight.app`;

  // ==========================================================================
  // create — admin+ required
  // ==========================================================================

  describe("create", () => {
    test("admin can create an invitation", async () => {
      const client = await clientFor("carol");

      const invitationId = await client.mutation(api.invitations.create, {
        tenantId: tenantId(),
        email: inviteEmail(),
        role: "athlete",
      });

      expectValidId(invitationId);
      createdInvitationId = invitationId as Id<"invitations">;
    });

    test("owner can create an invitation", async () => {
      const client = await clientFor("alice");

      const invitationId = await client.mutation(api.invitations.create, {
        tenantId: tenantId(),
        email: inviteEmail2(),
        role: "coach",
      });

      expectValidId(invitationId);
    });

    test("coach cannot create invitations (admin+ required)", async () => {
      const client = await clientFor("bob");

      await expectToThrow(
        () =>
          client.mutation(api.invitations.create, {
            tenantId: tenantId(),
            email: "coach-invite@test.insight.app",
            role: "athlete",
          }),
        "Insufficient role"
      );
    });

    test("athlete cannot create invitations (admin+ required)", async () => {
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.mutation(api.invitations.create, {
            tenantId: tenantId(),
            email: "athlete-invite@test.insight.app",
            role: "athlete",
          }),
        "Insufficient role"
      );
    });

    test("cannot create duplicate pending invitation for same email + tenant", async () => {
      const client = await clientFor("carol");

      await expectToThrow(
        () =>
          client.mutation(api.invitations.create, {
            tenantId: tenantId(),
            email: inviteEmail(),
            role: "athlete",
          }),
        "pending invitation already exists"
      );
    });

    test("unauthenticated user cannot create invitations", async () => {
      const client = createTestClient();

      await expectToThrow(() =>
        client.mutation(api.invitations.create, {
          tenantId: tenantId(),
          email: "unauth@test.insight.app",
          role: "athlete",
        })
      );
    });
  });

  // ==========================================================================
  // listByTenant — admin+ required
  // ==========================================================================

  describe("listByTenant", () => {
    test("admin can list invitations for the tenant", async () => {
      const client = await clientFor("carol");

      const invitations = await client.query(api.invitations.listByTenant, {
        tenantId: tenantId(),
      });

      expect(Array.isArray(invitations)).toBe(true);
      expect(invitations.length).toBeGreaterThan(0);

      // All invitations should belong to this tenant
      for (const inv of invitations) {
        expect(inv.tenantId).toBe(ctx.tenants.cfAlpha.id);
      }
    });

    test("owner can list invitations for the tenant", async () => {
      const client = await clientFor("alice");

      const invitations = await client.query(api.invitations.listByTenant, {
        tenantId: tenantId(),
      });

      expect(Array.isArray(invitations)).toBe(true);
    });

    test("can filter invitations by status", async () => {
      const client = await clientFor("carol");

      const pendingInvitations = await client.query(api.invitations.listByTenant, {
        tenantId: tenantId(),
        status: "pending",
      });

      for (const inv of pendingInvitations) {
        expect(inv.status).toBe("pending");
      }
    });

    test("coach cannot list invitations (admin+ required)", async () => {
      const client = await clientFor("bob");

      await expectToThrow(
        () =>
          client.query(api.invitations.listByTenant, {
            tenantId: tenantId(),
          }),
        "Insufficient role"
      );
    });

    test("athlete cannot list invitations (admin+ required)", async () => {
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.query(api.invitations.listByTenant, {
            tenantId: tenantId(),
          }),
        "Insufficient role"
      );
    });

    test("tenant isolation: cannot list invitations for another tenant", async () => {
      // Alice is owner of cf-alpha but not a member of cf-beta
      const client = await clientFor("alice");

      await expectToThrow(
        () =>
          client.query(api.invitations.listByTenant, {
            tenantId: betaTenantId(),
          }),
        "not a member"
      );
    });
  });

  // ==========================================================================
  // getByToken — public query (no auth required)
  // ==========================================================================

  describe("getByToken", () => {
    test("can look up invitation by token (public query)", async () => {
      // First, get the token from the created invitation
      const client = await clientFor("carol");
      const invitations = await client.query(api.invitations.listByTenant, {
        tenantId: tenantId(),
        status: "pending",
      });

      const matchingInvitation = invitations.find(
        (inv: any) => inv.email === inviteEmail()
      );
      expect(matchingInvitation).toBeDefined();
      createdInvitationToken = matchingInvitation!.token;

      // Public lookup by token — no auth needed
      const unauthClient = createTestClient();
      const invitation = await unauthClient.query(api.invitations.getByToken, {
        token: createdInvitationToken!,
      });

      expect(invitation).not.toBeNull();
      expect(invitation!.email).toBe(inviteEmail());
      expect(invitation!.status).toBe("pending");
      expect(invitation!.tenantId).toBe(ctx.tenants.cfAlpha.id);
    });

    test("returns null for non-existent token", async () => {
      const unauthClient = createTestClient();

      const invitation = await unauthClient.query(api.invitations.getByToken, {
        token: "non-existent-token-xyz-123",
      });

      expect(invitation).toBeNull();
    });
  });

  // ==========================================================================
  // revoke — admin+ required
  // ==========================================================================

  describe("revoke", () => {
    let revokeInvitationId: Id<"invitations"> | null = null;

    test("setup: create an invitation to revoke", async () => {
      const client = await clientFor("carol");

      revokeInvitationId = (await client.mutation(api.invitations.create, {
        tenantId: tenantId(),
        email: inviteEmailRevoke(),
        role: "athlete",
      })) as Id<"invitations">;

      expectValidId(revokeInvitationId);
    });

    test("coach cannot revoke invitations (admin+ required)", async () => {
      if (!revokeInvitationId) return;

      const client = await clientFor("bob");

      await expectToThrow(
        () =>
          client.mutation(api.invitations.revoke, {
            tenantId: tenantId(),
            invitationId: revokeInvitationId!,
          }),
        "Insufficient role"
      );
    });

    test("athlete cannot revoke invitations (admin+ required)", async () => {
      if (!revokeInvitationId) return;

      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.mutation(api.invitations.revoke, {
            tenantId: tenantId(),
            invitationId: revokeInvitationId!,
          }),
        "Insufficient role"
      );
    });

    test("admin can revoke a pending invitation", async () => {
      if (!revokeInvitationId) return;

      const client = await clientFor("carol");

      await client.mutation(api.invitations.revoke, {
        tenantId: tenantId(),
        invitationId: revokeInvitationId,
      });

      // Verify the invitation is now revoked
      const invitations = await client.query(api.invitations.listByTenant, {
        tenantId: tenantId(),
      });

      const revoked = invitations.find(
        (inv: any) => inv._id === revokeInvitationId
      );
      expect(revoked).toBeDefined();
      expect(revoked!.status).toBe("revoked");
    });

    test("cannot revoke an already-revoked invitation", async () => {
      if (!revokeInvitationId) return;

      const client = await clientFor("carol");

      await expectToThrow(
        () =>
          client.mutation(api.invitations.revoke, {
            tenantId: tenantId(),
            invitationId: revokeInvitationId!,
          }),
        "Only pending invitations can be revoked"
      );
    });

    test("tenant isolation: cannot revoke invitation from another tenant", async () => {
      // Grace (cf-beta owner) creates an invitation in cf-beta
      const graceClient = await clientFor("grace");
      const betaInvitationId = (await graceClient.mutation(api.invitations.create, {
        tenantId: betaTenantId(),
        email: `beta-revoke-${ctx.prefix}@test.insight.app`,
        role: "athlete",
      })) as Id<"invitations">;

      // Carol (cf-alpha admin) tries to revoke cf-beta's invitation
      const carolClient = await clientFor("carol");

      await expectToThrow(
        () =>
          carolClient.mutation(api.invitations.revoke, {
            tenantId: tenantId(),
            invitationId: betaInvitationId,
          }),
        "does not belong to this tenant"
      );
    });
  });

  // ==========================================================================
  // accept — authedMutation (any authenticated user with token)
  // ==========================================================================

  describe("accept", () => {
    test("cannot accept with a revoked invitation token", async () => {
      // Get a revoked invitation's token
      const adminClient = await clientFor("carol");
      const invitations = await adminClient.query(api.invitations.listByTenant, {
        tenantId: tenantId(),
      });

      const revokedInvitation = invitations.find(
        (inv: any) => inv.status === "revoked"
      );

      if (revokedInvitation) {
        // Any authenticated user tries to accept the revoked token
        const client = await clientFor("eve");

        await expectToThrow(
          () =>
            client.mutation(api.invitations.accept, {
              token: revokedInvitation.token,
            }),
          "revoked"
        );
      }
    });

    test("cannot accept with a non-existent token", async () => {
      const client = await clientFor("eve");

      await expectToThrow(
        () =>
          client.mutation(api.invitations.accept, {
            token: "totally-fake-token-that-does-not-exist",
          }),
        "not found"
      );
    });

    test("unauthenticated user cannot accept an invitation", async () => {
      if (!createdInvitationToken) return;

      const client = createTestClient();

      await expectToThrow(() =>
        client.mutation(api.invitations.accept, {
          token: createdInvitationToken!,
        })
      );
    });
  });
});
