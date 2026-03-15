import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Return validators
// ============================================================================

const bodyMeasurementValidator = v.object({
  _id: v.id("body_measurements"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  date: v.string(),
  waist: v.optional(v.number()),
  hips: v.optional(v.number()),
  chest: v.optional(v.number()),
  leftArm: v.optional(v.number()),
  rightArm: v.optional(v.number()),
  leftThigh: v.optional(v.number()),
  rightThigh: v.optional(v.number()),
  leftCalf: v.optional(v.number()),
  rightCalf: v.optional(v.number()),
  neck: v.optional(v.number()),
  notes: v.optional(v.string()),
});

// ============================================================================
// listMine — list the current user's body measurements, newest first
// ============================================================================

export const listMine = tenantQuery({
  args: {},
  returns: v.array(bodyMeasurementValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("body_measurements")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .order("desc")
      .collect();
  },
});

// ============================================================================
// getByDate — get the current user's measurements for a specific date
// ============================================================================

export const getByDate = tenantQuery({
  args: { date: v.string() },
  returns: v.union(bodyMeasurementValidator, v.null()),
  handler: async (ctx, args) => {
    const measurement = await ctx.db
      .query("body_measurements")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", ctx.userId).eq("date", args.date)
      )
      .first();

    if (measurement && measurement.tenantId !== ctx.tenantId) {
      return null;
    }

    return measurement;
  },
});

// ============================================================================
// create — record a new body measurement
// ============================================================================

export const create = tenantMutation({
  args: {
    date: v.string(),
    waist: v.optional(v.number()),
    hips: v.optional(v.number()),
    chest: v.optional(v.number()),
    leftArm: v.optional(v.number()),
    rightArm: v.optional(v.number()),
    leftThigh: v.optional(v.number()),
    rightThigh: v.optional(v.number()),
    leftCalf: v.optional(v.number()),
    rightCalf: v.optional(v.number()),
    neck: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("body_measurements"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("body_measurements", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});

// ============================================================================
// update — update a body measurement (owner only)
// ============================================================================

export const update = tenantMutation({
  args: {
    measurementId: v.id("body_measurements"),
    date: v.optional(v.string()),
    waist: v.optional(v.number()),
    hips: v.optional(v.number()),
    chest: v.optional(v.number()),
    leftArm: v.optional(v.number()),
    rightArm: v.optional(v.number()),
    leftThigh: v.optional(v.number()),
    rightThigh: v.optional(v.number()),
    leftCalf: v.optional(v.number()),
    rightCalf: v.optional(v.number()),
    neck: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const measurement = await ctx.db.get(args.measurementId);
    if (!measurement || measurement.userId !== ctx.userId || measurement.tenantId !== ctx.tenantId) {
      throw new ConvexError("Body measurement not found");
    }

    const { measurementId: _id, ...updates } = args;
    await ctx.db.patch(args.measurementId, updates);

    return null;
  },
});

// ============================================================================
// remove — delete a body measurement (owner only)
// ============================================================================

export const remove = tenantMutation({
  args: { measurementId: v.id("body_measurements") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const measurement = await ctx.db.get(args.measurementId);
    if (!measurement || measurement.userId !== ctx.userId || measurement.tenantId !== ctx.tenantId) {
      throw new ConvexError("Body measurement not found");
    }

    await ctx.db.delete(args.measurementId);
    return null;
  },
});
