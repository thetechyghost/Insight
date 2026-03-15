import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Return validators
// ============================================================================

const campaignValidator = v.object({
  _id: v.id("email_campaigns"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  subject: v.string(),
  body: v.string(),
  audienceSegment: v.optional(v.any()),
  status: v.union(v.literal("draft"), v.literal("scheduled"), v.literal("sent")),
  sendDate: v.optional(v.number()),
  trackingRefs: v.optional(v.any()),
});

// ============================================================================
// list — list all email campaigns for the tenant (admin+)
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(campaignValidator),
  handler: async (ctx) => {
    enforceRole(ctx.role, "admin");

    return await ctx.db
      .query("email_campaigns")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// getById — get a single email campaign by ID (admin+)
// ============================================================================

export const getById = tenantQuery({
  args: { campaignId: v.id("email_campaigns") },
  returns: campaignValidator,
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.tenantId !== ctx.tenantId) {
      throw new ConvexError("Email campaign not found");
    }
    return campaign;
  },
});

// ============================================================================
// create — create a new email campaign as draft (admin+)
// ============================================================================

export const create = tenantMutation({
  args: {
    subject: v.string(),
    body: v.string(),
    audienceSegment: v.optional(v.any()),
  },
  returns: v.id("email_campaigns"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    return await ctx.db.insert("email_campaigns", {
      tenantId: ctx.tenantId,
      subject: args.subject,
      body: args.body,
      audienceSegment: args.audienceSegment,
      status: "draft",
    });
  },
});

// ============================================================================
// update — update an email campaign (admin+, draft only)
// ============================================================================

export const update = tenantMutation({
  args: {
    campaignId: v.id("email_campaigns"),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    audienceSegment: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.tenantId !== ctx.tenantId) {
      throw new ConvexError("Email campaign not found");
    }
    if (campaign.status !== "draft") {
      throw new ConvexError("Can only update draft campaigns");
    }

    const updates: Record<string, unknown> = {};
    if (args.subject !== undefined) updates.subject = args.subject;
    if (args.body !== undefined) updates.body = args.body;
    if (args.audienceSegment !== undefined) updates.audienceSegment = args.audienceSegment;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.campaignId, updates);
    }
    return null;
  },
});

// ============================================================================
// send — mark a campaign as sending (admin+)
// ============================================================================

export const send = tenantMutation({
  args: { campaignId: v.id("email_campaigns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.tenantId !== ctx.tenantId) {
      throw new ConvexError("Email campaign not found");
    }
    if (campaign.status === "sent") {
      throw new ConvexError("Campaign has already been sent");
    }

    await ctx.db.patch(args.campaignId, {
      status: "sent",
      sendDate: Date.now(),
    });
    return null;
  },
});

// ============================================================================
// schedule — schedule a campaign for future sending (admin+)
// ============================================================================

export const schedule = tenantMutation({
  args: {
    campaignId: v.id("email_campaigns"),
    scheduledAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.tenantId !== ctx.tenantId) {
      throw new ConvexError("Email campaign not found");
    }
    if (campaign.status === "sent") {
      throw new ConvexError("Campaign has already been sent");
    }

    await ctx.db.patch(args.campaignId, {
      status: "scheduled",
      sendDate: args.scheduledAt,
    });
    return null;
  },
});
