import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const promotionValidator = v.object({
  _id: v.id("promotions"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  name: v.string(),
  terms: v.optional(v.string()),
  validFrom: v.optional(v.string()),
  validTo: v.optional(v.string()),
  targetAudienceSegment: v.optional(v.any()),
  promoCodeId: v.optional(v.id("promo_codes")),
});

// ============================================================================
// list — list promotions for this tenant
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(promotionValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("promotions")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// create — create a new promotion (admin+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    terms: v.optional(v.string()),
    validFrom: v.optional(v.string()),
    validTo: v.optional(v.string()),
    targetAudienceSegment: v.optional(v.any()),
    promoCodeId: v.optional(v.id("promo_codes")),
  },
  returns: v.id("promotions"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    return await ctx.db.insert("promotions", {
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});

// ============================================================================
// update — update a promotion (admin+)
// ============================================================================

export const update = tenantMutation({
  args: {
    promotionId: v.id("promotions"),
    name: v.optional(v.string()),
    terms: v.optional(v.string()),
    validFrom: v.optional(v.string()),
    validTo: v.optional(v.string()),
    targetAudienceSegment: v.optional(v.any()),
    promoCodeId: v.optional(v.id("promo_codes")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const promo = await ctx.db.get(args.promotionId);
    if (!promo || promo.tenantId !== ctx.tenantId) {
      throw new ConvexError("Promotion not found");
    }
    const { promotionId: _, ...updates } = args;
    await ctx.db.patch(args.promotionId, updates);
    return null;
  },
});

// ============================================================================
// remove — soft-delete a promotion (admin+)
// ============================================================================

export const remove = tenantMutation({
  args: { promotionId: v.id("promotions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const promo = await ctx.db.get(args.promotionId);
    if (!promo || promo.tenantId !== ctx.tenantId) {
      throw new ConvexError("Promotion not found");
    }
    await ctx.db.delete(args.promotionId);
    return null;
  },
});
