import { v, ConvexError } from "convex/values";
import { platformQuery, platformMutation } from "./lib/platformFunctions";
import { internal } from "./_generated/api";

const flagDoc = v.object({
  _id: v.id("feature_flags"),
  _creationTime: v.number(),
  name: v.string(),
  status: v.union(
    v.literal("enabled"),
    v.literal("disabled"),
    v.literal("percentage_rollout")
  ),
  targetTenantIds: v.optional(v.array(v.id("tenants"))),
  targetSegments: v.optional(v.any()),
  rolloutPercentage: v.optional(v.number()),
});

const flagStatusValidator = v.union(
  v.literal("enabled"),
  v.literal("disabled"),
  v.literal("percentage_rollout")
);

// ============================================================================
// list — all feature flags ordered by name
// ============================================================================

export const list = platformQuery({
  args: {},
  returns: v.array(flagDoc),
  handler: async (ctx) => {
    const flags = await ctx.db
      .query("feature_flags")
      .withIndex("by_name")
      .collect();
    return flags;
  },
});

// ============================================================================
// getByName — single feature flag by name
// ============================================================================

export const getByName = platformQuery({
  args: { name: v.string() },
  returns: v.union(flagDoc, v.null()),
  handler: async (ctx, args) => {
    const flag = await ctx.db
      .query("feature_flags")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
    return flag ?? null;
  },
});

// ============================================================================
// create — create a new feature flag
// ============================================================================

export const create = platformMutation({
  args: {
    name: v.string(),
    status: flagStatusValidator,
    targetTenantIds: v.optional(v.array(v.id("tenants"))),
    rolloutPercentage: v.optional(v.number()),
  },
  returns: v.id("feature_flags"),
  handler: async (ctx, args) => {
    if (!args.name.trim()) {
      throw new ConvexError("Flag name cannot be empty");
    }

    // Validate uniqueness
    const existing = await ctx.db
      .query("feature_flags")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
    if (existing) {
      throw new ConvexError("A feature flag with this name already exists");
    }

    if (args.status === "percentage_rollout" && args.rolloutPercentage === undefined) {
      throw new ConvexError("Rollout percentage is required for percentage_rollout status");
    }

    const flagId = await ctx.db.insert("feature_flags", {
      name: args.name,
      status: args.status,
      targetTenantIds: args.targetTenantIds,
      rolloutPercentage: args.rolloutPercentage,
    });

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "feature_flag.created",
      targetEntity: "feature_flags",
      targetId: flagId as string,
      afterValue: { name: args.name, status: args.status },
    });

    return flagId;
  },
});

// ============================================================================
// update — update a feature flag
// ============================================================================

export const update = platformMutation({
  args: {
    flagId: v.id("feature_flags"),
    status: v.optional(flagStatusValidator),
    targetTenantIds: v.optional(v.array(v.id("tenants"))),
    rolloutPercentage: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const flag = await ctx.db.get(args.flagId);
    if (!flag) throw new ConvexError("Feature flag not found");

    const beforeValue = { status: flag.status, targetTenantIds: flag.targetTenantIds, rolloutPercentage: flag.rolloutPercentage };

    const patch: Record<string, unknown> = {};
    if (args.status !== undefined) patch.status = args.status;
    if (args.targetTenantIds !== undefined) patch.targetTenantIds = args.targetTenantIds;
    if (args.rolloutPercentage !== undefined) patch.rolloutPercentage = args.rolloutPercentage;

    await ctx.db.patch(args.flagId, patch);

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "feature_flag.updated",
      targetEntity: "feature_flags",
      targetId: args.flagId as string,
      beforeValue,
      afterValue: patch,
    });

    return null;
  },
});

// ============================================================================
// remove — delete a feature flag
// ============================================================================

export const remove = platformMutation({
  args: { flagId: v.id("feature_flags") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const flag = await ctx.db.get(args.flagId);
    if (!flag) throw new ConvexError("Feature flag not found");

    await ctx.db.delete(args.flagId);

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "feature_flag.deleted",
      targetEntity: "feature_flags",
      targetId: args.flagId as string,
      beforeValue: { name: flag.name, status: flag.status },
    });

    return null;
  },
});
