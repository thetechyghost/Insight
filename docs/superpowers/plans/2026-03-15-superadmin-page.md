# Super Admin Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone super admin frontend app with auth, dashboard, and tenant management — backed by new platform-level Convex functions with strict authorization.

**Architecture:** Separate `apps/super-admin/` Vite + React 19 app using shadcn/ui (Base UI), TanStack Router/Table/Form, and Convex React hooks. Backend adds `platformQuery`/`platformMutation` wrappers checking a new `platform_admins` table, plus new modules for metrics, tenant ops, and notes. All mutations audit-logged.

**Tech Stack:** Convex, React 19, Vite, shadcn/ui (Base UI), TanStack Router/Table/Form/Pacer, Recharts, vitest + convex-test

**Spec:** `docs/superpowers/specs/2026-03-15-superadmin-page-design.md`

---

## File Map

### Backend (new files)
| File | Responsibility |
|------|---------------|
| `convex/lib/platformFunctions.ts` | `platformQuery`, `platformMutation`, `platformAction` wrappers |
| `convex/platformAdmins.ts` | `getMe` query, `updateLastLogin` internal mutation |
| `convex/platformMetrics.ts` | `getOverview`, `getGrowthTrends`, `getTenantHealthFlags` |
| `convex/platformTenants.ts` | `list`, `getById`, `create`, `suspend`, `reactivate` |
| `convex/platformTenantNotes.ts` | `listByTenant`, `create`, `update`, `remove` |

### Backend (modified files)
| File | Change |
|------|--------|
| `convex/schema.ts` | Add `platform_admins`, `platform_tenant_notes` tables; add `by_tenantId` index to `tenant_provisioning` |
| `convex/lib/validators.ts` | Add `platformRoleValidator` |

### Backend (test files)
| File | Covers |
|------|--------|
| `convex/platformAdmins.test.ts` | Auth enforcement, non-admin rejection, suspended rejection |
| `convex/platformTenants.test.ts` | CRUD, auth, slug uniqueness, audit log |
| `convex/platformMetrics.test.ts` | Aggregation accuracy, auth enforcement |
| `convex/platformTenantNotes.test.ts` | CRUD, auth, tenant scoping |

### Frontend (new app)
| File | Responsibility |
|------|---------------|
| `apps/super-admin/package.json` | Dependencies |
| `apps/super-admin/vite.config.ts` | Vite + TanStack Router plugin |
| `apps/super-admin/components.json` | shadcn Base UI config (Tailwind v4 uses @tailwindcss/vite — no tailwind.config needed) |
| `apps/super-admin/index.html` | HTML entry |
| `apps/super-admin/src/main.tsx` | React entry |
| `apps/super-admin/src/App.tsx` | Convex + TanStack providers |
| `apps/super-admin/src/lib/convex.ts` | Convex client |
| `apps/super-admin/src/lib/utils.ts` | `cn()` helper |
| `apps/super-admin/src/hooks/use-platform-admin.ts` | Auth context hook |
| `apps/super-admin/src/routes/__root.tsx` | Root layout |
| `apps/super-admin/src/routes/login.tsx` | Login page |
| `apps/super-admin/src/routes/_authenticated.tsx` | Auth guard + sidebar layout |
| `apps/super-admin/src/routes/_authenticated/dashboard.tsx` | Dashboard page |
| `apps/super-admin/src/routes/_authenticated/tenants/index.tsx` | Tenant list |
| `apps/super-admin/src/routes/_authenticated/tenants/$tenantId.tsx` | Tenant detail |
| `apps/super-admin/src/components/app-sidebar.tsx` | sidebar-07 adapted |
| `apps/super-admin/src/components/nav-main.tsx` | Grouped navigation |
| `apps/super-admin/src/components/nav-user.tsx` | User footer dropdown |
| `apps/super-admin/src/components/stat-card.tsx` | Reusable stat card |
| `apps/super-admin/src/components/tenant-create-sheet.tsx` | New tenant form |
| `apps/super-admin/src/components/tenant-table/columns.tsx` | Column defs |
| `apps/super-admin/src/components/tenant-table/data-table.tsx` | Table component |

---

## Chunk 1: Backend — Schema, Auth Wrappers, and Platform Admins

