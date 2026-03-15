import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

const holidayOverride = v.object({
  date: v.string(),
  openTime: v.optional(v.string()),
  closeTime: v.optional(v.string()),
  isClosed: v.boolean(),
});

const hoursDoc = v.object({
  _id: v.id("facility_hours"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  dayOfWeek: v.number(),
  openTime: v.string(),
  closeTime: v.string(),
  holidayOverrides: v.optional(v.array(holidayOverride)),
});

// ============================================================================
// list — list facility hours for the tenant
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(hoursDoc),
  handler: async (ctx) => {
    return await ctx.db
      .query("facility_hours")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// upsert — create or update hours for a day of week (admin+)
// ============================================================================

export const upsert = tenantMutation({
  args: {
    dayOfWeek: v.number(),
    openTime: v.string(),
    closeTime: v.string(),
    holidayOverrides: v.optional(v.array(holidayOverride)),
  },
  returns: v.id("facility_hours"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
      throw new ConvexError("dayOfWeek must be between 0 and 6");
    }

    const existing = await ctx.db
      .query("facility_hours")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();

    const match = existing.find((h) => h.dayOfWeek === args.dayOfWeek);

    if (match) {
      await ctx.db.patch(match._id, {
        openTime: args.openTime,
        closeTime: args.closeTime,
        holidayOverrides: args.holidayOverrides,
      });
      return match._id;
    }

    return await ctx.db.insert("facility_hours", {
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});
