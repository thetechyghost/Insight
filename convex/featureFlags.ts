import { v, ConvexError } from "convex/values";
import { authedQuery, authedMutation } from "./lib/customFunctions";
import { query } from "./_generated/server";

const statusValidator = v.union(
  v.literal("enabled"),
  v.literal("disabled"),
  v.literal("percentage_rollout")
);

const flagDoc = v.object({
  _id: v.id("feature_flags"),
  _creationTime: v.number(),
  name: v.string(),
  status: statusValidator,
  targetTenantIds: v.optional(v.array(v.id("tenants"))),
  targetSegments: v.optional(v.any()),
  rolloutPercentage: v.optional(v.number()),
});

// list — list all feature flags
export const list = authedQuery({
  args: {},
  returns: v.array(flagDoc),
  handler: async (ctx) => {
    return await ctx.db.query("feature_flags").collect();
  },
});

// getByName — public query to look up a flag by name
export const getByName = query({
  args: { name: v.string() },
  returns: v.union(flagDoc, v.null()),
  handler: async (ctx, args) => {
    const flag = await ctx.db
      .query("feature_flags")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
    return flag ?? null;
  },
});

// create — create a new feature flag
export const create = authedMutation({
  args: {
    name: v.string(),
    status: statusValidator,
    targetTenantIds: v.optional(v.array(v.id("tenants"))),
    targetSegments: v.optional(v.any()),
    rolloutPercentage: v.optional(v.number()),
  },
  returns: v.id("feature_flags"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("feature_flags")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
    if (existing) throw new ConvexError("Feature flag already exists");
    return await ctx.db.insert("feature_flags", args);
  },
});

// update — update a feature flag
export const update = authedMutation({
  args: {
    flagId: v.id("feature_flags"),
    status: v.optional(statusValidator),
    targetTenantIds: v.optional(v.array(v.id("tenants"))),
    targetSegments: v.optional(v.any()),
    rolloutPercentage: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { flagId, ...updates } = args;
    const flag = await ctx.db.get(flagId);
    if (!flag) throw new ConvexError("Feature flag not found");
    await ctx.db.patch(flagId, updates);
    return null;
  },
});

// remove — delete a feature flag
export const remove = authedMutation({
  args: { flagId: v.id("feature_flags") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const flag = await ctx.db.get(args.flagId);
    if (!flag) throw new ConvexError("Feature flag not found");
    await ctx.db.delete(args.flagId);
    return null;
  },
});

// isEnabled — check if a flag is enabled, considering tenant overrides + %
export const isEnabled = query({
  args: {
    name: v.string(),
    tenantId: v.optional(v.id("tenants")),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const flag = await ctx.db
      .query("feature_flags")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();

    if (!flag) return false;
    if (flag.status === "disabled") return false;
    if (flag.status === "enabled") {
      if (flag.targetTenantIds && args.tenantId) {
        return flag.targetTenantIds.includes(args.tenantId);
      }
      return true;
    }
    // percentage_rollout
    const pct = flag.rolloutPercentage ?? 0;
    return Math.random() * 100 < pct;
  },
});
