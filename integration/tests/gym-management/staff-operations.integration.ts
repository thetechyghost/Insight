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
 * [FR-TG] Staff Operations
 *
 * Tests staff record CRUD, role-based access (owner+ for mutations,
 * admin+ for queries), and tenant isolation for the staff domain.
 */
describe("[FR-TG] Staff Operations", () => {
  let ctx: SeedContext;
  let createdStaffId: Id<"staff"> | null = null;

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
  // create — owner+ required
  // ==========================================================================

  describe("create", () => {
    test("owner can create a staff record for a member", async () => {
      const client = await clientFor("alice");
      const bobMembershipId = ctx.memberships["bob:cfAlpha"]?.id as Id<"memberships">;

      const staffId = await client.mutation(api.staff.create, {
        tenantId: tenantId(),
        membershipId: bobMembershipId,
        jobTitle: "Head Coach",
        permissions: ["manage_programming", "manage_classes"],
        assignedRoles: ["coaching"],
      });

      expectValidId(staffId);
      createdStaffId = staffId as Id<"staff">;
    });

    test("admin cannot create staff records (owner+ required)", async () => {
      const client = await clientFor("carol");
      const daveMembershipId = ctx.memberships["dave:cfAlpha"]?.id as Id<"memberships">;

      await expectToThrow(
        () =>
          client.mutation(api.staff.create, {
            tenantId: tenantId(),
            membershipId: daveMembershipId,
            jobTitle: "Assistant Coach",
          }),
        "Insufficient role"
      );
    });

    test("coach cannot create staff records (owner+ required)", async () => {
      const client = await clientFor("bob");
      const daveMembershipId = ctx.memberships["dave:cfAlpha"]?.id as Id<"memberships">;

      await expectToThrow(
        () =>
          client.mutation(api.staff.create, {
            tenantId: tenantId(),
            membershipId: daveMembershipId,
            jobTitle: "Assistant Coach",
          }),
        "Insufficient role"
      );
    });

    test("athlete cannot create staff records (owner+ required)", async () => {
      const client = await clientFor("dave");
      const bobMembershipId = ctx.memberships["bob:cfAlpha"]?.id as Id<"memberships">;

      await expectToThrow(
        () =>
          client.mutation(api.staff.create, {
            tenantId: tenantId(),
            membershipId: bobMembershipId,
            jobTitle: "Head Coach",
          }),
        "Insufficient role"
      );
    });

    test("cannot create staff for membership from another tenant", async () => {
      const client = await clientFor("alice");
      const graceMembershipId = ctx.memberships["grace:cfBeta"]?.id as Id<"memberships">;

      await expectToThrow(
        () =>
          client.mutation(api.staff.create, {
            tenantId: tenantId(),
            membershipId: graceMembershipId,
            jobTitle: "Visiting Coach",
          }),
        "does not belong to this tenant"
      );
    });
  });

  // ==========================================================================
  // listByTenant — admin+ required
  // ==========================================================================

  describe("listByTenant", () => {
    test("admin can list staff for the tenant", async () => {
      const client = await clientFor("carol");

      const staffList = await client.query(api.staff.listByTenant, {
        tenantId: tenantId(),
      });

      expect(Array.isArray(staffList)).toBe(true);
      // Should include the staff record we created above
      if (createdStaffId) {
        const found = staffList.some((s: any) => s._id === createdStaffId);
        expect(found).toBe(true);
      }
    });

    test("owner can list staff for the tenant", async () => {
      const client = await clientFor("alice");

      const staffList = await client.query(api.staff.listByTenant, {
        tenantId: tenantId(),
      });

      expect(Array.isArray(staffList)).toBe(true);
      // All staff should belong to this tenant
      for (const s of staffList) {
        expect(s.tenantId).toBe(ctx.tenants.cfAlpha.id);
      }
    });

    test("coach cannot list staff (admin+ required)", async () => {
      const client = await clientFor("bob");

      await expectToThrow(
        () =>
          client.query(api.staff.listByTenant, {
            tenantId: tenantId(),
          }),
        "Insufficient role"
      );
    });

    test("athlete cannot list staff (admin+ required)", async () => {
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.query(api.staff.listByTenant, {
            tenantId: tenantId(),
          }),
        "Insufficient role"
      );
    });

    test("tenant isolation: cf-alpha staff list contains no cf-beta staff", async () => {
      const client = await clientFor("alice");

      const staffList = await client.query(api.staff.listByTenant, {
        tenantId: tenantId(),
      });

      for (const s of staffList) {
        expect(s.tenantId).toBe(ctx.tenants.cfAlpha.id);
        expect(s.tenantId).not.toBe(ctx.tenants.cfBeta.id);
      }
    });
  });

  // ==========================================================================
  // getById — admin+ required
  // ==========================================================================

  describe("getById", () => {
    test("admin can get a specific staff record", async () => {
      if (!createdStaffId) return;

      const client = await clientFor("carol");

      const staff = await client.query(api.staff.getById, {
        tenantId: tenantId(),
        staffId: createdStaffId,
      });

      expect(staff._id).toBe(createdStaffId);
      expect(staff.jobTitle).toBe("Head Coach");
      expect(staff.status).toBe("active");
      expect(staff.tenantId).toBe(ctx.tenants.cfAlpha.id);
    });

    test("owner can get a specific staff record", async () => {
      if (!createdStaffId) return;

      const client = await clientFor("alice");

      const staff = await client.query(api.staff.getById, {
        tenantId: tenantId(),
        staffId: createdStaffId,
      });

      expect(staff._id).toBe(createdStaffId);
      expect(staff.permissions).toEqual(["manage_programming", "manage_classes"]);
    });

    test("coach cannot get staff by ID (admin+ required)", async () => {
      if (!createdStaffId) return;

      const client = await clientFor("bob");

      await expectToThrow(
        () =>
          client.query(api.staff.getById, {
            tenantId: tenantId(),
            staffId: createdStaffId!,
          }),
        "Insufficient role"
      );
    });

    test("athlete cannot get staff by ID (admin+ required)", async () => {
      if (!createdStaffId) return;

      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.query(api.staff.getById, {
            tenantId: tenantId(),
            staffId: createdStaffId!,
          }),
        "Insufficient role"
      );
    });
  });

  // ==========================================================================
  // update — owner+ required
  // ==========================================================================

  describe("update", () => {
    test("owner can update staff job title", async () => {
      if (!createdStaffId) return;

      const client = await clientFor("alice");

      await client.mutation(api.staff.update, {
        tenantId: tenantId(),
        staffId: createdStaffId,
        jobTitle: "Senior Head Coach",
      });

      // Verify
      const staff = await client.query(api.staff.getById, {
        tenantId: tenantId(),
        staffId: createdStaffId,
      });
      expect(staff.jobTitle).toBe("Senior Head Coach");
    });

    test("owner can update staff permissions", async () => {
      if (!createdStaffId) return;

      const client = await clientFor("alice");

      await client.mutation(api.staff.update, {
        tenantId: tenantId(),
        staffId: createdStaffId,
        permissions: ["manage_programming", "manage_classes", "manage_athletes"],
      });

      const staff = await client.query(api.staff.getById, {
        tenantId: tenantId(),
        staffId: createdStaffId,
      });
      expect(staff.permissions).toContain("manage_athletes");
    });

    test("owner can update staff assigned roles", async () => {
      if (!createdStaffId) return;

      const client = await clientFor("alice");

      await client.mutation(api.staff.update, {
        tenantId: tenantId(),
        staffId: createdStaffId,
        assignedRoles: ["coaching", "programming"],
      });

      const staff = await client.query(api.staff.getById, {
        tenantId: tenantId(),
        staffId: createdStaffId,
      });
      expect(staff.assignedRoles).toEqual(["coaching", "programming"]);
    });

    test("admin cannot update staff records (owner+ required)", async () => {
      if (!createdStaffId) return;

      const client = await clientFor("carol");

      await expectToThrow(
        () =>
          client.mutation(api.staff.update, {
            tenantId: tenantId(),
            staffId: createdStaffId!,
            jobTitle: "Demoted Coach",
          }),
        "Insufficient role"
      );
    });

    test("coach cannot update staff records (owner+ required)", async () => {
      if (!createdStaffId) return;

      const client = await clientFor("bob");

      await expectToThrow(
        () =>
          client.mutation(api.staff.update, {
            tenantId: tenantId(),
            staffId: createdStaffId!,
            jobTitle: "Self-Promoted Coach",
          }),
        "Insufficient role"
      );
    });

    test("athlete cannot update staff records (owner+ required)", async () => {
      if (!createdStaffId) return;

      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.mutation(api.staff.update, {
            tenantId: tenantId(),
            staffId: createdStaffId!,
            jobTitle: "Hacker Coach",
          }),
        "Insufficient role"
      );
    });
  });

  // ==========================================================================
  // deactivate — owner+ required
  // ==========================================================================

  describe("deactivate", () => {
    test("admin cannot deactivate staff (owner+ required)", async () => {
      if (!createdStaffId) return;

      const client = await clientFor("carol");

      await expectToThrow(
        () =>
          client.mutation(api.staff.deactivate, {
            tenantId: tenantId(),
            staffId: createdStaffId!,
          }),
        "Insufficient role"
      );
    });

    test("coach cannot deactivate staff (owner+ required)", async () => {
      if (!createdStaffId) return;

      const client = await clientFor("bob");

      await expectToThrow(
        () =>
          client.mutation(api.staff.deactivate, {
            tenantId: tenantId(),
            staffId: createdStaffId!,
          }),
        "Insufficient role"
      );
    });

    test("athlete cannot deactivate staff (owner+ required)", async () => {
      if (!createdStaffId) return;

      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.mutation(api.staff.deactivate, {
            tenantId: tenantId(),
            staffId: createdStaffId!,
          }),
        "Insufficient role"
      );
    });

    test("owner can deactivate a staff record", async () => {
      if (!createdStaffId) return;

      const client = await clientFor("alice");

      await client.mutation(api.staff.deactivate, {
        tenantId: tenantId(),
        staffId: createdStaffId,
      });

      // Verify status is now inactive
      const staff = await client.query(api.staff.getById, {
        tenantId: tenantId(),
        staffId: createdStaffId,
      });
      expect(staff.status).toBe("inactive");
    });
  });

  // ==========================================================================
  // Tenant isolation
  // ==========================================================================

  describe("tenant isolation", () => {
    test("owner of tenant A cannot access staff records in tenant B", async () => {
      const client = await clientFor("alice"); // owner of cf-alpha only

      await expectToThrow(
        () =>
          client.query(api.staff.listByTenant, {
            tenantId: betaTenantId(),
          }),
        "not a member"
      );
    });

    test("unauthenticated user cannot list staff", async () => {
      const { createTestClient } = await import("../../clients/convex-client");
      const client = createTestClient();

      await expectToThrow(() =>
        client.query(api.staff.listByTenant, {
          tenantId: tenantId(),
        })
      );
    });
  });
});
