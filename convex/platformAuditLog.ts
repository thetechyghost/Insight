import { v } from "convex/values";
import { platformQuery } from "./lib/platformFunctions";
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
// list — list audit log entries with optional filters and pagination
// ============================================================================

export const list = platformQuery({
  args: {
    actorId: v.optional(v.id("users")),
    action: v.optional(v.string()),
    targetEntity: v.optional(v.string()),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    entries: v.array(auditDoc),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let entries;

    if (args.actorId) {
      entries = await ctx.db
        .query("platform_audit_log")
        .withIndex("by_actorId", (q) => q.eq("actorId", args.actorId!))
        .order("desc")
        .collect();
    } else if (args.targetEntity) {
      entries = await ctx.db
        .query("platform_audit_log")
        .withIndex("by_targetEntity", (q) => q.eq("targetEntity", args.targetEntity!))
        .order("desc")
        .collect();
    } else {
      entries = await ctx.db
        .query("platform_audit_log")
        .withIndex("by_timestamp")
        .order("desc")
        .collect();
    }

    // Apply additional in-memory filters
    if (args.action) {
      entries = entries.filter((e) => e.action === args.action);
    }
    if (args.targetEntity && args.actorId) {
      // If both actorId and targetEntity are provided, actorId index was used above
      entries = entries.filter((e) => e.targetEntity === args.targetEntity);
    }

    // Offset-based pagination
    const startIdx = args.cursor ? parseInt(args.cursor, 10) : 0;
    const page = entries.slice(startIdx, startIdx + limit);
    const nextCursor = startIdx + limit < entries.length ? String(startIdx + limit) : undefined;

    return { entries: page, nextCursor };
  },
});

// ============================================================================
// getActions — distinct action values for filter dropdown
// ============================================================================

export const getActions = platformQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const entries = await ctx.db
      .query("platform_audit_log")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    const actions = [...new Set(entries.map((e) => e.action))];
    actions.sort();
    return actions;
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
