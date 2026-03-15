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

describe("waivers", () => {
  test("create sets version 1 and isActive true", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
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
      return { tenantId };
    });

    const asOwner = t.withIdentity(identity("owner@example.com"));

    const waiverId = await asOwner.mutation(api.waivers.create, {
      tenantId,
      title: "Liability Waiver",
      content: "You agree to...",
    });

    const waiver = await t.run(async (ctx) => ctx.db.get(waiverId));
    expect(waiver).not.toBeNull();
    expect(waiver!.version).toBe(1);
    expect(waiver!.isActive).toBe(true);
    expect(waiver!.createdAt).toBeDefined();
  });

  test("update creates new version and deactivates old", async () => {
    const t = convexTest(schema);

    const { tenantId, oldWaiverId } = await t.run(async (ctx) => {
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

      const oldWaiverId = await ctx.db.insert("waivers", {
        tenantId,
        title: "Original Waiver",
        content: "Original content",
        version: 1,
        isActive: true,
        createdAt: Date.now(),
      });

      return { tenantId, oldWaiverId };
    });

    const asOwner = t.withIdentity(identity("owner@example.com"));

    const newWaiverId = await asOwner.mutation(api.waivers.update, {
      tenantId,
      waiverId: oldWaiverId,
      title: "Updated Waiver",
      content: "Updated content",
    });

    const oldWaiver = await t.run(async (ctx) => ctx.db.get(oldWaiverId));
    expect(oldWaiver!.isActive).toBe(false);

    const newWaiver = await t.run(async (ctx) => ctx.db.get(newWaiverId));
    expect(newWaiver).not.toBeNull();
    expect(newWaiver!.version).toBe(2);
    expect(newWaiver!.isActive).toBe(true);
    expect(newWaiver!.title).toBe("Updated Waiver");
    expect(newWaiver!.createdAt).toBeDefined();
  });

  test("sign creates signature record", async () => {
    const t = convexTest(schema);

    const { tenantId, waiverId } = await t.run(async (ctx) => {
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

      const waiverId = await ctx.db.insert("waivers", {
        tenantId,
        title: "Liability Waiver",
        content: "You agree to...",
        version: 1,
        isActive: true,
        createdAt: Date.now(),
      });

      return { tenantId, waiverId };
    });

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    const sigId = await asAthlete.mutation(api.waivers.sign, {
      tenantId,
      waiverId,
    });

    const sig = await t.run(async (ctx) => ctx.db.get(sigId));
    expect(sig).not.toBeNull();
    expect(sig!.waiverId).toEqual(waiverId);
    expect(sig!.signedAt).toBeDefined();
    expect(sig!.waiverVersion).toBe(1);
  });

  test("getSignatureStatus correctly reports signed/unsigned", async () => {
    const t = convexTest(schema);

    const { tenantId, waiverId } = await t.run(async (ctx) => {
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

      const waiverId = await ctx.db.insert("waivers", {
        tenantId,
        title: "Liability Waiver",
        content: "You agree to...",
        version: 1,
        isActive: true,
        createdAt: Date.now(),
      });

      return { tenantId, waiverId };
    });

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    // Before signing
    const unsignedStatus = await asAthlete.query(
      api.waivers.getSignatureStatus,
      { tenantId, waiverId },
    );

    expect(unsignedStatus.signed).toBe(false);
    expect(unsignedStatus.signedAt).toBeUndefined();

    // Sign the waiver
    await asAthlete.mutation(api.waivers.sign, { tenantId, waiverId });

    // After signing
    const signedStatus = await asAthlete.query(
      api.waivers.getSignatureStatus,
      { tenantId, waiverId },
    );

    expect(signedStatus.signed).toBe(true);
    expect(signedStatus.signedAt).toBeDefined();
  });

  test("listActive returns only active waivers for tenant", async () => {
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

      // Active waiver
      await ctx.db.insert("waivers", {
        tenantId,
        title: "Active Waiver",
        content: "Content A",
        version: 1,
        isActive: true,
        createdAt: Date.now(),
      });

      // Inactive waiver (superseded)
      await ctx.db.insert("waivers", {
        tenantId,
        title: "Old Waiver",
        content: "Content B",
        version: 1,
        isActive: false,
        createdAt: Date.now(),
      });

      // Active waiver in a different tenant (should not appear)
      const otherTenantId = await ctx.db.insert("tenants", {
        name: "Other Gym",
        slug: "other-gym",
      });
      await ctx.db.insert("waivers", {
        tenantId: otherTenantId,
        title: "Other Gym Waiver",
        content: "Content C",
        version: 1,
        isActive: true,
        createdAt: Date.now(),
      });

      return { tenantId };
    });

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    const activeWaivers = await asAthlete.query(api.waivers.listActive, {
      tenantId,
    });

    expect(activeWaivers).toHaveLength(1);
    expect(activeWaivers[0].title).toBe("Active Waiver");
    expect(activeWaivers[0].isActive).toBe(true);
    expect(activeWaivers[0].tenantId).toEqual(tenantId);
  });
});
