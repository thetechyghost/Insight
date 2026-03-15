import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

function identity(email: string) {
  return {
    email,
    subject: `user|${email}`,
    tokenIdentifier: `test|${email}`,
  };
}

describe("staff", () => {
  test("create links to membership correctly (verify membershipId stored)", async () => {
    const t = convexTest(schema);

    const { tenantId, targetMembershipId } = await t.run(async (ctx) => {
      const ownerId = await ctx.db.insert("users", {
        name: "Owner",
        email: "owner@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId: ownerId,
        tenantId,
        role: "owner",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const coachId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
      });
      const targetMembershipId = await ctx.db.insert("memberships", {
        userId: coachId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      return { tenantId, targetMembershipId };
    });

    const asOwner = t.withIdentity(identity("owner@example.com"));

    const staffId = await asOwner.mutation(api.staff.create, {
      tenantId,
      membershipId: targetMembershipId,
      jobTitle: "Head Coach",
    });

    expect(staffId).toBeDefined();

    const staff = await t.run(async (ctx) => {
      return await ctx.db.get(staffId);
    });

    expect(staff).not.toBeNull();
    expect(staff!.membershipId).toEqual(targetMembershipId);
    expect(staff!.tenantId).toEqual(tenantId);
    expect(staff!.jobTitle).toBe("Head Coach");
    expect(staff!.status).toBe("active");
  });

  test("create requires owner role (admin should fail)", async () => {
    const t = convexTest(schema);

    const { tenantId, targetMembershipId } = await t.run(async (ctx) => {
      const adminId = await ctx.db.insert("users", {
        name: "Admin",
        email: "admin@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId: adminId,
        tenantId,
        role: "admin",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const coachId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
      });
      const targetMembershipId = await ctx.db.insert("memberships", {
        userId: coachId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      return { tenantId, targetMembershipId };
    });

    const asAdmin = t.withIdentity(identity("admin@example.com"));

    await expect(
      asAdmin.mutation(api.staff.create, {
        tenantId,
        membershipId: targetMembershipId,
        jobTitle: "Coach",
      })
    ).rejects.toThrow("Insufficient permissions");
  });

  test("deactivate sets status to inactive", async () => {
    const t = convexTest(schema);

    const { tenantId, staffId } = await t.run(async (ctx) => {
      const ownerId = await ctx.db.insert("users", {
        name: "Owner",
        email: "owner@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId: ownerId,
        tenantId,
        role: "owner",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const coachId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
      });
      const coachMembershipId = await ctx.db.insert("memberships", {
        userId: coachId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const staffId = await ctx.db.insert("staff", {
        membershipId: coachMembershipId,
        tenantId,
        jobTitle: "Coach",
        status: "active",
      });

      return { tenantId, staffId };
    });

    const asOwner = t.withIdentity(identity("owner@example.com"));

    await asOwner.mutation(api.staff.deactivate, { tenantId, staffId });

    const staff = await t.run(async (ctx) => {
      return await ctx.db.get(staffId);
    });

    expect(staff!.status).toBe("inactive");
  });

  test("listByTenant only returns staff for that tenant (seed 2 tenants)", async () => {
    const t = convexTest(schema);

    const { tenantAId, tenantBId } = await t.run(async (ctx) => {
      // Tenant A with admin + staff
      const adminAId = await ctx.db.insert("users", {
        name: "Admin A",
        email: "admina@example.com",
      });
      const tenantAId = await ctx.db.insert("tenants", {
        name: "Gym A",
        slug: "gym-a",
      });
      await ctx.db.insert("memberships", {
        userId: adminAId,
        tenantId: tenantAId,
        role: "admin",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const coachAId = await ctx.db.insert("users", {
        name: "Coach A",
        email: "coacha@example.com",
      });
      const coachAMembership = await ctx.db.insert("memberships", {
        userId: coachAId,
        tenantId: tenantAId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      await ctx.db.insert("staff", {
        membershipId: coachAMembership,
        tenantId: tenantAId,
        jobTitle: "Coach A",
        status: "active",
      });

      // Tenant B with admin + staff
      const adminBId = await ctx.db.insert("users", {
        name: "Admin B",
        email: "adminb@example.com",
      });
      const tenantBId = await ctx.db.insert("tenants", {
        name: "Gym B",
        slug: "gym-b",
      });
      await ctx.db.insert("memberships", {
        userId: adminBId,
        tenantId: tenantBId,
        role: "admin",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const coachBId = await ctx.db.insert("users", {
        name: "Coach B",
        email: "coachb@example.com",
      });
      const coachBMembership = await ctx.db.insert("memberships", {
        userId: coachBId,
        tenantId: tenantBId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      await ctx.db.insert("staff", {
        membershipId: coachBMembership,
        tenantId: tenantBId,
        jobTitle: "Coach B",
        status: "active",
      });

      return { tenantAId, tenantBId };
    });

    const asAdminA = t.withIdentity(identity("admina@example.com"));
    const staffA = await asAdminA.query(api.staff.listByTenant, {
      tenantId: tenantAId,
    });

    expect(staffA).toHaveLength(1);
    expect(staffA[0].tenantId).toEqual(tenantAId);
    expect(staffA[0].jobTitle).toBe("Coach A");

    const asAdminB = t.withIdentity(identity("adminb@example.com"));
    const staffB = await asAdminB.query(api.staff.listByTenant, {
      tenantId: tenantBId,
    });

    expect(staffB).toHaveLength(1);
    expect(staffB[0].tenantId).toEqual(tenantBId);
    expect(staffB[0].jobTitle).toBe("Coach B");
  });
});
