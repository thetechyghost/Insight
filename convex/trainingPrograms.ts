import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { publishedStatusValidator } from "./lib/validators";

// ============================================================================
// Return validators
// ============================================================================

const trainingProgramValidator = v.object({
  _id: v.id("training_programs"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  name: v.string(),
  description: v.optional(v.string()),
  authorId: v.id("users"),
  weeks: v.number(),
  phaseLabels: v.optional(v.array(v.string())),
  publishedStatus: publishedStatusValidator,
  price: v.optional(v.number()),
  currency: v.optional(v.string()),
  averageRating: v.optional(v.number()),
  totalEnrollments: v.optional(v.number()),
});

const programAssignmentValidator = v.object({
  _id: v.id("program_assignments"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  programId: v.id("training_programs"),
  startDate: v.string(),
  currentWeek: v.optional(v.number()),
  status: v.optional(v.union(v.literal("active"), v.literal("completed"), v.literal("dropped"))),
});

const assignmentWithProgramValidator = v.object({
  assignment: programAssignmentValidator,
  program: v.union(trainingProgramValidator, v.null()),
});

// ============================================================================
// list — list training programs for the tenant, optionally filtered by status
// ============================================================================

export const list = tenantQuery({
  args: {
    publishedStatus: v.optional(publishedStatusValidator),
  },
  returns: v.array(trainingProgramValidator),
  handler: async (ctx, args) => {
    const programs = await ctx.db
      .query("training_programs")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();

    if (args.publishedStatus !== undefined) {
      return programs.filter((p) => p.publishedStatus === args.publishedStatus);
    }

    return programs;
  },
});

// ============================================================================
// getById — get a single training program by ID
// ============================================================================

export const getById = tenantQuery({
  args: { programId: v.id("training_programs") },
  returns: trainingProgramValidator,
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    if (!program) {
      throw new ConvexError("Training program not found");
    }
    if (program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Training program does not belong to this tenant");
    }
    return program;
  },
});

// ============================================================================
// getMyAssignments — get the current user's program assignments with programs
// ============================================================================

export const getMyAssignments = tenantQuery({
  args: {},
  returns: v.array(assignmentWithProgramValidator),
  handler: async (ctx) => {
    const assignments = await ctx.db
      .query("program_assignments")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();

    const results = await Promise.all(
      assignments.map(async (assignment) => {
        const program = await ctx.db.get(assignment.programId);
        return { assignment, program };
      })
    );

    return results;
  },
});

// ============================================================================
// create — create a new training program (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    weeks: v.number(),
    phaseLabels: v.optional(v.array(v.string())),
    publishedStatus: publishedStatusValidator,
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  returns: v.id("training_programs"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db.insert("training_programs", {
      tenantId: ctx.tenantId,
      name: args.name,
      description: args.description,
      authorId: ctx.userId,
      weeks: args.weeks,
      phaseLabels: args.phaseLabels,
      publishedStatus: args.publishedStatus,
      price: args.price,
      currency: args.currency,
    });
  },
});

// ============================================================================
// update — update a training program (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    programId: v.id("training_programs"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    weeks: v.optional(v.number()),
    phaseLabels: v.optional(v.array(v.string())),
    publishedStatus: v.optional(publishedStatusValidator),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const program = await ctx.db.get(args.programId);
    if (!program) {
      throw new ConvexError("Training program not found");
    }
    if (program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Training program does not belong to this tenant");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.weeks !== undefined) updates.weeks = args.weeks;
    if (args.phaseLabels !== undefined) updates.phaseLabels = args.phaseLabels;
    if (args.publishedStatus !== undefined) updates.publishedStatus = args.publishedStatus;
    if (args.price !== undefined) updates.price = args.price;
    if (args.currency !== undefined) updates.currency = args.currency;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.programId, updates);
    }

    return null;
  },
});

// ============================================================================
// assignToUser — assign a program to a user (coach+)
// ============================================================================

export const assignToUser = tenantMutation({
  args: {
    programId: v.id("training_programs"),
    userId: v.id("users"),
    startDate: v.string(),
  },
  returns: v.id("program_assignments"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const program = await ctx.db.get(args.programId);
    if (!program) {
      throw new ConvexError("Training program not found");
    }
    if (program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Training program does not belong to this tenant");
    }

    return await ctx.db.insert("program_assignments", {
      userId: args.userId,
      tenantId: ctx.tenantId,
      programId: args.programId,
      startDate: args.startDate,
      currentWeek: 1,
      status: "active",
    });
  },
});

// ============================================================================
// unassign — remove a program assignment (coach+)
// ============================================================================

export const unassign = tenantMutation({
  args: { assignmentId: v.id("program_assignments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new ConvexError("Program assignment not found");
    }
    if (assignment.tenantId !== ctx.tenantId) {
      throw new ConvexError("Program assignment does not belong to this tenant");
    }

    await ctx.db.delete(args.assignmentId);
    return null;
  },
});
