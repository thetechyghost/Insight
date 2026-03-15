import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

const methodValidator = v.union(
  v.literal("QR"),
  v.literal("NFC"),
  v.literal("PIN"),
  v.literal("barcode")
);

const systemDoc = v.object({
  _id: v.id("check_in_systems"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  method: methodValidator,
  deviceRegistration: v.optional(v.any()),
  location: v.optional(v.string()),
});

// ============================================================================
// list — list check-in systems for the tenant
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(systemDoc),
  handler: async (ctx) => {
    return await ctx.db
      .query("check_in_systems")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// create — create a new check-in system (admin+)
// ============================================================================

export const create = tenantMutation({
  args: {
    method: methodValidator,
    deviceRegistration: v.optional(v.any()),
    location: v.optional(v.string()),
  },
  returns: v.id("check_in_systems"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    return await ctx.db.insert("check_in_systems", {
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});

// ============================================================================
// update — update a check-in system (admin+)
// ============================================================================

export const update = tenantMutation({
  args: {
    systemId: v.id("check_in_systems"),
    method: v.optional(methodValidator),
    deviceRegistration: v.optional(v.any()),
    location: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const system = await ctx.db.get(args.systemId);
    if (!system) throw new ConvexError("Check-in system not found");
    if (system.tenantId !== ctx.tenantId) {
      throw new ConvexError("System does not belong to this tenant");
    }
    const { systemId, ...updates } = args;
    await ctx.db.patch(systemId, updates);
    return null;
  },
});

// ============================================================================
// remove — delete a check-in system (admin+)
// ============================================================================

export const remove = tenantMutation({
  args: { systemId: v.id("check_in_systems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const system = await ctx.db.get(args.systemId);
    if (!system) throw new ConvexError("Check-in system not found");
    if (system.tenantId !== ctx.tenantId) {
      throw new ConvexError("System does not belong to this tenant");
    }
    await ctx.db.delete(args.systemId);
    return null;
  },
});
