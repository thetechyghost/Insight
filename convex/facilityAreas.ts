import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

const areaDoc = v.object({
  _id: v.id("facility_areas"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  name: v.string(),
  capacity: v.optional(v.number()),
  equipmentList: v.optional(v.array(v.string())),
  bookingRules: v.optional(v.any()),
});

// ============================================================================
// list — list facility areas for the tenant
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(areaDoc),
  handler: async (ctx) => {
    return await ctx.db
      .query("facility_areas")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// create — create a new facility area (admin+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    capacity: v.optional(v.number()),
    equipmentList: v.optional(v.array(v.string())),
    bookingRules: v.optional(v.any()),
  },
  returns: v.id("facility_areas"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    return await ctx.db.insert("facility_areas", {
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});

// ============================================================================
// update — update a facility area (admin+)
// ============================================================================

export const update = tenantMutation({
  args: {
    areaId: v.id("facility_areas"),
    name: v.optional(v.string()),
    capacity: v.optional(v.number()),
    equipmentList: v.optional(v.array(v.string())),
    bookingRules: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const area = await ctx.db.get(args.areaId);
    if (!area) throw new ConvexError("Facility area not found");
    if (area.tenantId !== ctx.tenantId) {
      throw new ConvexError("Area does not belong to this tenant");
    }
    const { areaId, ...updates } = args;
    await ctx.db.patch(areaId, updates);
    return null;
  },
});

// ============================================================================
// remove — soft-delete a facility area (admin+)
// ============================================================================

export const remove = tenantMutation({
  args: { areaId: v.id("facility_areas") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const area = await ctx.db.get(args.areaId);
    if (!area) throw new ConvexError("Facility area not found");
    if (area.tenantId !== ctx.tenantId) {
      throw new ConvexError("Area does not belong to this tenant");
    }
    await ctx.db.delete(args.areaId);
    return null;
  },
});
