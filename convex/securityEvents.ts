import { v } from "convex/values";
import { authedQuery } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

const eventTypeValidator = v.union(
  v.literal("login_success"),
  v.literal("login_failure"),
  v.literal("password_change"),
  v.literal("mfa_enabled"),
  v.literal("suspicious_activity"),
  v.literal("account_locked"),
  v.literal("session_created"),
  v.literal("session_terminated")
);

const eventDoc = v.object({
  _id: v.id("security_events"),
  _creationTime: v.number(),
  userId: v.optional(v.id("users")),
  eventType: eventTypeValidator,
  ipAddress: v.optional(v.string()),
  deviceFingerprint: v.optional(v.string()),
  timestamp: v.number(),
  details: v.optional(v.any()),
});

// ============================================================================
// list — list security events with optional filters (super_admin)
// ============================================================================

export const list = authedQuery({
  args: {
    eventType: v.optional(eventTypeValidator),
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  returns: v.array(eventDoc),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.userId) {
      return await ctx.db
        .query("security_events")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId!))
        .order("desc")
        .take(limit);
    }

    if (args.eventType) {
      return await ctx.db
        .query("security_events")
        .withIndex("by_eventType", (q) => q.eq("eventType", args.eventType!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("security_events")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

// ============================================================================
// log — internal mutation to record a security event
// ============================================================================

export const log = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    eventType: eventTypeValidator,
    ipAddress: v.optional(v.string()),
    deviceFingerprint: v.optional(v.string()),
    details: v.optional(v.any()),
  },
  returns: v.id("security_events"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("security_events", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
