import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import {
  authedQuery,
  authedMutation,
  tenantQuery,
  tenantMutation,
  enforceRole,
} from "./lib/customFunctions";
import {
  brandingValidator,
  locationValidator,
  contactInfoValidator,
} from "./lib/validators";
import { DEFAULT_ROLE_PERMISSIONS } from "./lib/rbac";

// ============================================================================
// getBySlug — public query, no auth required
// ============================================================================

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("tenants"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      branding: v.optional(
        v.object({
          logoStorageId: v.optional(v.id("_storage")),
          primaryColor: v.optional(v.string()),
          secondaryColor: v.optional(v.string()),
          typography: v.optional(v.string()),
        })
      ),
      terminologyDictionary: v.optional(v.any()),
      featureToggles: v.optional(v.any()),
      customDomain: v.optional(v.string()),
      businessHours: v.optional(v.any()),
      timezone: v.optional(v.string()),
      location: v.optional(locationValidator),
      contactInfo: v.optional(contactInfoValidator),
      cancellationPolicies: v.optional(v.string()),
      stripeConnectAccountId: v.optional(v.string()),
      taxRate: v.optional(v.number()),
      currency: v.optional(v.string()),
      invoiceSettings: v.optional(
        v.object({
          companyName: v.optional(v.string()),
          taxId: v.optional(v.string()),
          footer: v.optional(v.string()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    return tenant ?? null;
  },
});

// ============================================================================
// getById — tenant-scoped query, returns full tenant details
// ============================================================================

export const getById = tenantQuery({
  args: {},
  returns: v.object({
    _id: v.id("tenants"),
    _creationTime: v.number(),
    name: v.string(),
    slug: v.string(),
    branding: v.optional(
      v.object({
        logoStorageId: v.optional(v.id("_storage")),
        primaryColor: v.optional(v.string()),
        secondaryColor: v.optional(v.string()),
        typography: v.optional(v.string()),
      })
    ),
    terminologyDictionary: v.optional(v.any()),
    featureToggles: v.optional(v.any()),
    customDomain: v.optional(v.string()),
    businessHours: v.optional(v.any()),
    timezone: v.optional(v.string()),
    location: v.optional(locationValidator),
    contactInfo: v.optional(contactInfoValidator),
    cancellationPolicies: v.optional(v.string()),
    stripeConnectAccountId: v.optional(v.string()),
    taxRate: v.optional(v.number()),
    currency: v.optional(v.string()),
    invoiceSettings: v.optional(
      v.object({
        companyName: v.optional(v.string()),
        taxId: v.optional(v.string()),
        footer: v.optional(v.string()),
      })
    ),
  }),
  handler: async (ctx) => {
    const tenant = await ctx.db.get(ctx.tenantId);
    if (!tenant) {
      throw new ConvexError("Tenant not found");
    }
    return tenant;
  },
});

// ============================================================================
// getMyTenants — authed query, returns all tenants for current user
// ============================================================================

export const getMyTenants = authedQuery({
  args: {},
  returns: v.array(
    v.object({
      tenant: v.object({
        _id: v.id("tenants"),
        _creationTime: v.number(),
        name: v.string(),
        slug: v.string(),
        branding: v.optional(
          v.object({
            logoStorageId: v.optional(v.id("_storage")),
            primaryColor: v.optional(v.string()),
            secondaryColor: v.optional(v.string()),
            typography: v.optional(v.string()),
          })
        ),
        terminologyDictionary: v.optional(v.any()),
        featureToggles: v.optional(v.any()),
        customDomain: v.optional(v.string()),
        businessHours: v.optional(v.any()),
        timezone: v.optional(v.string()),
        location: v.optional(locationValidator),
        contactInfo: v.optional(contactInfoValidator),
        cancellationPolicies: v.optional(v.string()),
        stripeConnectAccountId: v.optional(v.string()),
        taxRate: v.optional(v.number()),
        currency: v.optional(v.string()),
        invoiceSettings: v.optional(
          v.object({
            companyName: v.optional(v.string()),
            taxId: v.optional(v.string()),
            footer: v.optional(v.string()),
          })
        ),
      }),
      role: v.string(),
      status: v.string(),
      isPrimaryGym: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.userId))
      .collect();

    const results = await Promise.all(
      memberships.map(async (membership) => {
        const tenant = await ctx.db.get(membership.tenantId);
        if (!tenant) return null;
        return {
          tenant,
          role: membership.role,
          status: membership.status,
          isPrimaryGym: membership.isPrimaryGym,
        };
      })
    );

    return results.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );
  },
});

// ============================================================================
// getFeatureToggles — tenant-scoped query
// ============================================================================

export const getFeatureToggles = tenantQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const tenant = await ctx.db.get(ctx.tenantId);
    if (!tenant) {
      throw new ConvexError("Tenant not found");
    }
    return tenant.featureToggles ?? null;
  },
});