### Task 1: Schema Changes

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/lib/validators.ts`

- [ ] **Step 1: Add `platform_admins` table to schema**

In `convex/schema.ts`, after the `age_verification` table (end of B12 section), add:

```typescript
  platform_admins: defineTable({
    userId: v.id("users"),
    platformRole: v.union(
      v.literal("super_admin"),
      v.literal("platform_support"),
      v.literal("platform_ops")
    ),
    status: v.union(v.literal("active"), v.literal("suspended")),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"]),
```

- [ ] **Step 2: Add `platform_tenant_notes` table to schema**

In `convex/schema.ts`, directly after `platform_admins`:

```typescript
  platform_tenant_notes: defineTable({
    tenantId: v.id("tenants"),
    authorId: v.id("users"),
    content: v.string(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"]),
```

- [ ] **Step 3: Add `by_tenantId` index to `tenant_provisioning`**

In `convex/schema.ts`, find the `tenant_provisioning` table definition and add the index:

```typescript
  tenant_provisioning: defineTable({
    // ... existing fields unchanged ...
  })
    .index("by_status", ["status"])
    .index("by_tenantId", ["tenantId"]),  // ADD THIS LINE
```

- [ ] **Step 4: Add platform role validator to validators.ts**

In `convex/lib/validators.ts`, after `roleValidator`:

```typescript
export const platformRoleValidator = v.union(
  v.literal("super_admin"),
  v.literal("platform_support"),
  v.literal("platform_ops")
);

export const platformAdminStatusValidator = v.union(
  v.literal("active"),
  v.literal("suspended")
);
```

- [ ] **Step 5: Verify schema compiles**

Run: `npx convex dev --once --typecheck disable 2>&1 | head -20`
Expected: No schema errors.

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/lib/validators.ts
git commit -m "feat: add platform_admins and platform_tenant_notes schema tables"
```

---

### Task 2: Platform Auth Wrappers

**Files:**
- Create: `convex/lib/platformFunctions.ts`

- [ ] **Step 1: Create platformFunctions.ts**

```typescript
import {
  customQuery,
  customMutation,
  customAction,
} from "convex-helpers/server/customFunctions";
import { query, mutation, action } from "../_generated/server";
import { getUserFromAuth, getIdentityFromAuth } from "./auth";
import { ConvexError } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";

export type PlatformAdminCtx = {
  user: Doc<"users">;
  userId: Id<"users">;
  platformAdmin: Doc<"platform_admins">;
  platformRole: Doc<"platform_admins">["platformRole"];
};

// ============================================================================
// platformQuery — requires authentication + active platform_admins record
// ============================================================================

export const platformQuery = customQuery(query, {
  args: {},
  input: async (ctx, _args) => {
    const { userId, user } = await getUserFromAuth(ctx);
    const platformAdmin = await ctx.db
      .query("platform_admins")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!platformAdmin || platformAdmin.status !== "active") {
      throw new ConvexError("Unauthorized");
    }
    return {
      ctx: { user, userId, platformAdmin, platformRole: platformAdmin.platformRole },
      args: {},
    };
  },
});

// ============================================================================
// platformMutation — requires authentication + active platform_admins record
// ============================================================================

export const platformMutation = customMutation(mutation, {
  args: {},
  input: async (ctx, _args) => {
    const { userId, user } = await getUserFromAuth(ctx);
    const platformAdmin = await ctx.db
      .query("platform_admins")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!platformAdmin || platformAdmin.status !== "active") {
      throw new ConvexError("Unauthorized");
    }
    return {
      ctx: { user, userId, platformAdmin, platformRole: platformAdmin.platformRole },
      args: {},
    };
  },
});

// ============================================================================
// platformAction — requires authentication + identity for external API calls
// NOTE: Actions cannot access ctx.db, so we cannot verify platform_admins here.
// Any platformAction handler that needs admin verification must call a query
// internally. This matches the tenantAction pattern in customFunctions.ts.
// ============================================================================

export const platformAction = customAction(action, {
  args: {},
  input: async (ctx, _args) => {
    const identity = await getIdentityFromAuth(ctx);
    return {
      ctx: { identity },
      args: {},
    };
  },
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx convex dev --once --typecheck disable 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add convex/lib/platformFunctions.ts
git commit -m "feat: add platformQuery/platformMutation/platformAction auth wrappers"
```

---

### Task 3: Platform Admins Module + Tests

**Files:**
- Create: `convex/platformAdmins.ts`
- Create: `convex/platformAdmins.test.ts`

- [ ] **Step 1: Write failing tests for platformAdmins**

Create `convex/platformAdmins.test.ts`:

```typescript
import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/** Helper: seed a user and make them a platform admin */
async function seedPlatformAdmin(
  t: ReturnType<typeof convexTest>,
  options?: {
    email?: string;
    name?: string;
    platformRole?: "super_admin" | "platform_support" | "platform_ops";
    status?: "active" | "suspended";
  }
) {
  const email = options?.email ?? "admin@platform.com";
  const name = options?.name ?? "Platform Admin";
  const platformRole = options?.platformRole ?? "super_admin";
  const status = options?.status ?? "active";

  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name, email });
    const platformAdminId = await ctx.db.insert("platform_admins", {
      userId,
      platformRole,
      status,
    });
    return { userId, platformAdminId };
  });
}

describe("platformAdmins", () => {
  test("getMe returns platform admin for active admin", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.query(api.platformAdmins.getMe, {});

    expect(result).not.toBeNull();
    expect(result!.platformRole).toBe("super_admin");
    expect(result!.status).toBe("active");
  });

  test("getMe rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.platformAdmins.getMe, {})).rejects.toThrow("Not authenticated");
  });

  test("getMe rejects non-admin user", async () => {
    const t = convexTest(schema);
    // Create a regular user (not in platform_admins)
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Regular", email: "regular@test.com" });
    });

    const asRegular = t.withIdentity({ email: "regular@test.com", subject: "user|regular" });
    await expect(asRegular.query(api.platformAdmins.getMe, {})).rejects.toThrow("Unauthorized");
  });

  test("getMe rejects suspended admin", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t, { status: "suspended" });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(asAdmin.query(api.platformAdmins.getMe, {})).rejects.toThrow("Unauthorized");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/platformAdmins.test.ts 2>&1 | tail -20`
Expected: FAIL — `api.platformAdmins` does not exist.

- [ ] **Step 3: Implement platformAdmins.ts**

Create `convex/platformAdmins.ts`:

```typescript
import { v } from "convex/values";
import { platformQuery } from "./lib/platformFunctions";
import { internalMutation } from "./_generated/server";

const platformAdminDoc = v.object({
  _id: v.id("platform_admins"),
  _creationTime: v.number(),
  userId: v.id("users"),
  platformRole: v.union(
    v.literal("super_admin"),
    v.literal("platform_support"),
    v.literal("platform_ops")
  ),
  status: v.union(v.literal("active"), v.literal("suspended")),
  lastLoginAt: v.optional(v.number()),
});

// ============================================================================
// getMe — return the current user's platform admin record
// ============================================================================

export const getMe = platformQuery({
  args: {},
  returns: platformAdminDoc,
  handler: async (ctx, _args) => {
    // platformQuery already verified the admin exists and is active
    return ctx.platformAdmin;
  },
});

// ============================================================================
// updateLastLogin — internal mutation to track last login time
// ============================================================================

export const updateLastLogin = internalMutation({
  args: { platformAdminId: v.id("platform_admins") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.platformAdminId, { lastLoginAt: Date.now() });
    return null;
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/platformAdmins.test.ts 2>&1 | tail -20`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add convex/platformAdmins.ts convex/platformAdmins.test.ts
git commit -m "feat: add platformAdmins module with getMe query and auth tests"
```

---

### Task 4: Platform Tenants Module + Tests

**Files:**
- Create: `convex/platformTenants.ts`
- Create: `convex/platformTenants.test.ts`

- [ ] **Step 1: Write failing tests for platformTenants**

Create `convex/platformTenants.test.ts`:

```typescript
import { expect, test, describe, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

/** Reusable helper: seed a platform admin */
async function seedPlatformAdmin(t: ReturnType<typeof convexTest>, options?: { email?: string }) {
  const email = options?.email ?? "admin@platform.com";
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Platform Admin", email });
    const platformAdminId = await ctx.db.insert("platform_admins", {
      userId,
      platformRole: "super_admin" as const,
      status: "active" as const,
    });
    return { userId, platformAdminId };
  });
}

/** Seed a tenant with provisioning record */
async function seedTenantWithProvisioning(
  t: ReturnType<typeof convexTest>,
  requestedBy: any,
  options?: { name?: string; slug?: string; status?: "pending" | "approved" | "active" | "suspended" }
) {
  return await t.run(async (ctx) => {
    const tenantId = await ctx.db.insert("tenants", {
      name: options?.name ?? "Test Gym",
      slug: options?.slug ?? "test-gym",
    });
    const provisioningId = await ctx.db.insert("tenant_provisioning", {
      requestedBy,
      tenantId,
      status: options?.status ?? "active",
    });
    return { tenantId, provisioningId };
  });
}

describe("platformTenants", () => {
  test("list returns tenants with member counts", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);
    const { tenantId } = await seedTenantWithProvisioning(t, userId);

    // Add some members
    await t.run(async (ctx) => {
      const memberId = await ctx.db.insert("users", { name: "Member", email: "m@test.com" });
      await ctx.db.insert("memberships", {
        userId: memberId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2025-01-01",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.query(api.platformTenants.list, {});

    expect(result.tenants).toHaveLength(1);
    expect(result.tenants[0].name).toBe("Test Gym");
    expect(result.tenants[0].memberCount).toBe(1);
    expect(result.tenants[0].provisioningStatus).toBe("active");
  });

  test("list rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.platformTenants.list, {})).rejects.toThrow("Not authenticated");
  });

  test("list rejects non-admin user", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Regular", email: "regular@test.com" });
    });
    const asRegular = t.withIdentity({ email: "regular@test.com", subject: "user|regular" });
    await expect(asRegular.query(api.platformTenants.list, {})).rejects.toThrow("Unauthorized");
  });

  test("getById returns tenant details with provisioning status", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);
    const { tenantId } = await seedTenantWithProvisioning(t, userId);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.query(api.platformTenants.getById, { tenantId });

    expect(result.tenant.name).toBe("Test Gym");
    expect(result.provisioningStatus).toBe("active");
  });

  test("create creates tenant, provisioning record, and owner membership", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    // Seed the owner user
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Owner", email: "owner@gym.com" });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.mutation(api.platformTenants.create, {
      name: "New Gym",
      slug: "new-gym",
      ownerEmail: "owner@gym.com",
      timezone: "Europe/Oslo",
    });

    expect(result.tenantId).toBeDefined();

    // Verify tenant exists
    const tenant = await t.run(async (ctx) => ctx.db.get(result.tenantId));
    expect(tenant!.name).toBe("New Gym");
    expect(tenant!.slug).toBe("new-gym");
    expect(tenant!.timezone).toBe("Europe/Oslo");

    // Verify provisioning record
    const provisioning = await t.run(async (ctx) => {
      return await ctx.db
        .query("tenant_provisioning")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", result.tenantId))
        .unique();
    });
    expect(provisioning!.status).toBe("active");

    // Verify owner membership
    const membership = await t.run(async (ctx) => {
      return await ctx.db
        .query("memberships")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", result.tenantId))
        .first();
    });
    expect(membership!.role).toBe("owner");
    expect(membership!.status).toBe("active");
  });

  test("create rejects duplicate slug", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);
    await seedTenantWithProvisioning(t, userId, { slug: "taken-slug" });

    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Owner", email: "owner@gym.com" });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.platformTenants.create, {
        name: "Another Gym", slug: "taken-slug", ownerEmail: "owner@gym.com", timezone: "UTC",
      })
    ).rejects.toThrow("slug already in use");
  });

  test("suspend updates provisioning status and logs to audit", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);
    const { tenantId, provisioningId } = await seedTenantWithProvisioning(t, userId);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformTenants.suspend, {
      tenantId,
      reason: "Payment overdue",
    });

    // Verify status changed
    const prov = await t.run(async (ctx) => ctx.db.get(provisioningId));
    expect(prov!.status).toBe("suspended");

    // Verify audit log entry (scheduled — run scheduler)
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const auditEntries = await t.run(async (ctx) =>
      ctx.db.query("platform_audit_log").collect()
    );
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0].action).toBe("tenant.suspended");
  });

  test("reactivate updates provisioning status", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);
    const { tenantId } = await seedTenantWithProvisioning(t, userId, { status: "suspended" });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformTenants.reactivate, {
      tenantId,
      reason: "Payment resolved",
    });

    const prov = await t.run(async (ctx) => {
      return await ctx.db
        .query("tenant_provisioning")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
        .unique();
    });
    expect(prov!.status).toBe("active");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/platformTenants.test.ts 2>&1 | tail -20`
Expected: FAIL — `api.platformTenants` does not exist.

- [ ] **Step 3: Implement platformTenants.ts**

Create `convex/platformTenants.ts`:

```typescript
import { v, ConvexError } from "convex/values";
import { platformQuery, platformMutation } from "./lib/platformFunctions";
import { internal } from "./_generated/api";

