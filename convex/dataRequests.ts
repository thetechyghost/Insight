import { v, ConvexError } from "convex/values";
import { authedQuery, authedMutation } from "./lib/customFunctions";

const typeValidator = v.union(
  v.literal("access"),
  v.literal("export"),
  v.literal("deletion"),
  v.literal("rectification")
);

const statusValidator = v.union(
  v.literal("received"),
  v.literal("processing"),
  v.literal("completed")
);

const auditEntry = v.object({
  action: v.string(),
  timestamp: v.number(),
  details: v.optional(v.string()),
});

const requestDoc = v.object({
  _id: v.id("data_requests"),
  _creationTime: v.number(),
  userId: v.id("users"),
  type: typeValidator,
  status: statusValidator,
  submittedDate: v.number(),
  completedDate: v.optional(v.number()),
  auditTrail: v.optional(v.array(auditEntry)),
});

// ============================================================================
// listAll — list data requests, optionally filtered by status (super_admin)
// ============================================================================

export const listAll = authedQuery({
  args: { status: v.optional(statusValidator) },
  returns: v.array(requestDoc),
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("data_requests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("data_requests").collect();
  },
});

// ============================================================================
// submit — submit a new data request
// ============================================================================

export const submit = authedMutation({
  args: { type: typeValidator },
  returns: v.id("data_requests"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("data_requests", {
      userId: ctx.userId,
      type: args.type,
      status: "received",
      submittedDate: Date.now(),
    });
  },
});

// ============================================================================
// process — mark a data request as processing
// ============================================================================

export const process = authedMutation({
  args: { requestId: v.id("data_requests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new ConvexError("Data request not found");
    if (request.status !== "received") {
      throw new ConvexError("Only received requests can be processed");
    }
    const trail = request.auditTrail ?? [];
    trail.push({ action: "processing_started", timestamp: Date.now() });
    await ctx.db.patch(args.requestId, {
      status: "processing",
      auditTrail: trail,
    });
    return null;
  },
});

// ============================================================================
// complete — mark a data request as completed
// ============================================================================

export const complete = authedMutation({
  args: { requestId: v.id("data_requests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new ConvexError("Data request not found");
    if (request.status !== "processing") {
      throw new ConvexError("Only processing requests can be completed");
    }
    const trail = request.auditTrail ?? [];
    trail.push({ action: "completed", timestamp: Date.now() });
    await ctx.db.patch(args.requestId, {
      status: "completed",
      completedDate: Date.now(),
      auditTrail: trail,
    });
    return null;
  },
});
