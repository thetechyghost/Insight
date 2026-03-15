import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Return validators
// ============================================================================

const maintenanceTypeValidator = v.union(
  v.literal("preventive"),
  v.literal("repair"),
  v.literal("calibration")
);

const maintenanceValidator = v.object({
  _id: v.id("device_maintenance"),
  _creationTime: v.number(),
  deviceId: v.id("devices"),
  tenantId: v.id("tenants"),
  type: maintenanceTypeValidator,
  description: v.string(),
  performedBy: v.optional(v.id("users")),
  performedAt: v.number(),
  nextMaintenanceAt: v.optional(v.number()),
  notes: v.optional(v.string()),
});

// ============================================================================
// listByDevice — list maintenance records for a device (coach+)
// ============================================================================

export const listByDevice = tenantQuery({
  args: { deviceId: v.id("devices") },
  returns: v.array(maintenanceValidator),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const records = await ctx.db
      .query("device_maintenance")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .collect();

    return records.filter((r) => r.tenantId === ctx.tenantId);
  },
});

// ============================================================================
// create — log a maintenance record (admin+)
// ============================================================================

export const create = tenantMutation({
  args: {
    deviceId: v.id("devices"),
    type: maintenanceTypeValidator,
    description: v.string(),
    performedBy: v.optional(v.id("users")),
    performedAt: v.number(),
    nextMaintenanceAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("device_maintenance"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const device = await ctx.db.get(args.deviceId);
    if (!device) {
      throw new ConvexError("Device not found");
    }
    if (device.tenantId !== ctx.tenantId) {
      throw new ConvexError("Device does not belong to this tenant");
    }

    return await ctx.db.insert("device_maintenance", {
      deviceId: args.deviceId,
      tenantId: ctx.tenantId,
      type: args.type,
      description: args.description,
      performedBy: args.performedBy ?? ctx.userId,
      performedAt: args.performedAt,
      nextMaintenanceAt: args.nextMaintenanceAt,
      notes: args.notes,
    });
  },
});