// ============================================================================
// list — paginated list of all tenants with member counts and provisioning status
// ============================================================================

export const list = platformQuery({
  args: {
    status: v.optional(v.union(
      v.literal("pending"), v.literal("approved"), v.literal("active"), v.literal("suspended")
    )),
    search: v.optional(v.string()),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    tenants: v.array(v.object({
      _id: v.id("tenants"),
      name: v.string(),
      slug: v.string(),
      branding: v.optional(v.any()),
      timezone: v.optional(v.string()),
      _creationTime: v.number(),
      memberCount: v.number(),
      provisioningStatus: v.union(
        v.literal("pending"), v.literal("approved"), v.literal("active"), v.literal("suspended")
      ),
    })),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Get all tenants
    let tenantsQuery = ctx.db.query("tenants");
    const allTenants = await tenantsQuery.collect();

    // Enrich with member counts and provisioning status
    const enriched = await Promise.all(
      allTenants.map(async (tenant) => {
        const members = await ctx.db
          .query("memberships")
          .withIndex("by_tenantId_status", (q) => q.eq("tenantId", tenant._id).eq("status", "active"))
          .collect();

        const provisioning = await ctx.db
          .query("tenant_provisioning")
          .withIndex("by_tenantId", (q) => q.eq("tenantId", tenant._id))
          .first();

        return {
          _id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          branding: tenant.branding,
          timezone: tenant.timezone,
          _creationTime: tenant._creationTime,
          memberCount: members.length,
          provisioningStatus: (provisioning?.status ?? "pending") as "pending" | "approved" | "active" | "suspended",
        };
      })
    );

    // Apply filters
    let filtered = enriched;
    if (args.status) {
      filtered = filtered.filter((t) => t.provisioningStatus === args.status);
    }
    if (args.search) {
      const search = args.search.toLowerCase();
      filtered = filtered.filter(
        (t) => t.name.toLowerCase().includes(search) || t.slug.toLowerCase().includes(search)
      );
    }

    // Sort by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    // Simple offset-based pagination
    const startIdx = args.cursor ? parseInt(args.cursor, 10) : 0;
    const page = filtered.slice(startIdx, startIdx + limit);
    const nextCursor = startIdx + limit < filtered.length ? String(startIdx + limit) : undefined;

    return { tenants: page, nextCursor };
  },
});

// ============================================================================
// getById — single tenant with full details + provisioning status
// ============================================================================

export const getById = platformQuery({
  args: { tenantId: v.id("tenants") },
  returns: v.object({
    tenant: v.any(),
    provisioningStatus: v.union(
      v.literal("pending"), v.literal("approved"), v.literal("active"), v.literal("suspended")
    ),
    memberCount: v.number(),
    ownerInfo: v.optional(v.object({
      name: v.string(),
      email: v.string(),
    })),
  }),
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new ConvexError("Tenant not found");

    const provisioning = await ctx.db
      .query("tenant_provisioning")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    const members = await ctx.db
      .query("memberships")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Find owner
    const ownerMembership = members.find((m) => m.role === "owner");
    let ownerInfo: { name: string; email: string } | undefined;
    if (ownerMembership) {
      const owner = await ctx.db.get(ownerMembership.userId);
      if (owner) {
        ownerInfo = { name: owner.name, email: owner.email };
      }
    }

    return {
      tenant,
      provisioningStatus: (provisioning?.status ?? "pending") as "pending" | "approved" | "active" | "suspended",
      memberCount: members.length,
      ownerInfo,
    };
  },
});

