import { describe, test, expect, beforeAll } from "vitest";
import { ConvexHttpClient } from "convex/browser";
import { createAuthenticatedClient } from "../../clients/convex-client";
import { getAuthToken } from "../../clients/auth";
import { loadSeedContext } from "../../helpers/load-context";
import { expectToThrow, expectValidId } from "../../helpers/assertions";
import { api } from "../../../convex/_generated/api";
import type { SeedContext } from "../../seed/types";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * [FR-TG] Member Management
 *
 * Tests membership CRUD operations, role-based access to member data,
 * status management, and tenant isolation for the membership domain.
 */
describe("[FR-TG] Member Management", () => {
  let ctx: SeedContext;

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

  // ==========================================================================
  // getMyMembership — any authenticated member
  // ==========================================================================

  describe("getMyMembership", () => {
    test("athlete can retrieve their own membership", async () => {
      const client = await clientFor("dave");

      const membership = await client.query(api.memberships.getMyMembership, {
        tenantId: tenantId(),
      });

      expect(membership).toBeDefined();
      expect(membership.userId).toBe(ctx.users.dave.id);
      expect(membership.tenantId).toBe(ctx.tenants.cfAlpha.id);
      expect(membership.role).toBe("athlete");
      expect(membership.status).toBe("active");
    });

    test("owner can retrieve their own membership", async () => {
      const client = await clientFor("alice");

      const membership = await client.query(api.memberships.getMyMembership, {
        tenantId: tenantId(),
      });

      expect(membership.role).toBe("owner");
      expect(membership.status).toBe("active");
    });

    test("multi-gym user gets correct membership per tenant", async () => {
      const client = await clientFor("frank");

      const alphaMembership = await client.query(api.memberships.getMyMembership, {
        tenantId: tenantId(),
      });
      expect(alphaMembership.tenantId).toBe(ctx.tenants.cfAlpha.id);

      const betaMembership = await client.query(api.memberships.getMyMembership, {
        tenantId: betaTenantId(),
      });
      expect(betaMembership.tenantId).toBe(ctx.tenants.cfBeta.id);
    });

    test("unauthenticated user cannot retrieve membership", async () => {
      const { createTestClient } = await import("../../clients/convex-client");
      const client = createTestClient();

      await expectToThrow(() =>
        client.query(api.memberships.getMyMembership, {
          tenantId: tenantId(),
        })
      );
    });

    test("user cannot retrieve membership for tenant they don't belong to", async () => {
      // Dave is only in cf-alpha
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.query(api.memberships.getMyMembership, {
            tenantId: betaTenantId(),
          }),
        "not a member"
      );
    });
  });

  // ==========================================================================
  // listByTenant — coach+ required
  // ==========================================================================

  describe("listByTenant", () => {
    test("coach can list all tenant members", async () => {
      const client = await clientFor("bob");

      const members = await client.query(api.memberships.listByTenant, {
        tenantId: tenantId(),
      });

      expect(members.length).toBeGreaterThan(0);
      // All returned memberships belong to cf-alpha
      for (const m of members) {
        expect(m.tenantId).toBe(ctx.tenants.cfAlpha.id);
      }
    });

    test("admin can list all tenant members", async () => {
      const client = await clientFor("carol");

      const members = await client.query(api.memberships.listByTenant, {
        tenantId: tenantId(),
      });

      expect(members.length).toBeGreaterThan(0);
    });

    test("owner can list all tenant members", async () => {
      const client = await clientFor("alice");

      const members = await client.query(api.memberships.listByTenant, {
        tenantId: tenantId(),
      });

      expect(members.length).toBeGreaterThan(0);
    });

    test("athlete cannot list tenant members (coach+ required)", async () => {
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.query(api.memberships.listByTenant, {
            tenantId: tenantId(),
          }),
        "Insufficient role"
      );
    });

    test("list members filtered by active status", async () => {
      const client = await clientFor("alice");

      const activeMembers = await client.query(api.memberships.listByTenant, {
        tenantId: tenantId(),
        status: "active",
      });

      for (const m of activeMembers) {
        expect(m.status).toBe("active");
      }
    });

    test("member list includes user details (name, email)", async () => {
      const client = await clientFor("alice");

      const members = await client.query(api.memberships.listByTenant, {
        tenantId: tenantId(),
      });

      expect(members.length).toBeGreaterThan(0);
      for (const m of members) {
        expect(m.user).toBeDefined();
        expect(typeof m.user.name).toBe("string");
        expect(typeof m.user.email).toBe("string");
        expect(m.user.name.length).toBeGreaterThan(0);
      }
    });

    test("tenant isolation: cf-alpha members list excludes cf-beta-only users", async () => {
      const client = await clientFor("alice");

      const members = await client.query(api.memberships.listByTenant, {
        tenantId: tenantId(),
      });

      // Grace is only in cf-beta — should not appear in cf-alpha
      const emails = members.map((m: any) => m.user.email);
      expect(emails).not.toContain(ctx.users.grace.email);
    });
  });

  // ==========================================================================
  // getByUserId — coach+ required
  // ==========================================================================

  describe("getByUserId", () => {
    test("coach can look up a specific member by userId", async () => {
      const client = await clientFor("bob");

      const membership = await client.query(api.memberships.getByUserId, {
        tenantId: tenantId(),
        userId: ctx.users.dave.id as Id<"users">,
      });

      expect(membership).not.toBeNull();
      expect(membership!.role).toBe("athlete");
    });

    test("athlete cannot look up members by userId (coach+ required)", async () => {
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.query(api.memberships.getByUserId, {
            tenantId: tenantId(),
            userId: ctx.users.bob.id as Id<"users">,
          }),
        "Insufficient role"
      );
    });

    test("returns null for user not in this tenant", async () => {
      const client = await clientFor("alice");

      const membership = await client.query(api.memberships.getByUserId, {
        tenantId: tenantId(),
        userId: ctx.users.grace.id as Id<"users">,
      });

      expect(membership).toBeNull();
    });
  });

  // ==========================================================================
  // updateRole — owner+ required
  // ==========================================================================

  describe("updateRole", () => {
    test("owner can promote a member", async () => {
      const client = await clientFor("alice");
      const eveMembershipId = ctx.memberships["eve:cfAlpha"]?.id as Id<"memberships">;

      // Promote Eve from athlete to coach
      await client.mutation(api.memberships.updateRole, {
        tenantId: tenantId(),
        membershipId: eveMembershipId,
        role: "coach",
      });

      // Verify the role change
      const membership = await client.query(api.memberships.getByUserId, {
        tenantId: tenantId(),
        userId: ctx.users.eve.id as Id<"users">,
      });
      expect(membership!.role).toBe("coach");

      // Reset Eve back to athlete for other tests
      await client.mutation(api.memberships.updateRole, {
        tenantId: tenantId(),
        membershipId: eveMembershipId,
        role: "athlete",
      });
    });

    test("admin cannot update member roles (owner+ required)", async () => {
      const client = await clientFor("carol");
      const eveMembershipId = ctx.memberships["eve:cfAlpha"]?.id as Id<"memberships">;

      await expectToThrow(
        () =>
          client.mutation(api.memberships.updateRole, {
            tenantId: tenantId(),
            membershipId: eveMembershipId,
            role: "coach",
          }),
        "Insufficient role"
      );
    });

    test("coach cannot update member roles (owner+ required)", async () => {
      const client = await clientFor("bob");
      const eveMembershipId = ctx.memberships["eve:cfAlpha"]?.id as Id<"memberships">;

      await expectToThrow(
        () =>
          client.mutation(api.memberships.updateRole, {
            tenantId: tenantId(),
            membershipId: eveMembershipId,
            role: "admin",
          }),
        "Insufficient role"
      );
    });

    test("athlete cannot update member roles (owner+ required)", async () => {
      const client = await clientFor("dave");
      const eveMembershipId = ctx.memberships["eve:cfAlpha"]?.id as Id<"memberships">;

      await expectToThrow(
        () =>
          client.mutation(api.memberships.updateRole, {
            tenantId: tenantId(),
            membershipId: eveMembershipId,
            role: "coach",
          }),
        "Insufficient role"
      );
    });

    test("owner cannot change their own role", async () => {
      const client = await clientFor("alice");
      const aliceMembershipId = ctx.memberships["alice:cfAlpha"]?.id as Id<"memberships">;

      await expectToThrow(
        () =>
          client.mutation(api.memberships.updateRole, {
            tenantId: tenantId(),
            membershipId: aliceMembershipId,
            role: "admin",
          }),
        "cannot change your own role"
      );
    });

    test("owner cannot promote beyond their own role level", async () => {
      // Owner cannot assign super_admin (if it existed above owner)
      // But owner is the highest tenant-level role, so this test verifies
      // a role cannot be set higher than the caller's role. Since owner
      // is the max, we test that admin can't promote to owner.
      const client = await clientFor("carol"); // admin
      const eveMembershipId = ctx.memberships["eve:cfAlpha"]?.id as Id<"memberships">;

      await expectToThrow(
        () =>
          client.mutation(api.memberships.updateRole, {
            tenantId: tenantId(),
            membershipId: eveMembershipId,
            role: "owner",
          }),
        "Insufficient role"
      );
    });

    test("tenant isolation: cannot update membership in another tenant", async () => {
      // Alice is owner of cf-alpha but not a member of cf-beta
      const client = await clientFor("alice");
      const graceMembershipId = ctx.memberships["grace:cfBeta"]?.id as Id<"memberships">;

      await expectToThrow(
        () =>
          client.mutation(api.memberships.updateRole, {
            tenantId: betaTenantId(),
            membershipId: graceMembershipId,
            role: "admin",
          }),
        "not a member"
      );
    });
  });

  // ==========================================================================
  // updateStatus — admin+ required
  // ==========================================================================

  describe("updateStatus", () => {
    test("admin can freeze a member", async () => {
      const client = await clientFor("carol");
      const eveMembershipId = ctx.memberships["eve:cfAlpha"]?.id as Id<"memberships">;

      await client.mutation(api.memberships.updateStatus, {
        tenantId: tenantId(),
        membershipId: eveMembershipId,
        status: "frozen",
      });

      // Verify
      const ownerClient = await clientFor("alice");
      const membership = await ownerClient.query(api.memberships.getByUserId, {
        tenantId: tenantId(),
        userId: ctx.users.eve.id as Id<"users">,
      });
      expect(membership!.status).toBe("frozen");

      // Reset back to active
      await client.mutation(api.memberships.updateStatus, {
        tenantId: tenantId(),
        membershipId: eveMembershipId,
        status: "active",
      });
    });

    test("owner can update member status", async () => {
      const client = await clientFor("alice");
      const eveMembershipId = ctx.memberships["eve:cfAlpha"]?.id as Id<"memberships">;

      await client.mutation(api.memberships.updateStatus, {
        tenantId: tenantId(),
        membershipId: eveMembershipId,
        status: "frozen",
      });

      const membership = await client.query(api.memberships.getByUserId, {
        tenantId: tenantId(),
        userId: ctx.users.eve.id as Id<"users">,
      });
      expect(membership!.status).toBe("frozen");

      // Reset
      await client.mutation(api.memberships.updateStatus, {
        tenantId: tenantId(),
        membershipId: eveMembershipId,
        status: "active",
      });
    });

    test("coach cannot update member status (admin+ required)", async () => {
      const client = await clientFor("bob");
      const eveMembershipId = ctx.memberships["eve:cfAlpha"]?.id as Id<"memberships">;

      await expectToThrow(
        () =>
          client.mutation(api.memberships.updateStatus, {
            tenantId: tenantId(),
            membershipId: eveMembershipId,
            status: "frozen",
          }),
        "Insufficient role"
      );
    });

    test("athlete cannot update member status (admin+ required)", async () => {
      const client = await clientFor("dave");
      const eveMembershipId = ctx.memberships["eve:cfAlpha"]?.id as Id<"memberships">;

      await expectToThrow(
        () =>
          client.mutation(api.memberships.updateStatus, {
            tenantId: tenantId(),
            membershipId: eveMembershipId,
            status: "frozen",
          }),
        "Insufficient role"
      );
    });

    test("cannot change an owner's status", async () => {
      const client = await clientFor("carol"); // admin
      const aliceMembershipId = ctx.memberships["alice:cfAlpha"]?.id as Id<"memberships">;

      await expectToThrow(
        () =>
          client.mutation(api.memberships.updateStatus, {
            tenantId: tenantId(),
            membershipId: aliceMembershipId,
            status: "frozen",
          }),
        "Cannot change an owner's status"
      );
    });
  });

  // ==========================================================================
  // leave — any member (except owner)
  // ==========================================================================

  describe("leave", () => {
    test("owner cannot leave (must transfer ownership first)", async () => {
      const client = await clientFor("alice");

      await expectToThrow(
        () =>
          client.mutation(api.memberships.leave, {
            tenantId: tenantId(),
          }),
        "Owners cannot leave"
      );
    });
  });

  // ==========================================================================
  // setPrimaryGym — authedMutation
  // ==========================================================================

  describe("setPrimaryGym", () => {
    test("multi-gym user can switch primary gym", async () => {
      const client = await clientFor("frank");

      // Frank is in both gyms; switch primary to cf-beta
      await client.mutation(api.memberships.setPrimaryGym, {
        tenantId: betaTenantId(),
      });

      // Verify cf-beta is now primary
      const betaMembership = await client.query(api.memberships.getMyMembership, {
        tenantId: betaTenantId(),
      });
      expect(betaMembership.isPrimaryGym).toBe(true);

      // cf-alpha should no longer be primary
      const alphaMembership = await client.query(api.memberships.getMyMembership, {
        tenantId: tenantId(),
      });
      expect(alphaMembership.isPrimaryGym).toBe(false);

      // Reset primary back to cf-alpha
      await client.mutation(api.memberships.setPrimaryGym, {
        tenantId: tenantId(),
      });
    });

    test("cannot set primary gym for a tenant you don't belong to", async () => {
      const client = await clientFor("dave"); // only in cf-alpha

      await expectToThrow(
        () =>
          client.mutation(api.memberships.setPrimaryGym, {
            tenantId: betaTenantId(),
          }),
        "not a member"
      );
    });
  });
});
