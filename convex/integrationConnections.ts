import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

const statusValidator = v.union(
  v.literal("connected"),
  v.literal("disconnected"),
  v.literal("error")
);

const connectionDoc = v.object({
  _id: v.id("integration_connections"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  provider: v.string(),
  status: statusValidator,
  credentials: v.optional(v.string()),
  syncConfig: v.optional(v.any()),
});

// ============================================================================
// list — list integration connections for the tenant
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(connectionDoc),
  handler: async (ctx) => {
    return await ctx.db
      .query("integration_connections")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// connect — create a new integration connection (admin+)
// ============================================================================

export const connect = tenantMutation({
  args: {
    provider: v.string(),
    credentials: v.optional(v.string()),
    syncConfig: v.optional(v.any()),
  },
  returns: v.id("integration_connections"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const existing = await ctx.db
      .query("integration_connections")
      .withIndex("by_tenantId_provider", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("provider", args.provider)
      )
      .unique();
    if (existing && existing.status === "connected") {
      throw new ConvexError("Provider already connected");
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "connected",
        credentials: args.credentials,
        syncConfig: args.syncConfig,
      });
      return existing._id;
    }

    return await ctx.db.insert("integration_connections", {
      tenantId: ctx.tenantId,
      provider: args.provider,
      status: "connected",
      credentials: args.credentials,
      syncConfig: args.syncConfig,
    });
  },
});

// ============================================================================
// disconnect — disconnect an integration (admin+)
// ============================================================================

export const disconnect = tenantMutation({
  args: { connectionId: v.id("integration_connections") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const conn = await ctx.db.get(args.connectionId);
    if (!conn) throw new ConvexError("Connection not found");
    if (conn.tenantId !== ctx.tenantId) {
      throw new ConvexError("Connection does not belong to this tenant");
    }
    await ctx.db.patch(args.connectionId, { status: "disconnected" });
    return null;
  },
});

// ============================================================================
// getSyncStatus — get sync status for a connection
// ============================================================================

export const getSyncStatus = tenantQuery({
  args: { connectionId: v.id("integration_connections") },
  returns: v.union(connectionDoc, v.null()),
  handler: async (ctx, args) => {
    const conn = await ctx.db.get(args.connectionId);
    if (!conn || conn.tenantId !== ctx.tenantId) return null;
    return conn;
  },
});