// ============================================================================
// create — create a new tenant with provisioning record + owner membership
// ============================================================================

export const create = platformMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    ownerEmail: v.string(),
    timezone: v.string(),
  },
  returns: v.object({ tenantId: v.id("tenants") }),
  handler: async (ctx, args) => {
    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(args.slug)) {
      throw new ConvexError("Slug must contain only lowercase letters, numbers, and hyphens");
    }
    if (args.slug.length < 2 || args.slug.length > 100) {
      throw new ConvexError("Slug must be 2-100 characters");
    }

    // Check slug uniqueness (explicit check — Convex indexes don't enforce uniqueness)
    const existingTenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existingTenant) {
      throw new ConvexError("A tenant with this slug already in use");
    }

    // Find or validate owner
    const owner = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.ownerEmail))
      .unique();
    if (!owner) {
      throw new ConvexError("Owner email not found. User must register first.");
    }

    // Create tenant
    const tenantId = await ctx.db.insert("tenants", {
      name: args.name,
      slug: args.slug,
      timezone: args.timezone,
    });

    // Create provisioning record
    await ctx.db.insert("tenant_provisioning", {
      requestedBy: owner._id,
      tenantId,
      status: "active",
    });

    // Create owner membership
    await ctx.db.insert("memberships", {
      userId: owner._id,
      tenantId,
      role: "owner",
      status: "active",
      isPrimaryGym: true,
      joinDate: new Date().toISOString().split("T")[0],
    });

    // Audit log
    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "tenant.created",
      targetEntity: "tenants",
      targetId: tenantId as string,
      afterValue: { name: args.name, slug: args.slug, ownerEmail: args.ownerEmail },
    });

    return { tenantId };
  },
});

// ============================================================================
// suspend — suspend a tenant via tenant_provisioning
// ============================================================================

export const suspend = platformMutation({
  args: {
    tenantId: v.id("tenants"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.reason.trim()) {
      throw new ConvexError("Reason is required for suspension");
    }

    const provisioning = await ctx.db
      .query("tenant_provisioning")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
    if (!provisioning) throw new ConvexError("Tenant provisioning record not found");

    await ctx.db.patch(provisioning._id, { status: "suspended" });

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "tenant.suspended",
      targetEntity: "tenants",
      targetId: args.tenantId,
      afterValue: { reason: args.reason },
    });

    return null;
  },
});

// ============================================================================
// reactivate — reactivate a suspended tenant
// ============================================================================

export const reactivate = platformMutation({
  args: {
    tenantId: v.id("tenants"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const provisioning = await ctx.db
      .query("tenant_provisioning")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
    if (!provisioning) throw new ConvexError("Tenant provisioning record not found");
    if (provisioning.status !== "suspended") {
      throw new ConvexError("Only suspended tenants can be reactivated");
    }

    await ctx.db.patch(provisioning._id, { status: "active" });

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "tenant.reactivated",
      targetEntity: "tenants",
      targetId: args.tenantId,
      afterValue: { reason: args.reason },
    });

    return null;
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/platformTenants.test.ts 2>&1 | tail -30`
Expected: All 7 tests PASS.

- [ ] **Step 5: Fix any failing tests, then commit**

```bash
git add convex/platformTenants.ts convex/platformTenants.test.ts
git commit -m "feat: add platformTenants module with CRUD, suspend/reactivate, and tests"
```

---

### Task 5: Platform Metrics Module + Tests

**Files:**
- Create: `convex/platformMetrics.ts`
- Create: `convex/platformMetrics.test.ts`

- [ ] **Step 1: Write failing tests**

Create `convex/platformMetrics.test.ts`:

```typescript
import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlatformAdmin(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@platform.com" });
    await ctx.db.insert("platform_admins", {
      userId, platformRole: "super_admin" as const, status: "active" as const,
    });
    return { userId };
  });
}

