import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Return validator ---

const dailyWodValidator = v.object({
  _id: v.id("daily_wod"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  track: v.optional(v.string()),
  date: v.string(),
  workoutDefinitionId: v.id("workout_definitions"),
  coachNotes: v.optional(v.string()),
  stimulusDescription: v.optional(v.string()),
  scalingOptions: v.optional(
    v.array(
      v.object({
        level: v.string(),
        description: v.string(),
      })
    )
  ),
  publishTime: v.optional(v.number()),
  autoPublishSchedule: v.optional(v.string()),
});

// ============================================================================
// getByDate — get WOD(s) for a specific date, optionally filtered by track
// ============================================================================

export const getByDate = tenantQuery({
  args: {
    date: v.string(),
    track: v.optional(v.string()),
  },
  returns: v.array(dailyWodValidator),
  handler: async (ctx, args) => {
    if (args.track !== undefined) {
      return await ctx.db
        .query("daily_wod")
        .withIndex("by_tenantId_track_date", (q) =>
          q
            .eq("tenantId", ctx.tenantId)
            .eq("track", args.track)
            .eq("date", args.date)
        )
        .collect();
    }

    return await ctx.db
      .query("daily_wod")
      .withIndex("by_tenantId_date", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("date", args.date)
      )
      .collect();
  },
});

// ============================================================================
// list — list upcoming WODs for the tenant
// ============================================================================

export const list = tenantQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(dailyWodValidator),
  handler: async (ctx, args) => {
    const today = new Date().toISOString().slice(0, 10);
    const resultLimit = args.limit ?? 14;

    const wods = await ctx.db
      .query("daily_wod")
      .withIndex("by_tenantId_date", (q) =>
        q.eq("tenantId", ctx.tenantId).gte("date", today)
      )
      .take(resultLimit);

    return wods;
  },
});

// ============================================================================
// create — create a daily WOD entry (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    date: v.string(),
    track: v.optional(v.string()),
    workoutDefinitionId: v.id("workout_definitions"),
    coachNotes: v.optional(v.string()),
    stimulusDescription: v.optional(v.string()),
    scalingOptions: v.optional(
      v.array(
        v.object({
          level: v.string(),
          description: v.string(),
        })
      )
    ),
    publishTime: v.optional(v.number()),
    autoPublishSchedule: v.optional(v.string()),
  },
  returns: v.id("daily_wod"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db.insert("daily_wod", {
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});

// ============================================================================
// update — update a daily WOD entry (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    wodId: v.id("daily_wod"),
    date: v.optional(v.string()),
    track: v.optional(v.string()),
    workoutDefinitionId: v.optional(v.id("workout_definitions")),
    coachNotes: v.optional(v.string()),
    stimulusDescription: v.optional(v.string()),
    scalingOptions: v.optional(
      v.array(
        v.object({
          level: v.string(),
          description: v.string(),
        })
      )
    ),
    publishTime: v.optional(v.number()),
    autoPublishSchedule: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const wod = await ctx.db.get(args.wodId);
    if (!wod || wod.tenantId !== ctx.tenantId) {
      throw new ConvexError("Daily WOD not found");
    }

    const { wodId: _id, ...updates } = args;
    await ctx.db.patch(args.wodId, updates);

    return null;
  },
});

// ============================================================================
// remove — delete a daily WOD entry (coach+)
// ============================================================================

export const remove = tenantMutation({
  args: {
    wodId: v.id("daily_wod"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const wod = await ctx.db.get(args.wodId);
    if (!wod || wod.tenantId !== ctx.tenantId) {
      throw new ConvexError("Daily WOD not found");
    }

    await ctx.db.delete(args.wodId);

    return null;
  },
});

// ============================================================================
// publish — set the publish time on a WOD (coach+)
// ============================================================================

export const publish = tenantMutation({
  args: {
    wodId: v.id("daily_wod"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const wod = await ctx.db.get(args.wodId);
    if (!wod || wod.tenantId !== ctx.tenantId) {
      throw new ConvexError("Daily WOD not found");
    }

    await ctx.db.patch(args.wodId, {
      publishTime: Date.now(),
    });

    return null;
  },
});
