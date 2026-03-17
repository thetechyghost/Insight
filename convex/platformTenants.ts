import { v, ConvexError } from "convex/values";
import { platformQuery, platformMutation } from "./lib/platformFunctions";
import { internal } from "./_generated/api";

// ============================================================================
// list — paginated list of all tenants with member counts and provisioning status
// ============================================================================

export const list = platformQuery({
  args: {
    status: v.optional(v.union(
      v.literal("pending"), v.literal("approved"), v.literal("active"), v.literal("suspended"), v.literal("terminated")
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
        v.literal("pending"), v.literal("approved"), v.literal("active"), v.literal("suspended"), v.literal("terminated")
      ),
    })),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Get all tenants
    const allTenants = await ctx.db.query("tenants").collect();

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
          provisioningStatus: (provisioning?.status ?? "pending") as "pending" | "approved" | "active" | "suspended" | "terminated",
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
      v.literal("pending"), v.literal("approved"), v.literal("active"), v.literal("suspended"), v.literal("terminated")
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
      provisioningStatus: (provisioning?.status ?? "pending") as "pending" | "approved" | "active" | "suspended" | "terminated",
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
      targetId: args.tenantId as string,
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
      targetId: args.tenantId as string,
      afterValue: { reason: args.reason },
    });

    return null;
  },
});

// ============================================================================
// terminate — permanently deactivate a tenant (FR-AD-006)
// ============================================================================

export const terminate = platformMutation({
  args: {
    tenantId: v.id("tenants"),
    reason: v.string(),
    confirmSlug: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.reason.trim()) {
      throw new ConvexError("Reason is required for termination");
    }

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new ConvexError("Tenant not found");

    // Safety confirmation: slug must match
    if (args.confirmSlug !== tenant.slug) {
      throw new ConvexError("Confirmation slug does not match. Please type the tenant slug to confirm termination.");
    }

    const provisioning = await ctx.db
      .query("tenant_provisioning")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();
    if (!provisioning) throw new ConvexError("Tenant provisioning record not found");
    if (provisioning.status === "terminated") {
      throw new ConvexError("Tenant is already terminated");
    }

    // Set provisioning to terminated
    await ctx.db.patch(provisioning._id, { status: "terminated" });

    // Cancel all memberships for this tenant
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    for (const membership of memberships) {
      if (membership.status !== "cancelled") {
        await ctx.db.patch(membership._id, { status: "cancelled" });
      }
    }

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "tenant.terminated",
      targetEntity: "tenants",
      targetId: args.tenantId as string,
      afterValue: { reason: args.reason, cancelledMemberships: memberships.length },
    });

    return null;
  },
});

// ============================================================================
// getMembers — paginated member list for a tenant (FR-AD-009)
// ============================================================================

export const getMembers = platformQuery({
  args: {
    tenantId: v.id("tenants"),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    members: v.array(v.object({
      membershipId: v.id("memberships"),
      userId: v.id("users"),
      name: v.string(),
      email: v.string(),
      role: v.string(),
      status: v.string(),
      joinDate: v.string(),
    })),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Enrich with user details
    const enriched = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          membershipId: m._id,
          userId: m.userId,
          name: user?.name ?? "Unknown",
          email: user?.email ?? "unknown",
          role: m.role,
          status: m.status,
          joinDate: m.joinDate,
        };
      })
    );

    // Sort by name
    enriched.sort((a, b) => a.name.localeCompare(b.name));

    // Offset-based pagination
    const startIdx = args.cursor ? parseInt(args.cursor, 10) : 0;
    const page = enriched.slice(startIdx, startIdx + limit);
    const nextCursor = startIdx + limit < enriched.length ? String(startIdx + limit) : undefined;

    return { members: page, nextCursor };
  },
});
