import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("memberships", () => {
  test("join creates active membership with athlete role", async () => {
    const t = convexTest(schema);

    const { userId, tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Joiner",
        email: "joiner@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Open Gym",
        slug: "open-gym",
      });
      return { userId, tenantId };
    });

    const asJoiner = t.withIdentity({ email: "joiner@example.com", subject: "user|joiner" });
    const membershipId = await asJoiner.mutation(api.memberships.join, { tenantId });

    expect(membershipId).toBeDefined();

    const membership = await t.run(async (ctx) => {
      return await ctx.db.get(membershipId);
    });

    expect(membership!.role).toBe("athlete");
    expect(membership!.status).toBe("active");
    expect(membership!.userId).toEqual(userId);
    expect(membership!.tenantId).toEqual(tenantId);
  });

  test("join sets isPrimaryGym true for first membership", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "First Timer",
        email: "first@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "First Gym",
        slug: "first-gym",
      });
      return { userId, tenantId };
    });

    const asFirst = t.withIdentity({ email: "first@example.com", subject: "user|first" });
    const membershipId = await asFirst.mutation(api.memberships.join, { tenantId });

    const membership = await t.run(async (ctx) => {
      return await ctx.db.get(membershipId);
    });

    expect(membership!.isPrimaryGym).toBe(true);
  });

  test("join sets isPrimaryGym false for subsequent memberships", async () => {
    const t = convexTest(schema);

    const { tenantId2 } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Multi Gym",
        email: "multi@example.com",
      });
      const tenantId1 = await ctx.db.insert("tenants", {
        name: "Gym One",
        slug: "gym-one",
      });
      const tenantId2 = await ctx.db.insert("tenants", {
        name: "Gym Two",
        slug: "gym-two",
      });

      // Already has a membership in gym one
      await ctx.db.insert("memberships", {
        userId,
        tenantId: tenantId1,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      return { userId, tenantId1, tenantId2 };
    });

    const asMulti = t.withIdentity({ email: "multi@example.com", subject: "user|multi" });
    const secondMembershipId = await asMulti.mutation(api.memberships.join, {
      tenantId: tenantId2,
    });

    const membership = await t.run(async (ctx) => {
      return await ctx.db.get(secondMembershipId);
    });

    expect(membership!.isPrimaryGym).toBe(false);
  });

  test("join rejects if already a member", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Already Member",
        email: "already@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Same Gym",
        slug: "same-gym",
      });

      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      return { userId, tenantId };
    });

    const asAlready = t.withIdentity({ email: "already@example.com", subject: "user|already" });
    await expect(
      asAlready.mutation(api.memberships.join, { tenantId })
    ).rejects.toThrow("You are already a member of this gym");
  });

  test("updateRole owner can promote athlete to coach", async () => {
    const t = convexTest(schema);

    const { tenantId, athleteMembershipId } = await t.run(async (ctx) => {
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

      const athleteId = await ctx.db.insert("users", {
        name: "Athlete",
        email: "athlete@example.com",
      });
      const athleteMembershipId = await ctx.db.insert("memberships", {
        userId: athleteId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      return { tenantId, athleteMembershipId };
    });

    const asOwner = t.withIdentity({ email: "owner@example.com", subject: "user|owner" });
    await asOwner.mutation(api.memberships.updateRole, {
      tenantId,
      membershipId: athleteMembershipId,
      role: "coach",
    });

    const updated = await t.run(async (ctx) => {
      return await ctx.db.get(athleteMembershipId);
    });

    expect(updated!.role).toBe("coach");
  });

  test("updateRole coach cannot promote anyone (RBAC)", async () => {
    const t = convexTest(schema);

    const { tenantId, athleteMembershipId } = await t.run(async (ctx) => {
      const coachId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId: coachId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const athleteId = await ctx.db.insert("users", {
        name: "Athlete",
        email: "athlete@example.com",
      });
      const athleteMembershipId = await ctx.db.insert("memberships", {
        userId: athleteId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      return { tenantId, athleteMembershipId };
    });

    const asCoach = t.withIdentity({ email: "coach@example.com", subject: "user|coach" });
    await expect(
      asCoach.mutation(api.memberships.updateRole, {
        tenantId,
        membershipId: athleteMembershipId,
        role: "coach",
      })
    ).rejects.toThrow("Insufficient permissions");
  });

  test("updateRole owner cannot demote themselves", async () => {
    const t = convexTest(schema);

    const { tenantId, ownerMembershipId } = await t.run(async (ctx) => {
      const ownerId = await ctx.db.insert("users", {
        name: "Owner",
        email: "owner@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      const ownerMembershipId = await ctx.db.insert("memberships", {
        userId: ownerId,
        tenantId,
        role: "owner",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      return { tenantId, ownerMembershipId };
    });

    const asOwner = t.withIdentity({ email: "owner@example.com", subject: "user|owner" });
    await expect(
      asOwner.mutation(api.memberships.updateRole, {
        tenantId,
        membershipId: ownerMembershipId,
        role: "athlete",
      })
    ).rejects.toThrow("You cannot change your own role");
  });

  test("updateStatus admin can freeze membership", async () => {
    const t = convexTest(schema);

    const { tenantId, athleteMembershipId } = await t.run(async (ctx) => {
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

      const athleteId = await ctx.db.insert("users", {
        name: "Athlete",
        email: "athlete@example.com",
      });
      const athleteMembershipId = await ctx.db.insert("memberships", {
        userId: athleteId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      return { tenantId, athleteMembershipId };
    });

    const asAdmin = t.withIdentity({ email: "admin@example.com", subject: "user|admin" });
    await asAdmin.mutation(api.memberships.updateStatus, {
      tenantId,
      membershipId: athleteMembershipId,
      status: "frozen",
    });

    const updated = await t.run(async (ctx) => {
      return await ctx.db.get(athleteMembershipId);
    });

    expect(updated!.status).toBe("frozen");
  });

  test("updateStatus athlete cannot freeze others memberships", async () => {
    const t = convexTest(schema);

    const { tenantId, otherMembershipId } = await t.run(async (ctx) => {
      const athleteId = await ctx.db.insert("users", {
        name: "Athlete",
        email: "athlete@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId: athleteId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const otherId = await ctx.db.insert("users", {
        name: "Other",
        email: "other@example.com",
      });
      const otherMembershipId = await ctx.db.insert("memberships", {
        userId: otherId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      return { tenantId, otherMembershipId };
    });

    const asAthlete = t.withIdentity({ email: "athlete@example.com", subject: "user|athlete" });
    await expect(
      asAthlete.mutation(api.memberships.updateStatus, {
        tenantId,
        membershipId: otherMembershipId,
        status: "frozen",
      })
    ).rejects.toThrow("Insufficient permissions");
  });

  test("setPrimaryGym unsets previous primary and sets new", async () => {
    const t = convexTest(schema);

    const { membership1Id, membership2Id, tenantId2 } = await t.run(
      async (ctx) => {
        const userId = await ctx.db.insert("users", {
          name: "Switcher",
          email: "switcher@example.com",
        });

        const tenantId1 = await ctx.db.insert("tenants", {
          name: "Gym A",
          slug: "gym-a",
        });
        const tenantId2 = await ctx.db.insert("tenants", {
          name: "Gym B",
          slug: "gym-b",
        });

        const membership1Id = await ctx.db.insert("memberships", {
          userId,
          tenantId: tenantId1,
          role: "athlete",
          status: "active",
          isPrimaryGym: true,
          joinDate: "2024-01-01",
        });

        const membership2Id = await ctx.db.insert("memberships", {
          userId,
          tenantId: tenantId2,
          role: "athlete",
          status: "active",
          isPrimaryGym: false,
          joinDate: "2024-02-01",
        });

        return { membership1Id, membership2Id, tenantId2 };
      }
    );

    const asSwitcher = t.withIdentity({ email: "switcher@example.com", subject: "user|switcher" });
    await asSwitcher.mutation(api.memberships.setPrimaryGym, {
      tenantId: tenantId2,
    });

    const m1 = await t.run(async (ctx) => ctx.db.get(membership1Id));
    const m2 = await t.run(async (ctx) => ctx.db.get(membership2Id));

    expect(m1!.isPrimaryGym).toBe(false);
    expect(m2!.isPrimaryGym).toBe(true);
  });

  test("leave sets status to cancelled", async () => {
    const t = convexTest(schema);

    const { tenantId, membershipId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Leaver",
        email: "leaver@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      const membershipId = await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { tenantId, membershipId };
    });

    const asLeaver = t.withIdentity({ email: "leaver@example.com", subject: "user|leaver" });
    await asLeaver.mutation(api.memberships.leave, { tenantId });

    const updated = await t.run(async (ctx) => {
      return await ctx.db.get(membershipId);
    });

    expect(updated!.status).toBe("cancelled");
  });

  test("leave owner cannot leave", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Owner",
        email: "owner@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "owner",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asOwner = t.withIdentity({ email: "owner@example.com", subject: "user|owner" });
    await expect(
      asOwner.mutation(api.memberships.leave, { tenantId })
    ).rejects.toThrow("Owners cannot leave");
  });

  test("listByTenant returns only members of that tenant (isolation)", async () => {
    const t = convexTest(schema);

    const { tenantAId, tenantBId } = await t.run(async (ctx) => {
      // Coach in Tenant A
      const coachId = await ctx.db.insert("users", {
        name: "Coach A",
        email: "coacha@example.com",
      });
      const tenantAId = await ctx.db.insert("tenants", {
        name: "Gym A",
        slug: "gym-a",
      });
      await ctx.db.insert("memberships", {
        userId: coachId,
        tenantId: tenantAId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      // Athlete in Tenant A
      const athleteAId = await ctx.db.insert("users", {
        name: "Athlete A",
        email: "athletea@example.com",
      });
      await ctx.db.insert("memberships", {
        userId: athleteAId,
        tenantId: tenantAId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      // User in Tenant B (should NOT appear)
      const userBId = await ctx.db.insert("users", {
        name: "User B",
        email: "userb@example.com",
      });
      const tenantBId = await ctx.db.insert("tenants", {
        name: "Gym B",
        slug: "gym-b",
      });
      await ctx.db.insert("memberships", {
        userId: userBId,
        tenantId: tenantBId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      return { tenantAId, tenantBId };
    });

    const asCoach = t.withIdentity({ email: "coacha@example.com", subject: "user|coacha" });
    const members = await asCoach.query(api.memberships.listByTenant, {
      tenantId: tenantAId,
    });

    expect(members).toHaveLength(2);
    const emails = members.map((m) => m.user.email).sort();
    expect(emails).toEqual(["athletea@example.com", "coacha@example.com"]);

    // Ensure none belong to tenant B
    for (const m of members) {
      expect(m.tenantId).toEqual(tenantAId);
    }
  });
});
