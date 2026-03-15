import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Local validators ---

const ptBookingStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("no_show")
);

// --- Return validator ---

const ptBookingValidator = v.object({
  _id: v.id("pt_bookings"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  ptSessionId: v.id("pt_sessions"),
  date: v.string(),
  startTime: v.string(),
  endTime: v.string(),
  status: ptBookingStatusValidator,
  cancelledAt: v.optional(v.number()),
  notes: v.optional(v.string()),
});

// ============================================================================
// listUpcoming — list upcoming PT bookings for the tenant
// ============================================================================

export const listUpcoming = tenantQuery({
  args: {},
  returns: v.array(ptBookingValidator),
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    const bookings = await ctx.db
      .query("pt_bookings")
      .withIndex("by_tenantId_date", (q) =>
        q.eq("tenantId", ctx.tenantId).gte("date", today)
      )
      .collect();
    return bookings;
  },
});

// ============================================================================
// create — create a PT booking (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    ptSessionId: v.id("pt_sessions"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    notes: v.optional(v.string()),
  },
  returns: v.id("pt_bookings"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const session = await ctx.db.get(args.ptSessionId);
    if (!session || session.tenantId !== ctx.tenantId) {
      throw new ConvexError("PT session not found");
    }

    return await ctx.db.insert("pt_bookings", {
      tenantId: ctx.tenantId,
      ...args,
      status: "scheduled",
    });
  },
});

// ============================================================================
// cancel — cancel a PT booking
// ============================================================================

export const cancel = tenantMutation({
  args: { bookingId: v.id("pt_bookings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.tenantId !== ctx.tenantId) {
      throw new ConvexError("PT booking not found");
    }

    await ctx.db.patch(args.bookingId, {
      status: "cancelled" as const,
      cancelledAt: Date.now(),
    });

    return null;
  },
});

// ============================================================================
// complete — mark a PT booking as completed (coach+)
// ============================================================================

export const complete = tenantMutation({
  args: { bookingId: v.id("pt_bookings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.tenantId !== ctx.tenantId) {
      throw new ConvexError("PT booking not found");
    }

    await ctx.db.patch(args.bookingId, { status: "completed" as const });

    return null;
  },
});

// ============================================================================
// markNoShow — mark a PT booking as no-show (coach+)
// ============================================================================

export const markNoShow = tenantMutation({
  args: { bookingId: v.id("pt_bookings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.tenantId !== ctx.tenantId) {
      throw new ConvexError("PT booking not found");
    }

    await ctx.db.patch(args.bookingId, { status: "no_show" as const });

    return null;
  },
});
