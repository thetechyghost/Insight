/**
 * Seed scenario definitions — typed data describing the desired test state.
 *
 * Each scenario defines the entities to create. The seed runner translates
 * these into API calls against the Convex deployment.
 */

export type Role = "athlete" | "coach" | "admin" | "owner";

export interface TenantSeed {
  key: string; // Lookup key (e.g., "cfAlpha")
  name: string;
  slug: string;
}

export interface UserSeed {
  key: string; // Lookup key (e.g., "alice")
  name: string;
  email: string;
}

export interface MembershipSeed {
  userKey: string; // References UserSeed.key
  tenantKey: string; // References TenantSeed.key
  role: Role;
  isPrimaryGym: boolean;
}

export type PlatformRole = "super_admin" | "platform_support" | "platform_ops";

export interface PlatformAdminSeed {
  userKey: string; // References UserSeed.key
  platformRole: PlatformRole;
}

export interface SeedScenario {
  tenants: TenantSeed[];
  users: UserSeed[];
  memberships: MembershipSeed[];
  platformAdmins?: PlatformAdminSeed[];
}

/**
 * Foundation scenario — covers auth, tenancy, RBAC, and multi-gym testing.
 *
 * Two tenants:
 * - CrossFit Alpha (primary gym, all role types)
 * - CrossFit Beta (isolation testing)
 *
 * Users:
 * - Alice: owner of cf-alpha
 * - Bob: coach at cf-alpha
 * - Carol: admin at cf-alpha
 * - Dave: athlete at cf-alpha
 * - Eve: athlete at cf-alpha (second athlete for peer tests)
 * - Frank: athlete at BOTH cf-alpha and cf-beta (multi-gym user)
 * - Grace: owner of cf-beta (isolated tenant)
 */
export function foundationScenario(prefix: string): SeedScenario {
  const p = prefix;
  return {
    tenants: [
      { key: "cfAlpha", name: "CrossFit Alpha", slug: `${p}-cf-alpha` },
      { key: "cfBeta", name: "CrossFit Beta", slug: `${p}-cf-beta` },
    ],
    users: [
      { key: "alice", name: "Alice Owner", email: `alice+${p}@test.insight.app` },
      { key: "bob", name: "Bob Coach", email: `bob+${p}@test.insight.app` },
      { key: "carol", name: "Carol Admin", email: `carol+${p}@test.insight.app` },
      { key: "dave", name: "Dave Athlete", email: `dave+${p}@test.insight.app` },
      { key: "eve", name: "Eve Athlete", email: `eve+${p}@test.insight.app` },
      { key: "frank", name: "Frank Multi", email: `frank+${p}@test.insight.app` },
      { key: "grace", name: "Grace Isolated", email: `grace+${p}@test.insight.app` },
    ],
    memberships: [
      { userKey: "alice", tenantKey: "cfAlpha", role: "owner", isPrimaryGym: true },
      { userKey: "bob", tenantKey: "cfAlpha", role: "coach", isPrimaryGym: true },
      { userKey: "carol", tenantKey: "cfAlpha", role: "admin", isPrimaryGym: true },
      { userKey: "dave", tenantKey: "cfAlpha", role: "athlete", isPrimaryGym: true },
      { userKey: "eve", tenantKey: "cfAlpha", role: "athlete", isPrimaryGym: true },
      { userKey: "frank", tenantKey: "cfAlpha", role: "athlete", isPrimaryGym: true },
      { userKey: "frank", tenantKey: "cfBeta", role: "athlete", isPrimaryGym: false },
      { userKey: "grace", tenantKey: "cfBeta", role: "owner", isPrimaryGym: true },
    ],
    platformAdmins: [
      { userKey: "alice", platformRole: "super_admin" },
    ],
  };
}
