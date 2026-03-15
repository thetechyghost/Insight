import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Local validators ---

const eventStatusValidator = v.union(
  v.literal("upcoming"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("cancelled")
);

// --- Return validator ---

const eventValidator = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  name: v.string(),
  description: v.optional(v.string()),
  date: v.string(),
  startTime: v.string(),
  endTime: v.optional(v.string()),
  location: v.optional(v.string()),
  maxCapacity: v.optional(v.number()),
  registrationDeadline: v.optional(v.string()),
  status: eventStatusValidator,
  createdBy: v.id("users"),
});

// ============================================================================
// list — list events for the tenant, optionally filtered by status
// ============================================================================

export const list = tenantQuery({
  args: { status: v.optional(eventStatusValidator) },
  returns: v.array(eventValidator),
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();

    if (args.status) {
      return events.filter((e) => e.status === args.status);
    }
    return events;
  },
});

// ============================================================================
// getById — get a single event by ID
// ============================================================================

export const getById = tenantQuery({
  args: { eventId: v.id("events") },
  returns: eventValidator,
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.tenantId !== ctx.tenantId) {
      throw new ConvexError("Event not found");
    }
    return event;
  },
});

// ============================================================================
// create — create an event (admin+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    maxCapacity: v.optional(v.number()),
    registrationDeadline: v.optional(v.string()),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    return await ctx.db.insert("events", {
      tenantId: ctx.tenantId,
      ...args,
      status: "upcoming",
      createdBy: ctx.userId,
    });
  },
});

// ============================================================================
// update — update an event (admin+)
// ============================================================================

export const update = tenantMutation({
  args: {
    eventId: v.id("events"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    maxCapacity: v.optional(v.number()),
    registrationDeadline: v.optional(v.string()),
    status: v.optional(eventStatusValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const event = await ctx.db.get(args.eventId);
    if (!event || event.tenantId !== ctx.tenantId) {
      throw new ConvexError("Event not found");
    }

    const { eventId: _id, ...updates } = args;
    await ctx.db.patch(args.eventId, updates);

    return null;
  },
});

// ============================================================================
// remove — cancel an event (admin+)
// ============================================================================

export const remove = tenantMutation({
  args: { eventId: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const event = await ctx.db.get(args.eventId);
    if (!event || event.tenantId !== ctx.tenantId) {
      throw new ConvexError("Event not found");
    }

    await ctx.db.patch(args.eventId, { status: "cancelled" as const });

    return null;
  },
});
