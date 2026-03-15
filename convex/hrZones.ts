import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Return validators
// ============================================================================

const methodValidator = v.union(
  v.literal("maxHR"),
  v.literal("lactate"),
  v.literal("custom")
);

const zoneEntryValidator = v.object({
  name: v.string(),
  lowerBound: v.number(),
  upperBound: v.number(),
});

const hrZonesValidator = v.object({
  _id: v.id("hr_zones"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  method: methodValidator,
  maxHR: v.optional(v.number()),
  lactateThreshold: v.optional(v.number()),
  zones: v.optional(v.array(zoneEntryValidator)),
});

// ============================================================================
// getMine — get the current user's HR zones
// ============================================================================

export const getMine = tenantQuery({
  args: {},
  returns: v.union(hrZonesValidator, v.null()),
  handler: async (ctx) => {
    const record = await ctx.db
      .query("hr_zones")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .first();

    return record ?? null;
  },
});

// ============================================================================
// calculate — auto-calculate 5 standard HR zones from maxHR or age
// ============================================================================

export const calculate = tenantMutation({
  args: {
    maxHR: v.optional(v.number()),
    age: v.optional(v.number()),
  },
  returns: v.id("hr_zones"),
  handler: async (ctx, args) => {
    let maxHR = args.maxHR;

    if (!maxHR && args.age) {
      maxHR = 220 - args.age;
    }

    if (!maxHR) {
      throw new ConvexError("Provide either maxHR or age to calculate zones");
    }

    const zones = [
      { name: "Zone 1 - Recovery", lowerBound: Math.round(maxHR * 0.5), upperBound: Math.round(maxHR * 0.6) },
      { name: "Zone 2 - Aerobic", lowerBound: Math.round(maxHR * 0.6), upperBound: Math.round(maxHR * 0.7) },
      { name: "Zone 3 - Tempo", lowerBound: Math.round(maxHR * 0.7), upperBound: Math.round(maxHR * 0.8) },
      { name: "Zone 4 - Threshold", lowerBound: Math.round(maxHR * 0.8), upperBound: Math.round(maxHR * 0.9) },
      { name: "Zone 5 - VO2max", lowerBound: Math.round(maxHR * 0.9), upperBound: maxHR },
    ];

    // Upsert: check for existing record
    const existing = await ctx.db
      .query("hr_zones")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        method: "maxHR",
        maxHR,
        zones,
      });
      return existing._id;
    }

    return await ctx.db.insert("hr_zones", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      method: "maxHR",
      maxHR,
      zones,
    });
  },
});

// ============================================================================
// setCustom — set custom HR zones
// ============================================================================

export const setCustom = tenantMutation({
  args: {
    zones: v.array(zoneEntryValidator),
  },
  returns: v.id("hr_zones"),
  handler: async (ctx, args) => {
    // Upsert: check for existing record
    const existing = await ctx.db
      .query("hr_zones")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        method: "custom",
        zones: args.zones,
      });
      return existing._id;
    }

    return await ctx.db.insert("hr_zones", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      method: "custom",
      zones: args.zones,
    });
  },
});

// ============================================================================
// update — update HR zones (owner only)
// ============================================================================

export const update = tenantMutation({
  args: {
    method: v.optional(methodValidator),
    maxHR: v.optional(v.number()),
    lactateThreshold: v.optional(v.number()),
    zones: v.optional(v.array(zoneEntryValidator)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("hr_zones")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .first();

    if (!existing) {
      throw new ConvexError("HR zones not found");
    }
    if (existing.userId !== ctx.userId || existing.tenantId !== ctx.tenantId) {
      throw new ConvexError("HR zones do not belong to you");
    }

    const updates: Record<string, unknown> = {};
    if (args.method !== undefined) updates.method = args.method;
    if (args.maxHR !== undefined) updates.maxHR = args.maxHR;
    if (args.lactateThreshold !== undefined) updates.lactateThreshold = args.lactateThreshold;
    if (args.zones !== undefined) updates.zones = args.zones;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(existing._id, updates);
    }

    return null;
  },
});
