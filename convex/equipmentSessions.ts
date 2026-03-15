import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// ============================================================================
// Return validators
// ============================================================================

const sessionStatusValidator = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("abandoned")
);

const equipmentSessionValidator = v.object({
  _id: v.id("equipment_sessions"),
  _creationTime: v.number(),
  deviceId: v.id("devices"),
  tenantId: v.id("tenants"),
  userId: v.optional(v.id("users")),
  status: sessionStatusValidator,
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  workoutLogId: v.optional(v.id("workout_logs")),
  metrics: v.optional(v.any()),
});

// ============================================================================
// listActive — list active equipment sessions for the tenant (coach+)
// ============================================================================

export const listActive = tenantQuery({
  args: {},
  returns: v.array(equipmentSessionValidator),
  handler: async (ctx) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db
      .query("equipment_sessions")
      .withIndex("by_tenantId_status", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("status", "active")
      )
      .collect();
  },
});

// ============================================================================
// getByDevice — get the active session for a device
// ============================================================================

export const getByDevice = tenantQuery({
  args: { deviceId: v.id("devices") },
  returns: v.union(equipmentSessionValidator, v.null()),
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("equipment_sessions")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .collect();

    const active = sessions.find(
      (s) => s.status === "active" && s.tenantId === ctx.tenantId
    );

    return active ?? null;
  },
});

// ============================================================================
// start — start a new equipment session (internal, no auth)
// ============================================================================

export const start = internalMutation({
  args: {
    deviceId: v.id("devices"),
    tenantId: v.id("tenants"),
  },
  returns: v.id("equipment_sessions"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("equipment_sessions", {
      deviceId: args.deviceId,
      tenantId: args.tenantId,
      status: "active",
      startedAt: Date.now(),
    });
  },
});

// ============================================================================
// complete — complete an equipment session (internal, no auth)
// ============================================================================

export const complete = internalMutation({
  args: {
    sessionId: v.id("equipment_sessions"),
    metrics: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Equipment session not found");
    }

    await ctx.db.patch(args.sessionId, {
      status: "completed",
      completedAt: Date.now(),
      metrics: args.metrics,
    });
    return null;
  },
});

// ============================================================================
// assignAthlete — assign an athlete to an active session (coach+)
// ============================================================================

export const assignAthlete = tenantMutation({
  args: {
    sessionId: v.id("equipment_sessions"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Equipment session not found");
    }
    if (session.tenantId !== ctx.tenantId) {
      throw new ConvexError("Session does not belong to this tenant");
    }

    await ctx.db.patch(args.sessionId, { userId: args.userId });
    return null;
  },
});

// ============================================================================
// abandon — mark a session as abandoned (coach+)
// ============================================================================

export const abandon = tenantMutation({
  args: { sessionId: v.id("equipment_sessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Equipment session not found");
    }
    if (session.tenantId !== ctx.tenantId) {
      throw new ConvexError("Session does not belong to this tenant");
    }

    await ctx.db.patch(args.sessionId, { status: "abandoned" });
    return null;
  },
});
