import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// ============================================================================
// Return validators
// ============================================================================

const providerValidator = v.union(
  v.literal("apple_health"),
  v.literal("garmin"),
  v.literal("fitbit"),
  v.literal("whoop"),
  v.literal("strava"),
  v.literal("trainingpeaks")
);

const syncStatusValidator = v.union(
  v.literal("active"),
  v.literal("error"),
  v.literal("paused")
);

const wearableConnectionValidator = v.object({
  _id: v.id("wearable_connections"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  provider: providerValidator,
  accessToken: v.optional(v.string()),
  refreshToken: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
  lastSyncAt: v.optional(v.number()),
  syncStatus: v.optional(syncStatusValidator),
  scopes: v.optional(v.array(v.string())),
});

// ============================================================================
// listMine — list the current user's wearable connections
// ============================================================================

export const listMine = tenantQuery({
  args: {},
  returns: v.array(wearableConnectionValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("wearable_connections")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();
  },
});

// ============================================================================
// getByProvider — get a connection for a specific provider
// ============================================================================

export const getByProvider = tenantQuery({
  args: { provider: providerValidator },
  returns: v.union(wearableConnectionValidator, v.null()),
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("wearable_connections")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", ctx.userId).eq("provider", args.provider)
      )
      .first();

    if (connection && connection.tenantId !== ctx.tenantId) {
      return null;
    }

    return connection ?? null;
  },
});

// ============================================================================
// create — create a new wearable connection
// ============================================================================

export const create = tenantMutation({
  args: {
    provider: providerValidator,
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    scopes: v.optional(v.array(v.string())),
  },
  returns: v.id("wearable_connections"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("wearable_connections", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      provider: args.provider,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      scopes: args.scopes,
      syncStatus: "active",
    });
  },
});

// ============================================================================
// updateSyncStatus — update sync status (internal, no auth)
// ============================================================================

export const updateSyncStatus = internalMutation({
  args: {
    connectionId: v.id("wearable_connections"),
    syncStatus: syncStatusValidator,
    lastSyncAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new ConvexError("Wearable connection not found");
    }

    await ctx.db.patch(args.connectionId, {
      syncStatus: args.syncStatus,
      lastSyncAt: args.lastSyncAt,
    });
    return null;
  },
});

// ============================================================================
// disconnect — remove a wearable connection (owner only)
// ============================================================================

export const disconnect = tenantMutation({
  args: { connectionId: v.id("wearable_connections") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new ConvexError("Wearable connection not found");
    }
    if (connection.userId !== ctx.userId || connection.tenantId !== ctx.tenantId) {
      throw new ConvexError("Wearable connection does not belong to you");
    }

    await ctx.db.delete(args.connectionId);
    return null;
  },
});
