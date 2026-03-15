import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// ============================================================================
// Return validators
// ============================================================================

const deviceTypeValidator = v.union(
  v.literal("RowErg"),
  v.literal("BikeErg"),
  v.literal("SkiErg"),
  v.literal("Treadmill"),
  v.literal("AssaultBike")
);

const deviceValidator = v.object({
  _id: v.id("devices"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  name: v.string(),
  type: deviceTypeValidator,
  serialNumber: v.optional(v.string()),
  locationLabel: v.optional(v.string()),
  isOnline: v.boolean(),
  lastSeenAt: v.optional(v.number()),
  firmwareVersion: v.optional(v.string()),
  iotHubDeviceId: v.optional(v.string()),
});

// ============================================================================
// listByTenant — list all devices for the tenant (coach+)
// ============================================================================

export const listByTenant = tenantQuery({
  args: {},
  returns: v.array(deviceValidator),
  handler: async (ctx) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db
      .query("devices")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// getById — get a single device by ID
// ============================================================================

export const getById = tenantQuery({
  args: { deviceId: v.id("devices") },
  returns: deviceValidator,
  handler: async (ctx, args) => {
    const device = await ctx.db.get(args.deviceId);
    if (!device) {
      throw new ConvexError("Device not found");
    }
    if (device.tenantId !== ctx.tenantId) {
      throw new ConvexError("Device does not belong to this tenant");
    }
    return device;
  },
});

// ============================================================================
// register — register a new device (admin+)
// ============================================================================

export const register = tenantMutation({
  args: {
    name: v.string(),
    type: deviceTypeValidator,
    serialNumber: v.optional(v.string()),
    locationLabel: v.optional(v.string()),
    firmwareVersion: v.optional(v.string()),
    iotHubDeviceId: v.optional(v.string()),
  },
  returns: v.id("devices"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    return await ctx.db.insert("devices", {
      tenantId: ctx.tenantId,
      name: args.name,
      type: args.type,
      serialNumber: args.serialNumber,
      locationLabel: args.locationLabel,
      isOnline: false,
      firmwareVersion: args.firmwareVersion,
      iotHubDeviceId: args.iotHubDeviceId,
    });
  },
});

// ============================================================================
// updateStatus — update device online status (internal, no auth)
// ============================================================================

export const updateStatus = internalMutation({
  args: {
    deviceId: v.id("devices"),
    isOnline: v.boolean(),
    lastSeenAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const device = await ctx.db.get(args.deviceId);
    if (!device) {
      throw new ConvexError("Device not found");
    }

    await ctx.db.patch(args.deviceId, {
      isOnline: args.isOnline,
      lastSeenAt: args.lastSeenAt,
    });
    return null;
  },
});

// ============================================================================
// update — update device details (admin+)
// ============================================================================

export const update = tenantMutation({
  args: {
    deviceId: v.id("devices"),
    name: v.optional(v.string()),
    locationLabel: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const device = await ctx.db.get(args.deviceId);
    if (!device) {
      throw new ConvexError("Device not found");
    }
    if (device.tenantId !== ctx.tenantId) {
      throw new ConvexError("Device does not belong to this tenant");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.locationLabel !== undefined) updates.locationLabel = args.locationLabel;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.deviceId, updates);
    }

    return null;
  },
});

// ============================================================================
// deregister — remove a device (admin+)
// ============================================================================

export const deregister = tenantMutation({
  args: { deviceId: v.id("devices") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const device = await ctx.db.get(args.deviceId);
    if (!device) {
      throw new ConvexError("Device not found");
    }
    if (device.tenantId !== ctx.tenantId) {
      throw new ConvexError("Device does not belong to this tenant");
    }

    await ctx.db.delete(args.deviceId);
    return null;
  },
});
