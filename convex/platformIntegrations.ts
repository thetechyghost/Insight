import { v } from "convex/values";
import { platformQuery } from "./lib/platformFunctions";

const webhookDoc = v.object({
  _id: v.id("webhooks_outbound"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  url: v.string(),
  eventsSubscribed: v.array(v.string()),
  secret: v.string(),
  status: v.union(v.literal("active"), v.literal("disabled"), v.literal("failed")),
  failureCount: v.optional(v.number()),
});

const connectionDoc = v.object({
  _id: v.id("integration_connections"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  provider: v.string(),
  status: v.union(v.literal("connected"), v.literal("disconnected"), v.literal("error")),
  credentials: v.optional(v.string()),
  syncConfig: v.optional(v.any()),
});

// ============================================================================
// listAllWebhooks — list all outbound webhooks across tenants (platform admin)
// ============================================================================

export const listAllWebhooks = platformQuery({
  args: {},
  returns: v.array(webhookDoc),
  handler: async (ctx) => {
    return await ctx.db.query("webhooks_outbound").collect();
  },
});

// ============================================================================
// listAllConnections — list all integration connections across tenants
// ============================================================================

export const listAllConnections = platformQuery({
  args: {},
  returns: v.array(connectionDoc),
  handler: async (ctx) => {
    return await ctx.db.query("integration_connections").collect();
  },
});
