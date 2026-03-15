import { v } from "convex/values";
import { tenantQuery, enforceRole } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

const methodValidator = v.union(
  v.literal("QR"),
  v.literal("NFC"),
  v.literal("PIN"),
  v.literal("barcode"),
  v.literal("manual")
);

const logDoc = v.object({
  _id: v.id("access_log"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  areaId: v.optional(v.id("facility_areas")),
  timestamp: v.number(),
  method: methodValidator,
  granted: v.boolean(),
});

// ============================================================================
// list — list access log entries for the tenant (admin+), paginated
// ============================================================================

export const list = tenantQuery({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  returns: v.array(logDoc),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const limit = args.limit ?? 50;

    let q = ctx.db
      .query("access_log")
      .withIndex("by_tenantId_timestamp", (idx) => {
        let query = idx.eq("tenantId", ctx.tenantId);
        if (args.cursor !== undefined) {
          query = query.lte("timestamp", args.cursor);
        }
        return query;
      })
      .order("desc");

    return await q.take(limit);
  },
});

// ============================================================================
// create — internal mutation to record an access log entry
// ============================================================================

export const create = internalMutation({
  args: {
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    areaId: v.optional(v.id("facility_areas")),
    method: methodValidator,
    granted: v.boolean(),
  },
  returns: v.id("access_log"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("access_log", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
