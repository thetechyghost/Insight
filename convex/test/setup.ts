import { convexTest } from "convex-test";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

export type TestConvex = ReturnType<typeof convexTest>;

/**
 * Create a fresh test environment with the full Insight schema.
 */
export function createTestEnv() {
  return convexTest(schema);
}

export type SeedResult = {
  userId: Id<"users">;
  tenantId: Id<"tenants">;
  membershipId: Id<"memberships">;
};

/**
 * Seed a user, tenant, and membership in one call.
 * Default: active athlete membership.
 */
export async function seedUserWithTenant(
  t: TestConvex,
  options?: {
    name?: string;
    email?: string;
    tenantName?: string;
    tenantSlug?: string;
    role?: "athlete" | "coach" | "owner" | "admin";
    membershipStatus?: "active" | "frozen" | "cancelled" | "pending";
  }
): Promise<SeedResult> {
  const name = options?.name ?? "Test User";
  const email = options?.email ?? "test@example.com";
  const tenantName = options?.tenantName ?? "Test Gym";
  const tenantSlug = options?.tenantSlug ?? "test-gym";
  const role = options?.role ?? "athlete";
  const status = options?.membershipStatus ?? "active";

  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name,
      email,
    });

    const tenantId = await ctx.db.insert("tenants", {
      name: tenantName,
      slug: tenantSlug,
    });

    const membershipId = await ctx.db.insert("memberships", {
      userId,
      tenantId,
      role,
      status,
      isPrimaryGym: true,
      joinDate: new Date().toISOString().split("T")[0],
    });

    // Seed default roles for tenant
    const defaultRoles = [
      { roleName: "athlete", permissions: [] as string[], tier: "athlete" as const },
      {
        roleName: "coach",
        permissions: [
          "view_member_details",
          "manage_programming",
          "manage_classes",
          "manage_content",
          "manage_challenges",
        ],
        tier: "coach" as const,
      },
      {
        roleName: "admin",
        permissions: [
          "view_member_details",
          "manage_members",
          "manage_programming",
          "manage_classes",
          "manage_content",
          "manage_challenges",
          "manage_scheduling",
          "manage_devices",
          "manage_waivers",
          "view_reports",
          "manage_communications",
        ],
        tier: "admin" as const,
      },
      {
        roleName: "owner",
        permissions: [
          "manage_members",
          "manage_staff",
          "manage_billing",
          "manage_classes",
          "manage_programming",
          "view_reports",
          "manage_settings",
          "manage_inventory",
          "manage_waivers",
          "manage_content",
          "manage_social",
          "manage_communications",
          "manage_scheduling",
          "manage_devices",
          "view_member_details",
          "manage_challenges",
          "manage_leads",
          "manage_products",
        ],
        tier: "owner" as const,
      },
    ];

    for (const r of defaultRoles) {
      await ctx.db.insert("roles_permissions", {
        tenantId,
        roleName: r.roleName,
        permissions: r.permissions,
        tier: r.tier,
      });
    }

    return { userId, tenantId, membershipId };
  });
}

/**
 * Create a mock authenticated identity for testing.
 */
export function asUser(email: string) {
  return {
    withIdentity: {
      email,
      subject: `user|${email}`,
      tokenIdentifier: `test|${email}`,
    },
  };
}

/**
 * Seed a second user in the same tenant.
 */
export async function seedSecondUser(
  t: TestConvex,
  tenantId: Id<"tenants">,
  options?: {
    name?: string;
    email?: string;
    role?: "athlete" | "coach" | "owner" | "admin";
  }
): Promise<SeedResult> {
  const name = options?.name ?? "Second User";
  const email = options?.email ?? "second@example.com";
  const role = options?.role ?? "athlete";

  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name,
      email,
    });

    const membershipId = await ctx.db.insert("memberships", {
      userId,
      tenantId,
      role,
      status: "active",
      isPrimaryGym: false,
      joinDate: new Date().toISOString().split("T")[0],
    });

    return { userId, tenantId, membershipId };
  });
}

/**
 * Seed a user in a completely different tenant (for isolation tests).
 */
export async function seedUserInDifferentTenant(
  t: TestConvex,
  options?: {
    name?: string;
    email?: string;
    tenantName?: string;
    tenantSlug?: string;
  }
): Promise<SeedResult> {
  return seedUserWithTenant(t, {
    name: options?.name ?? "Other User",
    email: options?.email ?? "other@example.com",
    tenantName: options?.tenantName ?? "Other Gym",
    tenantSlug: options?.tenantSlug ?? "other-gym",
    role: "athlete",
  });
}
