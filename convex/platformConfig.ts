import { v, ConvexError } from "convex/values";
import { authedMutation } from "./lib/customFunctions";
import { query } from "./_generated/server";

// ============================================================================
// get — look up a platform config value by key
// ============================================================================

export const get = query({
  args: { key: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("platform_config"),
      _creationTime: v.number(),
      key: v.string(),
      value: v.any(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("platform_config")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return doc ?? null;
  },
});

// ============================================================================
// set — upsert a platform config value (super_admin)
// ============================================================================

export const set = authedMutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  returns: v.id("platform_config"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("platform_config")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
      return existing._id;
    }

    return await ctx.db.insert("platform_config", {
      key: args.key,
      value: args.value,
    });
  },
});
