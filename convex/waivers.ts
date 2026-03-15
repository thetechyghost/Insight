import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// listActive — list all active waivers for the tenant
// ============================================================================

export const listActive = tenantQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("waivers"),
      _creationTime: v.number(),
      tenantId: v.id("tenants"),
      title: v.string(),
      content: v.string(),
      version: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("waivers")
      .withIndex("by_tenantId_isActive", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("isActive", true)
      )
      .collect();
  },
});

// ============================================================================
// getSignatureStatus — check if current user has signed a waiver
// ============================================================================

export const getSignatureStatus = tenantQuery({
  args: {
    waiverId: v.id("waivers"),
  },
  returns: v.object({
    signed: v.boolean(),
    signedAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const signatures = await ctx.db
      .query("waiver_signatures")
      .withIndex("by_tenantId_userId", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("userId", ctx.userId)
      )
      .collect();

    const match = signatures.find((s) => s.waiverId === args.waiverId);

    return {
      signed: !!match,
      signedAt: match?.signedAt,
    };
  },
});

// ============================================================================
// create — create a new waiver (owner+)
// ============================================================================

export const create = tenantMutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  returns: v.id("waivers"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    return await ctx.db.insert("waivers", {
      tenantId: ctx.tenantId,
      title: args.title,
      content: args.content,
      version: 1,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// ============================================================================
// update — version a waiver: deactivate old, create new version (owner+)
// ============================================================================

export const update = tenantMutation({
  args: {
    waiverId: v.id("waivers"),
    title: v.string(),
    content: v.string(),
  },
  returns: v.id("waivers"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const oldWaiver = await ctx.db.get(args.waiverId);
    if (!oldWaiver || oldWaiver.tenantId !== ctx.tenantId) {
      throw new ConvexError("Waiver not found");
    }

    await ctx.db.patch(args.waiverId, { isActive: false });

    return await ctx.db.insert("waivers", {
      tenantId: ctx.tenantId,
      title: args.title,
      content: args.content,
      version: oldWaiver.version + 1,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// ============================================================================
// sign — sign a waiver as the current user
// ============================================================================

export const sign = tenantMutation({
  args: {
    waiverId: v.id("waivers"),
  },
  returns: v.id("waiver_signatures"),
  handler: async (ctx, args) => {
    const waiver = await ctx.db.get(args.waiverId);
    if (!waiver || waiver.tenantId !== ctx.tenantId) {
      throw new ConvexError("Waiver not found");
    }

    if (!waiver.isActive) {
      throw new ConvexError("This waiver is no longer active");
    }

    const existingSignatures = await ctx.db
      .query("waiver_signatures")
      .withIndex("by_tenantId_userId", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("userId", ctx.userId)
      )
      .collect();

    const alreadySigned = existingSignatures.some(
      (s) => s.waiverId === args.waiverId
    );

    if (alreadySigned) {
      throw new ConvexError("You have already signed this waiver");
    }

    return await ctx.db.insert("waiver_signatures", {
      tenantId: ctx.tenantId,
      waiverId: args.waiverId,
      userId: ctx.userId,
      signedAt: Date.now(),
      waiverVersion: waiver.version,
    });
  },
});
