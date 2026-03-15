import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Local validators ---

const ptTypeValidator = v.union(v.literal("recurring"), v.literal("one_time"));
const ptStatusValidator = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("cancelled")
);

// --- Return validator ---

const ptSessionValidator = v.object({
  _id: v.id("pt_sessions"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  coachId: v.id("users"),
  clientId: v.id("users"),
  type: ptTypeValidator,
  duration: v.number(),
  pricePerSession: v.optional(v.number()),
  notes: v.optional(v.string()),
  status: ptStatusValidator,
});

// ============================================================================
// listByCoach — list PT sessions for a coach (coach+)
// ============================================================================

export const listByCoach = tenantQuery({
  args: { coachId: v.optional(v.id("users")) },
  returns: v.array(ptSessionValidator),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const coachId = args.coachId ?? ctx.userId;
    return await ctx.db
      .query("pt_sessions")
      .withIndex("by_coachId", (q) => q.eq("coachId", coachId))
      .collect();
  },
});

// ============================================================================
// listByClient — list PT sessions for a client
// ============================================================================

export const listByClient = tenantQuery({
  args: { clientId: v.optional(v.id("users")) },
  returns: v.array(ptSessionValidator),
  handler: async (ctx, args) => {
    const clientId = args.clientId ?? ctx.userId;
    return await ctx.db
      .query("pt_sessions")
      .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
      .collect();
  },
});

// ============================================================================
// create — create a PT session (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    clientId: v.id("users"),
    type: ptTypeValidator,
    duration: v.number(),
    pricePerSession: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("pt_sessions"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db.insert("pt_sessions", {
      tenantId: ctx.tenantId,
      coachId: ctx.userId,
      ...args,
      status: "active",
    });
  },
});

// ============================================================================
// update — update a PT session (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    sessionId: v.id("pt_sessions"),
    type: v.optional(ptTypeValidator),
    duration: v.optional(v.number()),
    pricePerSession: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.tenantId !== ctx.tenantId) {
      throw new ConvexError("PT session not found");
    }

    const { sessionId: _id, ...updates } = args;
    await ctx.db.patch(args.sessionId, updates);

    return null;
  },
});

// ============================================================================
// remove — cancel a PT session (coach+)
// ============================================================================

export const remove = tenantMutation({
  args: { sessionId: v.id("pt_sessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.tenantId !== ctx.tenantId) {
      throw new ConvexError("PT session not found");
    }

    await ctx.db.patch(args.sessionId, { status: "cancelled" as const });

    return null;
  },
});
