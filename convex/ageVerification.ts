import { v, ConvexError } from "convex/values";
import { authedQuery, authedMutation } from "./lib/customFunctions";

const consentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("granted"),
  v.literal("denied")
);

const verificationDoc = v.object({
  _id: v.id("age_verification"),
  _creationTime: v.number(),
  userId: v.id("users"),
  guardianContact: v.optional(
    v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
    })
  ),
  consentStatus: consentStatusValidator,
  verificationMethod: v.optional(v.string()),
});

// ============================================================================
// listAll — list all age verification records (platform admin)
// ============================================================================

export const listAll = authedQuery({
  args: {},
  returns: v.array(verificationDoc),
  handler: async (ctx) => {
    return await ctx.db.query("age_verification").collect();
  },
});

// ============================================================================
// getByUser — get age verification record for a user
// ============================================================================

export const getByUser = authedQuery({
  args: { userId: v.id("users") },
  returns: v.union(verificationDoc, v.null()),
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("age_verification")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    return record ?? null;
  },
});

// ============================================================================
// submit — submit an age verification request
// ============================================================================

export const submit = authedMutation({
  args: {
    userId: v.id("users"),
    guardianContact: v.optional(
      v.object({
        name: v.string(),
        email: v.string(),
        phone: v.optional(v.string()),
      })
    ),
    verificationMethod: v.optional(v.string()),
  },
  returns: v.id("age_verification"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("age_verification")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (existing) throw new ConvexError("Verification record already exists");

    return await ctx.db.insert("age_verification", {
      userId: args.userId,
      guardianContact: args.guardianContact,
      consentStatus: "pending",
      verificationMethod: args.verificationMethod,
    });
  },
});

// ============================================================================
// approve — approve an age verification (admin)
// ============================================================================

export const approve = authedMutation({
  args: { verificationId: v.id("age_verification") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.verificationId);
    if (!record) throw new ConvexError("Verification record not found");
    await ctx.db.patch(args.verificationId, { consentStatus: "granted" });
    return null;
  },
});

// ============================================================================
// deny — deny an age verification (admin)
// ============================================================================

export const deny = authedMutation({
  args: { verificationId: v.id("age_verification") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.verificationId);
    if (!record) throw new ConvexError("Verification record not found");
    await ctx.db.patch(args.verificationId, { consentStatus: "denied" });
    return null;
  },
});
