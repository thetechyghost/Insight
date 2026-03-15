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

describe("invitations", () => {
  test("create generates token and sets 7-day expiry", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Admin",
        email: "admin@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "admin",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asAdmin = t.withIdentity(identity("admin@example.com"));
    const beforeMs = Date.now();

    const invitationId = await asAdmin.mutation(api.invitations.create, {
      tenantId,
      email: "newbie@example.com",
      role: "athlete",
    });

    expect(invitationId).toBeDefined();

    const invitation = await t.run(async (ctx) => {
      return await ctx.db.get(invitationId);
    });

    expect(invitation).not.toBeNull();
    expect(invitation!.token).toBeDefined();
    expect(invitation!.token.length).toBeGreaterThan(0);
    expect(invitation!.status).toBe("pending");
    expect(invitation!.expiresAt).toBeGreaterThan(beforeMs);

    // 7 days in ms = 604800000, allow small margin
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(invitation!.expiresAt).toBeGreaterThanOrEqual(
      beforeMs + sevenDaysMs - 1000
    );
  });

  test("create rejects duplicate invite for same email+tenant (pending status)", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Admin",
        email: "admin@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "admin",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asAdmin = t.withIdentity(identity("admin@example.com"));

    // First invite succeeds
    await asAdmin.mutation(api.invitations.create, {
      tenantId,
      email: "dup@example.com",
      role: "athlete",
    });

    // Duplicate invite should fail
    await expect(
      asAdmin.mutation(api.invitations.create, {
        tenantId,
        email: "dup@example.com",
        role: "athlete",
      })
    ).rejects.toThrow("A pending invitation already exists for this email");
  });

  test("create requires admin role (athlete should fail)", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Athlete",
        email: "athlete@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    await expect(
      asAthlete.mutation(api.invitations.create, {
        tenantId,
        email: "someone@example.com",
        role: "athlete",
      })
    ).rejects.toThrow("Insufficient permissions");
  });

  test("accept creates membership and updates invite status to accepted", async () => {
    const t = convexTest(schema);

    const { token } = await t.run(async (ctx) => {
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

      // Create the invited user
      await ctx.db.insert("users", {
        name: "Invited",
        email: "invited@example.com",
      });

      // Seed an invitation directly
      const token = "test-token-123";
      await ctx.db.insert("invitations", {
        tenantId,
        email: "invited@example.com",
        role: "coach",
        token,
        status: "pending",
        invitedBy: adminId,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      return { token };
    });

    const asInvited = t.withIdentity(identity("invited@example.com"));

    const membershipId = await asInvited.mutation(api.invitations.accept, {
      token,
    });

    expect(membershipId).toBeDefined();

    const membership = await t.run(async (ctx) => {
      return await ctx.db.get(membershipId);
    });

    expect(membership).not.toBeNull();
    expect(membership!.role).toBe("coach");
    expect(membership!.status).toBe("active");

    // Verify invitation status updated
    const invitation = await t.run(async (ctx) => {
      return await ctx.db
        .query("invitations")
        .withIndex("by_token", (q) => q.eq("token", "test-token-123"))
        .unique();
    });

    expect(invitation!.status).toBe("accepted");
  });

  test("accept rejects expired token", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      const adminId = await ctx.db.insert("users", {
        name: "Admin",
        email: "admin@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });

      await ctx.db.insert("users", {
        name: "Invited",
        email: "invited@example.com",
      });

      // Create an expired invitation
      await ctx.db.insert("invitations", {
        tenantId,
        email: "invited@example.com",
        role: "athlete",
        token: "expired-token",
        status: "pending",
        invitedBy: adminId,
        expiresAt: Date.now() - 1000, // Already expired
      });
    });

    const asInvited = t.withIdentity(identity("invited@example.com"));

    await expect(
      asInvited.mutation(api.invitations.accept, { token: "expired-token" })
    ).rejects.toThrow("expired");
  });

  test("accept rejects already-accepted token", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      const adminId = await ctx.db.insert("users", {
        name: "Admin",
        email: "admin@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });

      await ctx.db.insert("users", {
        name: "Invited",
        email: "invited@example.com",
      });

      await ctx.db.insert("invitations", {
        tenantId,
        email: "invited@example.com",
        role: "athlete",
        token: "accepted-token",
        status: "accepted",
        invitedBy: adminId,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
    });

    const asInvited = t.withIdentity(identity("invited@example.com"));

    await expect(
      asInvited.mutation(api.invitations.accept, { token: "accepted-token" })
    ).rejects.toThrow("already been accepted");
  });

  test("revoke sets status to revoked", async () => {
    const t = convexTest(schema);

    const { tenantId, invitationId } = await t.run(async (ctx) => {
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

      const invitationId = await ctx.db.insert("invitations", {
        tenantId,
        email: "someone@example.com",
        role: "athlete",
        token: "revoke-token",
        status: "pending",
        invitedBy: adminId,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      return { tenantId, invitationId };
    });

    const asAdmin = t.withIdentity(identity("admin@example.com"));

    await asAdmin.mutation(api.invitations.revoke, { tenantId, invitationId });

    const invite = await t.run(async (ctx) => ctx.db.get(invitationId));
    expect(invite!.status).toBe("revoked");
  });

  test("getByToken returns null for nonexistent token", async () => {
    const t = convexTest(schema);

    const result = await t.query(api.invitations.getByToken, {
      token: "nonexistent-token",
    });

    expect(result).toBeNull();
  });
});
