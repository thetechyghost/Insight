import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// --- Local validators ---

const registrationStatusValidator = v.union(
  v.literal("registered"),
  v.literal("waitlisted"),
  v.literal("attended"),
  v.literal("no_show"),
  v.literal("late_cancel")
);

const bookingSourceValidator = v.optional(
  v.union(v.literal("app"), v.literal("web"), v.literal("front_desk"))
);

// --- Return validator ---

const classRegistrationValidator = v.object({
  _id: v.id("class_registrations"),
  _creationTime: v.number(),
  classSessionId: v.id("class_sessions"),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  status: registrationStatusValidator,
  checkInTime: v.optional(v.number()),
  checkOutTime: v.optional(v.number()),
  cancellationTimestamp: v.optional(v.number()),
  penaltyApplied: v.optional(v.boolean()),
  bookingSource: bookingSourceValidator,
});

// ============================================================================
// listBySession — list registrations for a class session (coach+)
// ============================================================================

export const listBySession = tenantQuery({
  args: {
    classSessionId: v.id("class_sessions"),
  },
  returns: v.array(classRegistrationValidator),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db
      .query("class_registrations")
      .withIndex("by_classSessionId", (q) =>
        q.eq("classSessionId", args.classSessionId)
      )
      .collect();
  },
});

// ============================================================================
// register — register for a class session (check capacity, waitlist if full)
// ============================================================================

export const register = tenantMutation({
  args: {
    classSessionId: v.id("class_sessions"),
    bookingSource: bookingSourceValidator,
  },
  returns: v.id("class_registrations"),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.classSessionId);
    if (!session || session.tenantId !== ctx.tenantId) {
      throw new ConvexError("Class session not found");
    }

    // Check for existing registration
    const existing = await ctx.db
      .query("class_registrations")
      .withIndex("by_classSessionId", (q) =>
        q.eq("classSessionId", args.classSessionId)
      )
      .collect();

    const alreadyRegistered = existing.find(
      (r) =>
        r.userId === ctx.userId &&
        (r.status === "registered" || r.status === "waitlisted")
    );
    if (alreadyRegistered) {
      throw new ConvexError("Already registered for this session");
    }

    // Get class to check capacity
    const cls = await ctx.db.get(session.classId);
    if (!cls) {
      throw new ConvexError("Class not found");
    }

    const registeredCount = existing.filter(
      (r) => r.status === "registered"
    ).length;
    const isFull = registeredCount >= cls.capacity;

    return await ctx.db.insert("class_registrations", {
      classSessionId: args.classSessionId,
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      status: isFull ? ("waitlisted" as const) : ("registered" as const),
      ...(args.bookingSource !== undefined
        ? { bookingSource: args.bookingSource }
        : {}),
    });
  },
});

// ============================================================================
// cancel — cancel own registration
// ============================================================================

export const cancel = tenantMutation({
  args: {
    registrationId: v.id("class_registrations"),
  },
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
      status: "late_cancel" as const,
      cancellationTimestamp: Date.now(),
    });

    return null;
  },
});

// ============================================================================
// checkIn — mark a registration as attended (coach+)
// ============================================================================

export const checkIn = tenantMutation({
  args: {
    registrationId: v.id("class_registrations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const registration = await ctx.db.get(args.registrationId);
    if (!registration || registration.tenantId !== ctx.tenantId) {
      throw new ConvexError("Registration not found");
    }

    await ctx.db.patch(args.registrationId, {
      status: "attended" as const,
      checkInTime: Date.now(),
    });

    return null;
  },
});

// ============================================================================
// checkOut — set checkout time on a registration (coach+)
// ============================================================================

export const checkOut = tenantMutation({
  args: {
    registrationId: v.id("class_registrations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const registration = await ctx.db.get(args.registrationId);
    if (!registration || registration.tenantId !== ctx.tenantId) {
      throw new ConvexError("Registration not found");
    }

    await ctx.db.patch(args.registrationId, {
      checkOutTime: Date.now(),
    });

    return null;
  },
});

// ============================================================================
// markNoShow — mark a registration as no-show (coach+)
// ============================================================================

export const markNoShow = tenantMutation({
  args: {
    registrationId: v.id("class_registrations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const registration = await ctx.db.get(args.registrationId);
    if (!registration || registration.tenantId !== ctx.tenantId) {
      throw new ConvexError("Registration not found");
    }

    await ctx.db.patch(args.registrationId, {
      status: "no_show" as const,
    });

    return null;
  },
});

// ============================================================================
// promoteFromWaitlist — promote next waitlisted registration (internal)
// ============================================================================

export const promoteFromWaitlist = internalMutation({
  args: {
    classSessionId: v.id("class_sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const waitlisted = await ctx.db
      .query("class_registrations")
      .withIndex("by_classSessionId_status", (q) =>
        q
          .eq("classSessionId", args.classSessionId)
          .eq("status", "waitlisted")
      )
      .first();

    if (waitlisted) {
      await ctx.db.patch(waitlisted._id, {
        status: "registered" as const,
      });
    }

    return null;
  },
});