// ============================================================================
// create — authed mutation, creates a new tenant + owner membership
// ============================================================================

export const create = authedMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    timezone: v.optional(v.string()),
  },
  returns: v.id("tenants"),
  handler: async (ctx, args) => {
    // Check slug uniqueness
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new ConvexError("A gym with this slug already exists");
    }

    // Create tenant
    const tenantId = await ctx.db.insert("tenants", {
      name: args.name,
      slug: args.slug,
      timezone: args.timezone,
    });

    // Determine isPrimaryGym based on existing memberships
    const existingMemberships = await ctx.db
      .query("memberships")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.userId))
      .collect();

    const isPrimaryGym = existingMemberships.length === 0;

    // Create owner membership
    await ctx.db.insert("memberships", {
      userId: ctx.userId,
      tenantId,
      role: "owner",
      status: "active",
      isPrimaryGym,
      joinDate: new Date().toISOString().split("T")[0],
    });

    // Seed default role permissions
    await ctx.scheduler.runAfter(
      0,
      internal.tenants.seedDefaultRoles,
      { tenantId }
    );

    return tenantId;
  },
});

// ============================================================================
// updateBranding — tenant-scoped mutation, owner only
// ============================================================================

export const updateBranding = tenantMutation({
  args: { branding: brandingValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");
    await ctx.db.patch(ctx.tenantId, { branding: args.branding });
    return null;
  },
});

// ============================================================================
// updateSettings — tenant-scoped mutation, owner only
// ============================================================================

export const updateSettings = tenantMutation({
  args: {
    businessHours: v.optional(v.any()),
    timezone: v.optional(v.string()),
    location: v.optional(locationValidator),
    contactInfo: v.optional(contactInfoValidator),
    cancellationPolicies: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const updates: Record<string, unknown> = {};
    if (args.businessHours !== undefined) updates.businessHours = args.businessHours;
    if (args.timezone !== undefined) updates.timezone = args.timezone;
    if (args.location !== undefined) updates.location = args.location;
    if (args.contactInfo !== undefined) updates.contactInfo = args.contactInfo;
    if (args.cancellationPolicies !== undefined)
      updates.cancellationPolicies = args.cancellationPolicies;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(ctx.tenantId, updates);
    }

    return null;
  },
});

// ============================================================================
// updateTerminology — tenant-scoped mutation, owner only
// ============================================================================

export const updateTerminology = tenantMutation({
  args: { terminologyDictionary: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");
    await ctx.db.patch(ctx.tenantId, {
      terminologyDictionary: args.terminologyDictionary,
    });
    return null;
  },
});

// ============================================================================
// updateFeatureToggles — tenant-scoped mutation, owner only
// ============================================================================

export const updateFeatureToggles = tenantMutation({
  args: { featureToggles: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");
    await ctx.db.patch(ctx.tenantId, {
      featureToggles: args.featureToggles,
    });
    return null;
  },
});

// ============================================================================
// seedDefaultRoles — internal mutation, creates default role_permission records
// ============================================================================

export const seedDefaultRoles = internalMutation({
  args: { tenantId: v.id("tenants") },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const [roleName, permissions] of Object.entries(
      DEFAULT_ROLE_PERMISSIONS
    )) {
      await ctx.db.insert("roles_permissions", {
        tenantId: args.tenantId,
        roleName,
        permissions,
      });
    }
    return null;
  },
});
