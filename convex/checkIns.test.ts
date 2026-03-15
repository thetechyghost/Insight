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

describe("checkIns", () => {
  test("checkIn creates record with timestamp", async () => {
    const t = convexTest(schema);

    const { tenantId, userId } = await t.run(async (ctx) => {
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
      return { tenantId, userId };
    });

    const asAthlete = t.withIdentity(identity("athlete@example.com"));
    const beforeMs = Date.now();

    const checkInId = await asAthlete.mutation(api.checkIns.checkIn, {
      tenantId,
      method: "manual",
    });

    expect(checkInId).toBeDefined();

    const checkIn = await t.run(async (ctx) => {
      return await ctx.db.get(checkInId);
    });

    expect(checkIn).not.toBeNull();
    expect(checkIn!.userId).toEqual(userId);
    expect(checkIn!.tenantId).toEqual(tenantId);
    expect(checkIn!.method).toBe("manual");
    expect(checkIn!.checkedInAt).toBeGreaterThanOrEqual(beforeMs);
  });

  test("checkIn athlete can only check in self (checking in others should fail without admin)", async () => {
    const t = convexTest(schema);

    const { tenantId, otherUserId } = await t.run(async (ctx) => {
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

      const otherUserId = await ctx.db.insert("users", {
        name: "Other",
        email: "other@example.com",
      });
      await ctx.db.insert("memberships", {
        userId: otherUserId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      return { tenantId, otherUserId };
    });

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    await expect(
      asAthlete.mutation(api.checkIns.checkIn, {
        tenantId,
        method: "manual",
        userId: otherUserId,
      })
    ).rejects.toThrow("Insufficient permissions");
  });

  test("checkIn admin can check in others", async () => {
    const t = convexTest(schema);

    const { tenantId, otherUserId } = await t.run(async (ctx) => {
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

      const otherUserId = await ctx.db.insert("users", {
        name: "Other Athlete",
        email: "other@example.com",
      });
      await ctx.db.insert("memberships", {
        userId: otherUserId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      return { tenantId, otherUserId };
    });

    const asAdmin = t.withIdentity(identity("admin@example.com"));

    const checkInId = await asAdmin.mutation(api.checkIns.checkIn, {
      tenantId,
      method: "manual",
      userId: otherUserId,
    });

    expect(checkInId).toBeDefined();

    const checkIn = await t.run(async (ctx) => {
      return await ctx.db.get(checkInId);
    });

    expect(checkIn!.userId).toEqual(otherUserId);
  });

  test("listByUser athlete sees only own check-ins", async () => {
    const t = convexTest(schema);

    const { tenantId, athleteUserId, otherUserId } = await t.run(
      async (ctx) => {
        const athleteUserId = await ctx.db.insert("users", {
          name: "Athlete",
          email: "athlete@example.com",
        });
        const tenantId = await ctx.db.insert("tenants", {
          name: "Test Gym",
          slug: "test-gym",
        });
        await ctx.db.insert("memberships", {
          userId: athleteUserId,
          tenantId,
          role: "athlete",
          status: "active",
          isPrimaryGym: true,
          joinDate: "2024-01-01",
        });

        const otherUserId = await ctx.db.insert("users", {
          name: "Other",
          email: "other@example.com",
        });
        await ctx.db.insert("memberships", {
          userId: otherUserId,
          tenantId,
          role: "athlete",
          status: "active",
          isPrimaryGym: true,
          joinDate: "2024-01-01",
        });

        // Check-ins for athlete
        await ctx.db.insert("check_ins", {
          tenantId,
          userId: athleteUserId,
          checkedInAt: Date.now(),
          method: "manual",
        });

        // Check-ins for other user
        await ctx.db.insert("check_ins", {
          tenantId,
          userId: otherUserId,
          checkedInAt: Date.now(),
          method: "barcode",
        });

        return { tenantId, athleteUserId, otherUserId };
      }
    );

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    // Athlete queries own check-ins (no userId arg = self)
    const ownCheckIns = await asAthlete.query(api.checkIns.listByUser, {
      tenantId,
    });

    expect(ownCheckIns).toHaveLength(1);
    expect(ownCheckIns[0].userId).toEqual(athleteUserId);

    // Athlete trying to see another user's check-ins should fail (requires coach role)
    await expect(
      asAthlete.query(api.checkIns.listByUser, {
        tenantId,
        userId: otherUserId,
      })
    ).rejects.toThrow("Insufficient permissions");
  });
});
