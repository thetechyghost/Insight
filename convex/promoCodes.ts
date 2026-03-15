import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Return validator ---

const promoCodeValidator = v.object({
  _id: v.id("promo_codes"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  code: v.string(),
  discountType: v.union(v.literal("percentage"), v.literal("fixed")),
  discountValue: v.number(),
  type: v.optional(v.union(v.literal("percentage"), v.literal("fixed"), v.literal("trial_extension"))),
  value: v.optional(v.number()),
  validFrom: v.optional(v.string()),
  validUntil: v.optional(v.string()),
  validTo: v.optional(v.string()),
  maxUses: v.optional(v.number()),
  currentUses: v.number(),
  isActive: v.boolean(),
  applicablePlanIds: v.optional(v.array(v.id("membership_plans"))),
});

// --- Validation result ---

const validationResultValidator = v.object({
  valid: v.boolean(),
  reason: v.optional(v.string()),
  discountType: v.optional(v.union(v.literal("percentage"), v.literal("fixed"))),
  discountValue: v.optional(v.number()),
});

// ============================================================================
// validate — check if a promo code is valid
// ============================================================================

export const validate = tenantQuery({
  args: { code: v.string() },
  returns: validationResultValidator,
  handler: async (ctx, args) => {
    const promo = await ctx.db
      .query("promo_codes")
      .withIndex("by_tenantId_code", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("code", args.code)
      )
      .first();

    if (!promo) {
      return { valid: false, reason: "Promo code not found" };
    }

    if (!promo.isActive) {
      return { valid: false, reason: "Promo code is inactive" };
    }

    const now = new Date().toISOString();
    if (promo.validFrom && now < promo.validFrom) {
      return { valid: false, reason: "Promo code is not yet valid" };
    }
    if (promo.validUntil && now > promo.validUntil) {
      return { valid: false, reason: "Promo code has expired" };
    }

    if (promo.maxUses !== undefined && promo.currentUses >= promo.maxUses) {
      return { valid: false, reason: "Promo code usage limit reached" };
    }

    return {
      valid: true,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
    };
  },
});

// ============================================================================
// list — list all promo codes for the tenant (admin+)
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(promoCodeValidator),
  handler: async (ctx) => {
    enforceRole(ctx.role, "admin");

    return await ctx.db
      .query("promo_codes")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// create — create a new promo code (admin+)
// ============================================================================

export const create = tenantMutation({
  args: {
    code: v.string(),
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    discountValue: v.number(),
    maxUses: v.optional(v.number()),
    validFrom: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    applicablePlanIds: v.optional(v.array(v.id("membership_plans"))),
  },
  returns: v.id("promo_codes"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    return await ctx.db.insert("promo_codes", {
      tenantId: ctx.tenantId,
      code: args.code,
      discountType: args.discountType,
      discountValue: args.discountValue,
      maxUses: args.maxUses,
      validFrom: args.validFrom,
      validUntil: args.validUntil,
      applicablePlanIds: args.applicablePlanIds,
      currentUses: 0,
      isActive: true,
    });
  },
});

// ============================================================================
// update — update a promo code (admin+)
// ============================================================================

export const update = tenantMutation({
  args: {
    promoCodeId: v.id("promo_codes"),
    code: v.optional(v.string()),
    discountType: v.optional(v.union(v.literal("percentage"), v.literal("fixed"))),
    discountValue: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    validFrom: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    applicablePlanIds: v.optional(v.array(v.id("membership_plans"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const promo = await ctx.db.get(args.promoCodeId);
    if (!promo || promo.tenantId !== ctx.tenantId) {
      throw new ConvexError("Promo code not found");
    }

    const { promoCodeId: _id, ...updates } = args;
    await ctx.db.patch(args.promoCodeId, updates);
    return null;
  },
});

// ============================================================================
// deactivate — deactivate a promo code (admin+)
// ============================================================================

export const deactivate = tenantMutation({
  args: { promoCodeId: v.id("promo_codes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const promo = await ctx.db.get(args.promoCodeId);
    if (!promo || promo.tenantId !== ctx.tenantId) {
      throw new ConvexError("Promo code not found");
    }

    await ctx.db.patch(args.promoCodeId, { isActive: false });
    return null;
  },
});

// ============================================================================
// apply — validate and apply a promo code (increments currentUses)
// ============================================================================

export const apply = tenantMutation({
  args: { code: v.string() },
  returns: v.object({
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    discountValue: v.number(),
  }),
  handler: async (ctx, args) => {
    const promo = await ctx.db
      .query("promo_codes")
      .withIndex("by_tenantId_code", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("code", args.code)
      )
      .first();

    if (!promo || !promo.isActive) {
      throw new ConvexError("Invalid or inactive promo code");
    }

    const now = new Date().toISOString();
    if (promo.validFrom && now < promo.validFrom) {
      throw new ConvexError("Promo code is not yet valid");
    }
    if (promo.validUntil && now > promo.validUntil) {
      throw new ConvexError("Promo code has expired");
    }
    if (promo.maxUses !== undefined && promo.currentUses >= promo.maxUses) {
      throw new ConvexError("Promo code usage limit reached");
    }

    await ctx.db.patch(promo._id, { currentUses: promo.currentUses + 1 });

    return {
      discountType: promo.discountType,
      discountValue: promo.discountValue,
    };
  },
});
