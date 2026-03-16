import { describe, test, expect, beforeAll } from "vitest";
import { createAuthenticatedClient } from "../../clients/convex-client";
import { getAuthToken } from "../../clients/auth";
import { loadSeedContext } from "../../helpers/load-context";
import { expectToThrow } from "../../helpers/assertions";
import { api } from "../../../convex/_generated/api";
import type { SeedContext } from "../../seed/types";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * [FR-CS, FR-PA] Role-Based Access Control
 *
 * Tests the role hierarchy (athlete < coach < admin < owner) and
 * that operations are properly gated by minimum role requirements.
 */
describe("[FR-CS, FR-PA] Role-Based Access Control", () => {
  let ctx: SeedContext;

  beforeAll(() => {
    ctx = loadSeedContext();
  });

  // Helper to get an authenticated client for a user
  async function clientFor(userKey: string) {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  const tenantId = () => ctx.tenants.cfAlpha.id as Id<"tenants">;

  // ---- Membership listing (coach+) ----

  test("athlete cannot list tenant members (coach+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () => client.query(api.memberships.listByTenant, { tenantId: tenantId() }),
      "Insufficient role"
    );
  });

  test("coach can list tenant members", async () => {
    const client = await clientFor("bob");

    const members = await client.query(api.memberships.listByTenant, {
      tenantId: tenantId(),
    });

    expect(members.length).toBeGreaterThan(0);
  });

  test("admin can list tenant members", async () => {
    const client = await clientFor("carol");

    const members = await client.query(api.memberships.listByTenant, {
      tenantId: tenantId(),
    });

    expect(members.length).toBeGreaterThan(0);
  });

  test("owner can list tenant members", async () => {
    const client = await clientFor("alice");

    const members = await client.query(api.memberships.listByTenant, {
      tenantId: tenantId(),
    });

    expect(members.length).toBeGreaterThan(0);
  });

  // ---- Role management (owner+) ----

  test("athlete cannot view role permissions (owner+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () => client.query(api.rolesPermissions.getForTenant, { tenantId: tenantId() }),
      "Insufficient role"
    );
  });

  test("coach cannot view role permissions (owner+ required)", async () => {
    const client = await clientFor("bob");

    await expectToThrow(
      () => client.query(api.rolesPermissions.getForTenant, { tenantId: tenantId() }),
      "Insufficient role"
    );
  });

  test("owner can view role permissions", async () => {
    const client = await clientFor("alice");

    const roles = await client.query(api.rolesPermissions.getForTenant, {
      tenantId: tenantId(),
    });

    expect(roles.length).toBeGreaterThanOrEqual(4); // athlete, coach, admin, owner
    const roleNames = roles.map((r: any) => r.roleName);
    expect(roleNames).toContain("athlete");
    expect(roleNames).toContain("coach");
    expect(roleNames).toContain("admin");
    expect(roleNames).toContain("owner");
  });

  // ---- Role updates (owner+) ----

  test("athlete cannot update member roles", async () => {
    const client = await clientFor("dave");
    const eveMembershipId = ctx.memberships["eve:cfAlpha"]?.id;

    if (eveMembershipId) {
      await expectToThrow(
        () =>
          client.mutation(api.memberships.updateRole, {
            tenantId: tenantId(),
            membershipId: eveMembershipId as Id<"memberships">,
            role: "coach",
          }),
        "Insufficient role"
      );
    }
  });

  test("owner can update member roles", async () => {
    const client = await clientFor("alice");
    const eveMembershipId = ctx.memberships["eve:cfAlpha"]?.id;

    if (eveMembershipId) {
      // Promote Eve to coach
      await client.mutation(api.memberships.updateRole, {
        tenantId: tenantId(),
        membershipId: eveMembershipId as Id<"memberships">,
        role: "coach",
      });

      // Verify
      const membership = await client.query(api.memberships.getByUserId, {
        tenantId: tenantId(),
        userId: ctx.users.eve.id as Id<"users">,
      });

      expect(membership).not.toBeNull();
      expect(membership!.role).toBe("coach");

      // Reset Eve back to athlete for other tests
      await client.mutation(api.memberships.updateRole, {
        tenantId: tenantId(),
        membershipId: eveMembershipId as Id<"memberships">,
        role: "athlete",
      });
    }
  });

  test("owner cannot change their own role", async () => {
    const client = await clientFor("alice");
    const aliceMembershipId = ctx.memberships["alice:cfAlpha"]?.id;

    if (aliceMembershipId) {
      await expectToThrow(
        () =>
          client.mutation(api.memberships.updateRole, {
            tenantId: tenantId(),
            membershipId: aliceMembershipId as Id<"memberships">,
            role: "athlete",
          }),
        "cannot change your own role"
      );
    }
  });

  // ---- Staff management (owner+) ----

  test("athlete cannot create staff records (owner+ required)", async () => {
    const client = await clientFor("dave");
    const bobMembershipId = ctx.memberships["bob:cfAlpha"]?.id;

    if (bobMembershipId) {
      await expectToThrow(
        () =>
          client.mutation(api.staff.create, {
            tenantId: tenantId(),
            membershipId: bobMembershipId as Id<"memberships">,
            jobTitle: "Head Coach",
          }),
        "Insufficient role"
      );
    }
  });

  // ---- Per-user permission queries ----

  test("athlete gets empty permission list", async () => {
    const client = await clientFor("dave");

    const permissions = await client.query(api.rolesPermissions.getMyPermissions, {
      tenantId: tenantId(),
    });

    expect(permissions).toEqual([]);
  });

  test("coach gets expected permissions", async () => {
    const client = await clientFor("bob");

    const permissions = await client.query(api.rolesPermissions.getMyPermissions, {
      tenantId: tenantId(),
    });

    expect(permissions).toContain("manage_programming");
    expect(permissions).toContain("manage_classes");
    expect(permissions).not.toContain("manage_billing");
  });
});