describe("platformMetrics", () => {
  test("getOverview returns aggregate counts", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    // Seed some data
    await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "Gym A", slug: "gym-a" });
      const memberId = await ctx.db.insert("users", { name: "Athlete", email: "a@test.com" });
      await ctx.db.insert("memberships", {
        userId: memberId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2025-01-01",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const overview = await asAdmin.query(api.platformMetrics.getOverview, {});

    expect(overview.totalTenants).toBe(1);
    expect(overview.totalUsers).toBeGreaterThanOrEqual(2); // admin + athlete
    expect(overview.activeToday).toBeGreaterThanOrEqual(0);
  });

  test("getOverview rejects non-admin", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Regular", email: "regular@test.com" });
    });
    const asRegular = t.withIdentity({ email: "regular@test.com", subject: "user|regular" });
    await expect(asRegular.query(api.platformMetrics.getOverview, {})).rejects.toThrow("Unauthorized");
  });

  test("getTenantHealthFlags returns flagged tenants", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "Suspended Gym", slug: "suspended" });
      await ctx.db.insert("tenant_provisioning", {
        requestedBy: userId, tenantId, status: "suspended",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const flags = await asAdmin.query(api.platformMetrics.getTenantHealthFlags, {});

    expect(flags).toHaveLength(1);
    expect(flags[0].issue).toBe("suspended");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/platformMetrics.test.ts 2>&1 | tail -20`
Expected: FAIL.

- [ ] **Step 3: Implement platformMetrics.ts**

Create `convex/platformMetrics.ts`:

```typescript
import { v } from "convex/values";
import { platformQuery } from "./lib/platformFunctions";

// ============================================================================
// getOverview — aggregate platform stats
// ============================================================================

export const getOverview = platformQuery({
  args: {},
  returns: v.object({
    totalTenants: v.number(),
    totalUsers: v.number(),
    totalWorkoutLogsThisMonth: v.number(),
    activeToday: v.number(),
  }),
  handler: async (ctx) => {
    const tenants = await ctx.db.query("tenants").collect();
    const users = await ctx.db.query("users").collect();

    // Workout logs this month
    const now = Date.now();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthStart = startOfMonth.getTime();

    const workoutLogs = await ctx.db.query("workout_logs").collect();
    const thisMonthLogs = workoutLogs.filter((w) => w._creationTime >= monthStart);

    // Active today — users with login_success in last 24h
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentLogins = await ctx.db
      .query("security_events")
      .withIndex("by_eventType", (q) => q.eq("eventType", "login_success"))
      .collect();
    const todayLogins = recentLogins.filter((e) => e.timestamp >= oneDayAgo);
    const uniqueActiveUsers = new Set(todayLogins.map((e) => e.userId).filter(Boolean));

    return {
      totalTenants: tenants.length,
      totalUsers: users.length,
      totalWorkoutLogsThisMonth: thisMonthLogs.length,
      activeToday: uniqueActiveUsers.size,
    };
  },
});

// ============================================================================
// getGrowthTrends — new tenants and users per month (last 12 months)
// ============================================================================

export const getGrowthTrends = platformQuery({
  args: {},
  returns: v.array(v.object({
    month: v.string(),
    newTenants: v.number(),
    newUsers: v.number(),
  })),
  handler: async (ctx) => {
    const now = new Date();
    const months: { month: string; start: number; end: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      months.push({
        month: d.toISOString().slice(0, 7), // YYYY-MM
        start,
        end,
      });
    }

    const tenants = await ctx.db.query("tenants").collect();
    const users = await ctx.db.query("users").collect();

    return months.map(({ month, start, end }) => ({
      month,
      newTenants: tenants.filter((t) => t._creationTime >= start && t._creationTime < end).length,
      newUsers: users.filter((u) => u._creationTime >= start && u._creationTime < end).length,
    }));
  },
});

// ============================================================================
// getTenantHealthFlags — tenants with issues (suspended, low activity)
// ============================================================================

export const getTenantHealthFlags = platformQuery({
  args: {},
  returns: v.array(v.object({
    tenantId: v.id("tenants"),
    tenantName: v.string(),
    issue: v.string(),
    since: v.number(),
  })),
  handler: async (ctx) => {
    const flags: { tenantId: any; tenantName: string; issue: string; since: number }[] = [];

    // Suspended tenants
    const suspendedProvisionings = await ctx.db
      .query("tenant_provisioning")
      .withIndex("by_status", (q) => q.eq("status", "suspended"))
      .collect();

    for (const prov of suspendedProvisionings) {
      if (!prov.tenantId) continue;
      const tenant = await ctx.db.get(prov.tenantId);
      if (tenant) {
        flags.push({
          tenantId: prov.tenantId,
          tenantName: tenant.name,
          issue: "suspended",
          since: prov._creationTime,
        });
      }
    }

    return flags;
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/platformMetrics.test.ts 2>&1 | tail -20`
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add convex/platformMetrics.ts convex/platformMetrics.test.ts
git commit -m "feat: add platformMetrics module with overview, growth trends, and health flags"
```

---

### Task 6: Platform Tenant Notes Module + Tests

**Files:**
- Create: `convex/platformTenantNotes.ts`
- Create: `convex/platformTenantNotes.test.ts`

- [ ] **Step 1: Write failing tests**

Create `convex/platformTenantNotes.test.ts`:

```typescript
import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlatformAdmin(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@platform.com" });
    await ctx.db.insert("platform_admins", {
      userId, platformRole: "super_admin" as const, status: "active" as const,
    });
    const tenantId = await ctx.db.insert("tenants", { name: "Test Gym", slug: "test-gym" });
    return { userId, tenantId };
  });
}

describe("platformTenantNotes", () => {
  test("create adds a note and listByTenant returns it", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const noteId = await asAdmin.mutation(api.platformTenantNotes.create, {
      tenantId,
      content: "Initial setup complete",
    });

    expect(noteId).toBeDefined();

    const notes = await asAdmin.query(api.platformTenantNotes.listByTenant, { tenantId });
    expect(notes).toHaveLength(1);
    expect(notes[0].content).toBe("Initial setup complete");
  });

  test("update modifies note content", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const noteId = await asAdmin.mutation(api.platformTenantNotes.create, {
      tenantId, content: "Draft",
    });

    await asAdmin.mutation(api.platformTenantNotes.update, {
      noteId, content: "Updated content",
    });

    const notes = await asAdmin.query(api.platformTenantNotes.listByTenant, { tenantId });
    expect(notes[0].content).toBe("Updated content");
    expect(notes[0].updatedAt).toBeDefined();
  });

  test("remove deletes a note", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const noteId = await asAdmin.mutation(api.platformTenantNotes.create, {
      tenantId, content: "To delete",
    });

    await asAdmin.mutation(api.platformTenantNotes.remove, { noteId });

    const notes = await asAdmin.query(api.platformTenantNotes.listByTenant, { tenantId });
    expect(notes).toHaveLength(0);
  });

  test("rejects non-admin", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Regular", email: "regular@test.com" });
      await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
    });
    const asRegular = t.withIdentity({ email: "regular@test.com", subject: "user|regular" });
    await expect(
      asRegular.query(api.platformTenantNotes.listByTenant, { tenantId: "invalid" as any })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/platformTenantNotes.test.ts 2>&1 | tail -20`
Expected: FAIL.

- [ ] **Step 3: Implement platformTenantNotes.ts**

Create `convex/platformTenantNotes.ts`:

```typescript
import { v, ConvexError } from "convex/values";
import { platformQuery, platformMutation } from "./lib/platformFunctions";

const noteDoc = v.object({
  _id: v.id("platform_tenant_notes"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  authorId: v.id("users"),
  content: v.string(),
  updatedAt: v.optional(v.number()),
});

// ============================================================================
// listByTenant — list notes for a tenant
// ============================================================================

export const listByTenant = platformQuery({
  args: { tenantId: v.id("tenants") },
  returns: v.array(noteDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("platform_tenant_notes")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();
  },
});

// ============================================================================
// create — add a new note
// ============================================================================

export const create = platformMutation({
  args: {
    tenantId: v.id("tenants"),
    content: v.string(),
  },
  returns: v.id("platform_tenant_notes"),
  handler: async (ctx, args) => {
    if (!args.content.trim()) {
      throw new ConvexError("Note content cannot be empty");
    }
    return await ctx.db.insert("platform_tenant_notes", {
      tenantId: args.tenantId,
      authorId: ctx.userId,
      content: args.content,
    });
  },
});

// ============================================================================
// update — update note content
// ============================================================================

export const update = platformMutation({
  args: {
    noteId: v.id("platform_tenant_notes"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new ConvexError("Note not found");
    await ctx.db.patch(args.noteId, {
      content: args.content,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ============================================================================
// remove — delete a note
// ============================================================================

export const remove = platformMutation({
  args: { noteId: v.id("platform_tenant_notes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new ConvexError("Note not found");
    await ctx.db.delete(args.noteId);
    return null;
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/platformTenantNotes.test.ts 2>&1 | tail -20`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add convex/platformTenantNotes.ts convex/platformTenantNotes.test.ts
git commit -m "feat: add platformTenantNotes module with CRUD and tests"
```

---

### Task 7: Run Full Backend Test Suite

- [ ] **Step 1: Run all tests to verify no regressions**

Run: `npx vitest run 2>&1 | tail -30`
Expected: All existing tests + new tests PASS. Zero failures.

- [ ] **Step 2: If any failures, fix them before proceeding**

- [ ] **Step 3: Commit any fixes**

```bash
git add -u
git commit -m "fix: resolve test regressions from platform admin schema changes"
```

---

## Chunk 2: Frontend — App Shell, Auth, Dashboard, and Tenant Management

### Task 8: Scaffold the Super Admin App

**Files:**
- Create: `apps/super-admin/package.json`
- Create: `apps/super-admin/index.html`
- Create: `apps/super-admin/vite.config.ts`
- Create: `apps/super-admin/tsconfig.json`
- Create: `apps/super-admin/src/main.tsx`
- Create: `apps/super-admin/src/App.tsx`
- Create: `apps/super-admin/src/lib/convex.ts`
- Create: `apps/super-admin/src/lib/utils.ts`
- Create: `apps/super-admin/src/app.css`

- [ ] **Step 1: Create apps/super-admin directory and package.json**

```bash
mkdir -p apps/super-admin/src/{routes,components,hooks,lib}
```

Create `apps/super-admin/package.json`:

```json
{
  "name": "@insight/super-admin",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd apps/super-admin && npm install react@19 react-dom@19 convex @tanstack/react-router @tanstack/react-query @tanstack/react-table @tanstack/react-form @tanstack/react-pacer recharts clsx tailwind-merge class-variance-authority lucide-react
```

```bash
npm install -D typescript @types/react @types/react-dom vite @vitejs/plugin-react tailwindcss @tailwindcss/vite @tanstack/router-plugin
```

- [ ] **Step 3: Initialize shadcn with Base UI preset**

```bash
cd apps/super-admin && npx shadcn@latest init --base base --preset a2fC --yes
```

This generates `components.json`, base CSS variables, and sets up the shadcn registry.

- [ ] **Step 4: Add required shadcn components**

```bash
cd apps/super-admin && npx shadcn@latest add sidebar breadcrumb separator collapsible dropdown-menu avatar button card input label select sheet tabs table badge dialog textarea tooltip
```

- [ ] **Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "convex": path.resolve(__dirname, "../../convex"),
    },
  },
  server: {
    port: 5174,
  },
});
```

- [ ] **Step 6: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"],
      "convex/*": ["../../convex/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Platform Admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create src/lib/convex.ts**

```typescript
import { ConvexReactClient } from "convex/react";

export const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string
);
```

- [ ] **Step 9: Create src/lib/utils.ts**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 10: Create src/main.tsx and src/App.tsx**

`src/main.tsx`:

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

`src/App.tsx`:

```typescript
import { ConvexProvider } from "convex/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { convex } from "./lib/convex";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient();
const router = createRouter({
  routeTree,
  context: { convex, queryClient },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <ConvexProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ConvexProvider>
  );
}
```

- [ ] **Step 11: Create src/app.css**

```css
@import "tailwindcss";
```

Note: shadcn init may have already created this file with theme variables. If so, keep the shadcn-generated version and ensure it includes `@import "tailwindcss"`.

- [ ] **Step 12: Verify the app starts**

```bash
cd apps/super-admin && VITE_CONVEX_URL=https://placeholder.convex.cloud npm run dev -- --host 2>&1 | head -10
```

Expected: Vite dev server starts on port 5174 (it will show connection errors since the Convex URL is a placeholder — that's expected).

- [ ] **Step 13: Commit**

```bash
git add apps/super-admin/
git commit -m "feat: scaffold super-admin app with Vite, React 19, shadcn Base UI, TanStack"
```

---

### Task 9: Auth Guard and Login Page

**Files:**
- Create: `apps/super-admin/src/routes/__root.tsx`
- Create: `apps/super-admin/src/routes/login.tsx`
- Create: `apps/super-admin/src/routes/_authenticated.tsx`
- Create: `apps/super-admin/src/hooks/use-platform-admin.ts`

- [ ] **Step 1: Create the root route**

`src/routes/__root.tsx`:

```typescript
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { ConvexReactClient } from "convex/react";
import type { QueryClient } from "@tanstack/react-query";

interface RouterContext {
  convex: ConvexReactClient;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});
```

- [ ] **Step 2: Create the login page**

`src/routes/login.tsx`:

```typescript
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // DEFERRED: Convex Auth signIn integration — will be wired when auth provider
      // is configured for the super admin app. For now, navigates to test protected routes.
      navigate({ to: "/dashboard" });
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

Note: Login page is intentionally generic — shows no indication of "super admin" or "platform" branding. The Convex Auth integration (`signIn` call) will be wired up when the auth provider is configured. The current implementation lets you navigate to test the protected routes.

- [ ] **Step 3: Create the authenticated layout with sidebar**

`src/routes/_authenticated.tsx`:

```typescript
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";

export const Route = createFileRoute("/_authenticated")({
  // When Convex Auth is wired up, uncomment this:
  // beforeLoad: async ({ context }) => {
  //   const admin = await context.convex.query(api.platformAdmins.getMe);
  //   if (!admin) throw redirect({ to: "/login" });
  //   return { platformAdmin: admin };
  // },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 4: Create the platform admin hook**

`src/hooks/use-platform-admin.ts`:

```typescript
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";

export function usePlatformAdmin() {
  const admin = useQuery(api.platformAdmins.getMe);
  return admin;
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/super-admin/src/routes/ apps/super-admin/src/hooks/
git commit -m "feat: add auth guard, login page, and authenticated layout shell"
```

---

### Task 10: Sidebar Navigation (sidebar-07 adapted)

**Files:**
- Create: `apps/super-admin/src/components/app-sidebar.tsx`
- Create: `apps/super-admin/src/components/nav-main.tsx`
- Create: `apps/super-admin/src/components/nav-user.tsx`

- [ ] **Step 1: Create nav-main.tsx (grouped navigation)**

```typescript
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export function NavMain({ groups }: { groups: NavGroup[] }) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => (
              <SidebarMenuItem key={item.title}>
                {item.disabled ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton className="opacity-40 cursor-not-allowed">
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">Coming soon</TooltipContent>
                  </Tooltip>
                ) : (
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath.startsWith(item.url)}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
```

- [ ] **Step 2: Create nav-user.tsx (user footer)**

```typescript
import { ChevronsUpDown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavUserProps {
  name: string;
  email: string;
}

export function NavUser({ name, email }: NavUserProps) {
  const { isMobile } = useSidebar();
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{name}</span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel>{name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
```

- [ ] **Step 3: Create app-sidebar.tsx**

```typescript
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Settings,
  ScrollText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavMain, type NavGroup } from "./nav-main";
import { NavUser } from "./nav-user";

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Tenants", url: "/tenants", icon: Building2 },
      { title: "Billing", url: "/billing", icon: CreditCard, disabled: true },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings", url: "/settings", icon: Settings, disabled: true },
      { title: "Audit Log", url: "/audit-log", icon: ScrollText, disabled: true },
    ],
  },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  // DEFERRED: Replace with usePlatformAdmin() hook when Convex Auth is configured
  const user = { name: "Platform Admin", email: "admin@insight.com" };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            I
          </div>
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Platform Admin
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={navGroups} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser name={user.name} email={user.email} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
```

- [ ] **Step 4: Verify sidebar renders in the app**

Run the dev server and navigate to `/dashboard` — the sidebar should render with grouped navigation.

- [ ] **Step 5: Commit**

```bash
git add apps/super-admin/src/components/
git commit -m "feat: add sidebar-07 navigation with grouped nav, user menu, and collapsible icons"
```

---

### Task 11: Dashboard Page

**Files:**
- Create: `apps/super-admin/src/components/stat-card.tsx`
- Create: `apps/super-admin/src/routes/_authenticated/dashboard.tsx`

- [ ] **Step 1: Create reusable StatCard component**

`src/components/stat-card.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: string; positive: boolean };
}

export function StatCard({ title, value, subtitle, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={`text-xs ${trend.positive ? "text-green-500" : "text-red-500"}`}>
            {trend.value}
          </p>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create dashboard page**

`src/routes/_authenticated/dashboard.tsx`:

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const overview = useQuery(api.platformMetrics.getOverview);
  const growth = useQuery(api.platformMetrics.getGrowthTrends);
  const healthFlags = useQuery(api.platformMetrics.getTenantHealthFlags);

  if (!overview) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of all tenants and platform health
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Tenants"
          value={overview.totalTenants}
        />
        <StatCard
          title="Total Users"
          value={overview.totalUsers}
        />
        <StatCard
          title="Workouts This Month"
          value={overview.totalWorkoutLogsThisMonth}
        />
        <StatCard
          title="Active Today"
          value={overview.activeToday}
        />
      </div>

      {/* Charts + System Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Tenant & User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {growth ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={growth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tickFormatter={(v) => v.slice(5)} // MM only
                  />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="newUsers"
                    stackId="1"
                    className="fill-primary/20 stroke-primary"
                  />
                  <Area
                    type="monotone"
                    dataKey="newTenants"
                    stackId="2"
                    className="fill-secondary/20 stroke-secondary"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Convex", status: "Operational" },
              { name: "Azure Functions", status: "Operational" },
              { name: "TimescaleDB", status: "Operational" },
              { name: "Event Hub", status: "Operational" },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{service.name}</span>
                <span className="flex items-center gap-1.5 text-green-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {service.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Tenant Health Flags */}
      {healthFlags && healthFlags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tenant Health Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthFlags.map((flag) => (
                <div
                  key={flag.tenantId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{flag.tenantName}</span>
                    <Badge variant={flag.issue === "suspended" ? "destructive" : "secondary"}>
                      {flag.issue}
                    </Badge>
                  </div>
                  <Link
                    to="/tenants/$tenantId"
                    params={{ tenantId: flag.tenantId }}
                    className="text-sm text-primary hover:underline"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify dashboard renders**

Run the dev server and navigate to `/dashboard`.

- [ ] **Step 4: Commit**

```bash
git add apps/super-admin/src/components/stat-card.tsx apps/super-admin/src/routes/_authenticated/dashboard.tsx
git commit -m "feat: add platform dashboard with stat cards, growth chart, system status, and health flags"
```

---

### Task 12: Tenant List Page

**Files:**
- Create: `apps/super-admin/src/components/tenant-table/columns.tsx`
- Create: `apps/super-admin/src/components/tenant-table/data-table.tsx`
- Create: `apps/super-admin/src/routes/_authenticated/tenants/index.tsx`
- Create: `apps/super-admin/src/components/tenant-create-sheet.tsx`

- [ ] **Step 1: Create TanStack Table column definitions**

`src/components/tenant-table/columns.tsx`:

```typescript
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";

type TenantRow = {
  _id: string;
  name: string;
  slug: string;
  _creationTime: number;
  memberCount: number;
  provisioningStatus: "pending" | "approved" | "active" | "suspended";
};

const columnHelper = createColumnHelper<TenantRow>();

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  pending: "secondary",
  approved: "outline",
  suspended: "destructive",
};

export const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => (
      <div>
        <div className="font-medium">{info.getValue()}</div>
        <div className="text-xs text-muted-foreground">{info.row.original.slug}</div>
      </div>
    ),
  }),
  columnHelper.accessor("provisioningStatus", {
    header: "Status",
    cell: (info) => (
      <Badge variant={statusVariant[info.getValue()] ?? "secondary"}>
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor("memberCount", {
    header: "Members",
  }),
  columnHelper.accessor("_creationTime", {
    header: "Created",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
  columnHelper.display({
    id: "actions",
    cell: (info) => (
      <Link
        to="/tenants/$tenantId"
        params={{ tenantId: info.row.original._id }}
        className="text-sm text-primary hover:underline"
      >
        View
      </Link>
    ),
  }),
];
```

- [ ] **Step 2: Create data-table component**

`src/components/tenant-table/data-table.tsx`:

```typescript
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { columns } from "./columns";

interface DataTableProps {
  data: any[];
}

export function TenantDataTable({ data }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="cursor-pointer select-none"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No tenants found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Create tenant creation sheet (TanStack Form)**

`src/components/tenant-create-sheet.tsx`:

```typescript
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface TenantCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TenantCreateSheet({ open, onOpenChange }: TenantCreateSheetProps) {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const createTenant = useMutation(api.platformTenants.create);
  const [slugManual, setSlugManual] = useState(false);

  const form = useForm({
    defaultValues: { name: "", slug: "", ownerEmail: "", timezone: "UTC" },
    onSubmit: async ({ value }) => {
      setError("");
      try {
        const result = await createTenant(value);
        onOpenChange(false);
        navigate({ to: "/tenants/$tenantId", params: { tenantId: result.tenantId } });
      } catch (err: any) {
        setError(err.message ?? "Failed to create tenant");
      }
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create New Tenant</SheetTitle>
          <SheetDescription>Set up a new gym on the platform</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
          className="space-y-4 mt-4"
        >
          <form.Field
            name="name"
            validators={{ onChange: ({ value }) => value.length < 2 ? "Min 2 chars" : undefined }}
            children={(field) => (
              <div className="space-y-2">
                <Label>Gym Name</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    if (!slugManual) form.setFieldValue("slug", slugify(e.target.value));
                  }}
                  onBlur={field.handleBlur}
                  placeholder="CrossFit Bergen"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          />
          <form.Field
            name="slug"
            validators={{ onChange: ({ value }) => !/^[a-z0-9-]+$/.test(value) ? "Lowercase, numbers, hyphens only" : undefined }}
            children={(field) => (
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => { field.handleChange(e.target.value); setSlugManual(true); }}
                  onBlur={field.handleBlur}
                  placeholder="crossfit-bergen"
                />
                <p className="text-xs text-muted-foreground">Auto-generated from name. Edit to customize.</p>
              </div>
            )}
          />
          <form.Field
            name="ownerEmail"
            children={(field) => (
              <div className="space-y-2">
                <Label>Owner Email</Label>
                <Input
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="owner@gym.com"
                />
              </div>
            )}
          />
          <form.Field
            name="timezone"
            children={(field) => (
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Europe/Oslo"
                />
              </div>
            )}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 pt-2">
            <form.Subscribe
              selector={(s) => s.isSubmitting}
              children={(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Tenant"}
                </Button>
              )}
            />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Create the tenant list page (with debounce, filters, pagination)**

`src/routes/_authenticated/tenants/index.tsx`:

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useState } from "react";
import { createPacer } from "@tanstack/pacer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TenantDataTable } from "@/components/tenant-table/data-table";
import { TenantCreateSheet } from "@/components/tenant-create-sheet";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tenants/")({
  component: TenantsPage,
});

function TenantsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);

  // TanStack Pacer: 300ms debounce on search
  const searchPacer = createPacer(
    (value: string) => { setDebouncedSearch(value); setCursor(undefined); },
    { wait: 300 }
  );

  function handleSearchChange(value: string) {
    setSearchInput(value);
    searchPacer.maybeExecute(value);
  }

  const result = useQuery(api.platformTenants.list, {
    search: debouncedSearch || undefined,
    status: statusFilter === "all" ? undefined : statusFilter as any,
    cursor,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            Manage all gym tenants on the platform
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Tenant
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search tenants..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCursor(undefined); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {result ? (
        <>
          <TenantDataTable data={result.tenants} />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{result.tenants.length} tenants shown</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!cursor}
                onClick={() => setCursor(undefined)}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!result.nextCursor}
                onClick={() => setCursor(result.nextCursor)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-muted-foreground">Loading...</div>
      )}

      <TenantCreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/super-admin/src/components/tenant-table/ apps/super-admin/src/components/tenant-create-sheet.tsx apps/super-admin/src/routes/_authenticated/tenants/index.tsx
git commit -m "feat: add tenant list page with TanStack Table, search, and creation sheet"
```

---

### Task 13: Tenant Detail Page

**Files:**
- Create: `apps/super-admin/src/routes/_authenticated/tenants/$tenantId.tsx`

- [ ] **Step 1: Create tenant detail page**

`src/routes/_authenticated/tenants/$tenantId.tsx`:

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/stat-card";

export const Route = createFileRoute("/_authenticated/tenants/$tenantId")({
  component: TenantDetailPage,
});

function TenantDetailPage() {
  const { tenantId } = Route.useParams();
  const data = useQuery(api.platformTenants.getById, {
    tenantId: tenantId as Id<"tenants">,
  });
  const notes = useQuery(api.platformTenantNotes.listByTenant, {
    tenantId: tenantId as Id<"tenants">,
  });

  const suspendMutation = useMutation(api.platformTenants.suspend);
  const reactivateMutation = useMutation(api.platformTenants.reactivate);
  const createNote = useMutation(api.platformTenantNotes.create);

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [noteContent, setNoteContent] = useState("");

  if (!data) return <div className="text-muted-foreground">Loading...</div>;

  const { tenant, provisioningStatus, memberCount, ownerInfo } = data;
  const isSuspended = provisioningStatus === "suspended";

  async function handleSuspend() {
    await suspendMutation({
      tenantId: tenantId as Id<"tenants">,
      reason,
    });
    setSuspendOpen(false);
    setReason("");
  }

  async function handleReactivate() {
    await reactivateMutation({
      tenantId: tenantId as Id<"tenants">,
      reason,
    });
    setReactivateOpen(false);
    setReason("");
  }

  async function handleAddNote() {
    if (!noteContent.trim()) return;
    await createNote({
      tenantId: tenantId as Id<"tenants">,
      content: noteContent,
    });
    setNoteContent("");
  }

  const statusVariant: Record<string, "default" | "destructive" | "secondary"> = {
    active: "default",
    suspended: "destructive",
    pending: "secondary",
    approved: "secondary",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground text-lg font-bold">
            {tenant.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{tenant.name}</h1>
              <Badge variant={statusVariant[provisioningStatus] ?? "secondary"}>
                {provisioningStatus}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {tenant.slug} &middot; Created{" "}
              {new Date(tenant._creationTime).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isSuspended ? (
            <Button variant="outline" onClick={() => setReactivateOpen(true)}>
              Reactivate
            </Button>
          ) : (
            <Button
              variant="outline"
              className="text-yellow-600 border-yellow-600/30"
              onClick={() => setSuspendOpen(true)}
            >
              Suspend
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Members" value={memberCount} />
            <StatCard
              title="Owner"
              value={ownerInfo?.name ?? "Unknown"}
              subtitle={ownerInfo?.email}
            />
            <StatCard
              title="Timezone"
              value={tenant.timezone ?? "Not set"}
            />
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tenant Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono">{tenant.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timezone</span>
                <span>{tenant.timezone ?? "Not configured"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custom Domain</span>
                <span>{tenant.customDomain ?? "None"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stripe Connect</span>
                <span>{tenant.stripeConnectAccountId ?? "Not connected"}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Member list — coming in a future iteration.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Usage analytics — coming in a future iteration.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Add an internal note..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddNote} disabled={!noteContent.trim()}>
              Add
            </Button>
          </div>
          {notes?.map((note) => (
            <Card key={note._id}>
              <CardContent className="pt-4">
                <p className="text-sm">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(note._creationTime).toLocaleString()}
                  {note.updatedAt && " (edited)"}
                </p>
              </CardContent>
            </Card>
          ))}
          {notes?.length === 0 && (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Suspend Dialog */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Tenant</DialogTitle>
            <DialogDescription>
              This will temporarily disable access for all members of {tenant.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Reason (required)</Label>
            <Input
              id="suspend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Payment overdue, terms violation, etc."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={!reason.trim()}>
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog open={reactivateOpen} onOpenChange={setReactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Tenant</DialogTitle>
            <DialogDescription>
              This will restore access for all members of {tenant.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reactivate-reason">Reason (required)</Label>
            <Input
              id="reactivate-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Payment resolved, review completed, etc."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateOpen(false)}>Cancel</Button>
            <Button onClick={handleReactivate} disabled={!reason.trim()}>Reactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify tenant detail renders**

Navigate to `/tenants/[some-id]` in the app.

- [ ] **Step 3: Commit**

```bash
git add apps/super-admin/src/routes/_authenticated/tenants/\$tenantId.tsx
git commit -m "feat: add tenant detail page with overview, configuration, notes, and suspend/reactivate"
```

---

### Task 14: Final Verification

- [ ] **Step 1: Run all backend tests**

Run: `npx vitest run 2>&1 | tail -30`
Expected: All tests pass (existing + new platform admin tests).

- [ ] **Step 2: Verify frontend builds**

```bash
cd apps/super-admin && npm run build 2>&1 | tail -20
```
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Manual smoke test the app**

Start the dev server and verify:
1. Login page renders at `/login`
2. Dashboard at `/dashboard` shows stat cards, chart, system status
3. Tenant list at `/tenants` shows the table with search
4. New Tenant sheet opens and validates fields
5. Tenant detail at `/tenants/:id` shows tabs with overview, config, notes
6. Sidebar collapses to icons and navigation highlights active route

- [ ] **Step 4: Final commit**

```bash
git add -u
git commit -m "feat: complete super admin app — shell, dashboard, and tenant management"
```
