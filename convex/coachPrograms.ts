import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { publishedStatusValidator } from "./lib/validators";

// --- Local validators ---

const periodizationTypeValidator = v.optional(
  v.union(
    v.literal("linear"),
    v.literal("undulating"),
    v.literal("conjugate"),
    v.literal("block")
  )
);

const trackValidator = v.optional(
  v.union(
    v.literal("Competitors"),
    v.literal("Fitness"),
    v.literal("Endurance"),
    v.literal("Foundations")
  )
);

// --- Return validators ---

const coachProgramValidator = v.object({
  _id: v.id("programs_coach"),
  _creationTime: v.number(),
  name: v.string(),
  tenantId: v.id("tenants"),
  authorId: v.id("users"),
  periodizationType: periodizationTypeValidator,
  phaseLabels: v.optional(v.array(v.string())),
  publishedStatus: publishedStatusValidator,
  track: trackValidator,
});

// ============================================================================
// list — list coach programs for the tenant
// ============================================================================

export const list = tenantQuery({
  args: {
    publishedStatus: v.optional(publishedStatusValidator),
  },
  returns: v.array(coachProgramValidator),
  handler: async (ctx, args) => {
    if (args.publishedStatus !== undefined) {
      return await ctx.db
        .query("programs_coach")
        .withIndex("by_tenantId_publishedStatus", (q) =>
          q
            .eq("tenantId", ctx.tenantId)
            .eq("publishedStatus", args.publishedStatus!)
        )
        .collect();
    }

    return await ctx.db
      .query("programs_coach")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// getById — get a single coach program by ID
// ============================================================================

export const getById = tenantQuery({
  args: {
    programId: v.id("programs_coach"),
  },
  returns: coachProgramValidator,
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    if (!program || program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Program not found");
    }
    return program;
  },
});

// ============================================================================
// create — create a new coach program (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    periodizationType: periodizationTypeValidator,
    phaseLabels: v.optional(v.array(v.string())),
    track: trackValidator,
  },
  returns: v.id("programs_coach"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db.insert("programs_coach", {
      tenantId: ctx.tenantId,
      authorId: ctx.userId,
      name: args.name,
      periodizationType: args.periodizationType,
      phaseLabels: args.phaseLabels,
      publishedStatus: "draft",
      track: args.track,
    });
  },
});

// ============================================================================
// update — update a coach program (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    programId: v.id("programs_coach"),
    name: v.optional(v.string()),
    periodizationType: v.optional(periodizationTypeValidator),
    phaseLabels: v.optional(v.array(v.string())),
    track: v.optional(trackValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const program = await ctx.db.get(args.programId);
    if (!program || program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Program not found");
    }

    const { programId: _id, ...updates } = args;
    await ctx.db.patch(args.programId, updates);

    return null;
  },
});

// ============================================================================
// publish — publish a coach program (coach+)
// ============================================================================

export const publish = tenantMutation({
  args: {
    programId: v.id("programs_coach"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const program = await ctx.db.get(args.programId);
    if (!program || program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Program not found");
    }

    await ctx.db.patch(args.programId, { publishedStatus: "published" as const });

    return null;
  },
});

// ============================================================================
// archive — archive a coach program (coach+)
// ============================================================================

export const archive = tenantMutation({
  args: {
    programId: v.id("programs_coach"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const program = await ctx.db.get(args.programId);
    if (!program || program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Program not found");
    }

    await ctx.db.patch(args.programId, { publishedStatus: "archived" as const });

    return null;
  },
});

// ============================================================================
// duplicate — deep copy a coach program with "(Copy)" suffix (coach+)
// ============================================================================

export const duplicate = tenantMutation({
  args: {
    programId: v.id("programs_coach"),
  },
  returns: v.id("programs_coach"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const original = await ctx.db.get(args.programId);
    if (!original || original.tenantId !== ctx.tenantId) {
      throw new ConvexError("Program not found");
    }

    const { _id, _creationTime, name, publishedStatus: _status, ...rest } = original;

    const newProgramId = await ctx.db.insert("programs_coach", {
      ...rest,
      name: name + " (Copy)",
      publishedStatus: "draft",
    });

    // Deep copy program days
    const days = await ctx.db
      .query("program_days")
      .withIndex("by_programId", (q) => q.eq("programId", args.programId))
      .collect();

    for (const day of days) {
      const { _id: _dayId, _creationTime: _dayCreation, programId: _pid, ...dayRest } = day;
      await ctx.db.insert("program_days", {
        ...dayRest,
        programId: newProgramId,
      });
    }

    return newProgramId;
  },
});

// ============================================================================
// createRevision — save current program state as a revision (coach+)
// ============================================================================

export const createRevision = tenantMutation({
  args: {
    programId: v.id("programs_coach"),
  },
  returns: v.id("program_revisions"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const program = await ctx.db.get(args.programId);
    if (!program || program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Program not found");
    }

    // Get current revision count to determine the next number
    const existingRevisions = await ctx.db
      .query("program_revisions")
      .withIndex("by_programId", (q) => q.eq("programId", args.programId))
      .collect();

    const revisionNumber = existingRevisions.length + 1;

    // Snapshot the program and its days
    const days = await ctx.db
      .query("program_days")
      .withIndex("by_programId", (q) => q.eq("programId", args.programId))
      .collect();

    const snapshotData = { program, days };

    return await ctx.db.insert("program_revisions", {
      programId: args.programId,
      revisionNumber,
      snapshotData,
      authorId: ctx.userId,
    });
  },
});
