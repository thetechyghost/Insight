import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

const statusValidator = v.union(
  v.literal("active"),
  v.literal("disabled"),
  v.literal("failed")
);

const webhookDoc = v.object({
  _id: v.id("webhooks_outbound"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  url: v.string(),
  eventsSubscribed: v.array(v.string()),
  secret: v.string(),
  status: statusValidator,
  failureCount: v.optional(v.number()),
});

// list — list outbound webhooks for the tenant (owner+)

export const list = tenantQuery({
  args: {},
  returns: v.array(webhookDoc),
  handler: async (ctx) => {
    enforceRole(ctx.role, "owner");
    return await ctx.db
      .query("webhooks_outbound")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// create — create a new outbound webhook (owner+)

export const create = tenantMutation({
  args: {
    url: v.string(),
    eventsSubscribed: v.array(v.string()),
    secret: v.string(),
  },
  returns: v.id("webhooks_outbound"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");
    return await ctx.db.insert("webhooks_outbound", {
      tenantId: ctx.tenantId,
      url: args.url,
      eventsSubscribed: args.eventsSubscribed,
      secret: args.secret,
      status: "active",
      failureCount: 0,
    });
  },
});

// update — update a webhook (owner+)

export const update = tenantMutation({
  args: {
    webhookId: v.id("webhooks_outbound"),
    url: v.optional(v.string()),
    eventsSubscribed: v.optional(v.array(v.string())),
    status: v.optional(statusValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) throw new ConvexError("Webhook not found");
    if (webhook.tenantId !== ctx.tenantId) {
      throw new ConvexError("Webhook does not belong to this tenant");
    }
    const { webhookId, ...updates } = args;
    await ctx.db.patch(webhookId, updates);
    return null;
  },
});

// remove — delete a webhook (owner+)

export const remove = tenantMutation({
  args: { webhookId: v.id("webhooks_outbound") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) throw new ConvexError("Webhook not found");
    if (webhook.tenantId !== ctx.tenantId) {
      throw new ConvexError("Webhook does not belong to this tenant");
    }
    await ctx.db.delete(args.webhookId);
    return null;
  },
});

// testPing — placeholder ping test (owner+)

export const testPing = tenantMutation({
  args: { webhookId: v.id("webhooks_outbound") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) throw new ConvexError("Webhook not found");
    if (webhook.tenantId !== ctx.tenantId) {
      throw new ConvexError("Webhook does not belong to this tenant");
    }
    // Placeholder: in production, this would send an HTTP request
    await ctx.db.patch(args.webhookId, { failureCount: 0 });
    return null;
  },
});
