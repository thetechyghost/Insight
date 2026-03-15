import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation } from "./lib/customFunctions";

// --- Local validators ---

const providerValidator = v.union(
  v.literal("google"),
  v.literal("apple"),
  v.literal("outlook")
);

// --- Return validator ---

const calendarSyncValidator = v.object({
  _id: v.id("calendar_sync"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  provider: providerValidator,
  externalCalendarId: v.optional(v.string()),
  syncEnabled: v.boolean(),
  lastSyncAt: v.optional(v.number()),
});

// ============================================================================
// getMyConnections — list calendar connections for the current user
// ============================================================================

export const getMyConnections = tenantQuery({
  args: {},
  returns: v.array(calendarSyncValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("calendar_sync")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();
  },
});

// ============================================================================
// connect — create a calendar connection
// ============================================================================

export const connect = tenantMutation({
  args: {
    provider: providerValidator,
    externalCalendarId: v.optional(v.string()),
  },
  returns: v.id("calendar_sync"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("calendar_sync", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      provider: args.provider,
      externalCalendarId: args.externalCalendarId,
      syncEnabled: true,
    });
  },
});

// ============================================================================
// disconnect — remove a calendar connection (own only)
// ============================================================================

export const disconnect = tenantMutation({
  args: { syncId: v.id("calendar_sync") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sync = await ctx.db.get(args.syncId);
    if (!sync || sync.tenantId !== ctx.tenantId) {
      throw new ConvexError("Calendar sync not found");
    }

    if (sync.userId !== ctx.userId) {
      throw new ConvexError("Can only disconnect your own calendar");
    }

    await ctx.db.delete(args.syncId);

    return null;
  },
});

// ============================================================================
// syncToCalendar — placeholder sync, updates lastSyncAt
// ============================================================================

export const syncToCalendar = tenantMutation({
  args: { syncId: v.id("calendar_sync") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sync = await ctx.db.get(args.syncId);
    if (!sync || sync.tenantId !== ctx.tenantId) {
      throw new ConvexError("Calendar sync not found");
    }

    if (sync.userId !== ctx.userId) {
      throw new ConvexError("Can only sync your own calendar");
    }

    // Placeholder: in a real implementation, this would push events
    // to the external calendar provider via an action
    await ctx.db.patch(args.syncId, { lastSyncAt: Date.now() });

    return null;
  },
});
