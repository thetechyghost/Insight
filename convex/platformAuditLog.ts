import { v } from "convex/values";
import { authedQuery } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

const auditDoc = v.object({
  _id: v.id("platform_audit_log"),
  _creationTime: v.number(),
  actorId: v.id("users"),
  action: v.string(),
  targetEntity: v.string(),
  targetId: v.optional(v.string()),
  beforeValue: v.optional(v.any()),
  afterValue: v.optional(v.any()),
  timestamp: v.number(),
});

// ============================================================================
// list — list audit log entries with optional filters
// ============================================================================

export const list = authedQuery({
  args: {
    actorId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  returns: v.array(auditDoc),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.actorId) {
      return await ctx.db
        .query("platform_audit_log")
        .withIndex("by_actorId", (q) => q.eq("actorId", args.actorId!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("platform_audit_log")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

// ============================================================================
// create — internal mutation to record an audit log entry
// ============================================================================

export const create = internalMutation({
  args: {
    actorId: v.id("users"),
    action: v.string(),
    targetEntity: v.string(),
    targetId: v.optional(v.string()),
    beforeValue: v.optional(v.any()),
    afterValue: v.optional(v.any()),
  },
  returns: v.id("platform_audit_log"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("platform_audit_log", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
