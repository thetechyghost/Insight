import { v, ConvexError } from "convex/values";
import { authedQuery, authedMutation } from "./lib/customFunctions";

const consentTypeValidator = v.union(
  v.literal("terms_of_service"),
  v.literal("privacy_policy"),
  v.literal("marketing"),
  v.literal("data_sharing"),
  v.literal("cookies")
);

const consentDoc = v.object({
  _id: v.id("consent_records"),
  _creationTime: v.number(),
  userId: v.id("users"),
  type: consentTypeValidator,
  versionAccepted: v.string(),
  timestamp: v.number(),
  ipAddress: v.optional(v.string()),
});

// ============================================================================
// listAll — list all consent records (platform admin)
// ============================================================================

export const listAll = authedQuery({
  args: {},
  returns: v.array(consentDoc),
  handler: async (ctx) => {
    return await ctx.db.query("consent_records").collect();
  },
});

// ============================================================================
// listMine — list the current user's consent records
// ============================================================================

export const listMine = authedQuery({
  args: {},
  returns: v.array(consentDoc),
  handler: async (ctx) => {
    return await ctx.db
      .query("consent_records")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.userId))
      .collect();
  },
});

// ============================================================================
// record — record user consent
// ============================================================================

export const record = authedMutation({
  args: {
    type: consentTypeValidator,
    version: v.string(),
    ipAddress: v.optional(v.string()),
  },
  returns: v.id("consent_records"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("consent_records", {
      userId: ctx.userId,
      type: args.type,
      versionAccepted: args.version,
      timestamp: Date.now(),
      ipAddress: args.ipAddress,
    });
  },
});

// ============================================================================
// withdraw — withdraw a specific consent
// ============================================================================

export const withdraw = authedMutation({
  args: { consentId: v.id("consent_records") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.consentId);
    if (!record) throw new ConvexError("Consent record not found");
    if (record.userId !== ctx.userId) {
      throw new ConvexError("You can only withdraw your own consent");
    }
    await ctx.db.delete(args.consentId);
    return null;
  },
});
