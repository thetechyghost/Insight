import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Local validators ---

const registrationStatusValidator = v.union(
  v.literal("registered"),
  v.literal("cancelled"),
  v.literal("attended")
);

// --- Return validator ---

const eventRegistrationValidator = v.object({
  _id: v.id("event_registrations"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  eventId: v.id("events"),
  userId: v.id("users"),
  status: registrationStatusValidator,
  registeredAt: v.number(),
  cancelledAt: v.optional(v.number()),
});

// ============================================================================
// listByEvent — list registrations for an event
// ============================================================================

export const listByEvent = tenantQuery({
  args: { eventId: v.id("events") },
  returns: v.array(eventRegistrationValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("event_registrations")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .collect();
  },
});

// ============================================================================
// register — register for an event (check capacity)
// ============================================================================

export const register = tenantMutation({
  args: { eventId: v.id("events") },
  returns: v.id("event_registrations"),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.tenantId !== ctx.tenantId) {
      throw new ConvexError("Event not found");
    }

    if (event.status === "cancelled") {
      throw new ConvexError("Event is cancelled");
    }

    // Check for existing registration
    const existing = await ctx.db
      .query("event_registrations")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .collect();

    const alreadyRegistered = existing.find(
      (r) => r.userId === ctx.userId && r.status === "registered"
    );
    if (alreadyRegistered) {
      throw new ConvexError("Already registered for this event");
    }

    // Check capacity
    if (event.maxCapacity) {
      const registeredCount = existing.filter(
        (r) => r.status === "registered"
      ).length;
      if (registeredCount >= event.maxCapacity) {
        throw new ConvexError("Event is at full capacity");
      }
    }

    return await ctx.db.insert("event_registrations", {
      tenantId: ctx.tenantId,
      eventId: args.eventId,
      userId: ctx.userId,
      status: "registered",
      registeredAt: Date.now(),
    });
  },
});

// ============================================================================
// cancel — cancel own registration
// ============================================================================

export const cancel = tenantMutation({
  args: { registrationId: v.id("event_registrations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (!registration || registration.tenantId !== ctx.tenantId) {
      throw new ConvexError("Registration not found");
    }

    if (registration.userId !== ctx.userId) {
      throw new ConvexError("Can only cancel your own registration");
    }

    await ctx.db.patch(args.registrationId, {
      status: "cancelled" as const,
      cancelledAt: Date.now(),
    });

    return null;
  },
});

// ============================================================================
// markAttended — mark a registration as attended (coach+)
// ============================================================================

export const markAttended = tenantMutation({
  args: { registrationId: v.id("event_registrations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const registration = await ctx.db.get(args.registrationId);
    if (!registration || registration.tenantId !== ctx.tenantId) {
      throw new ConvexError("Registration not found");
    }

    await ctx.db.patch(args.registrationId, {
      status: "attended" as const,
    });

    return null;
  },
});
