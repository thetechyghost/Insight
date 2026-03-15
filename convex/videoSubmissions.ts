import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Local validators ---

const submissionStatusValidator = v.union(
  v.literal("pending"),
  v.literal("reviewed"),
  v.literal("returned")
);

// --- Return validator ---

const videoSubmissionValidator = v.object({
  _id: v.id("video_submissions"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  fileId: v.id("_storage"),
  movementTag: v.optional(v.string()),
  status: submissionStatusValidator,
  submittedAt: v.number(),
});

// ============================================================================
// listPending — list pending video submissions (coach+)
// ============================================================================

export const listPending = tenantQuery({
  args: {},
  returns: v.array(videoSubmissionValidator),
  handler: async (ctx) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db
      .query("video_submissions")
      .withIndex("by_tenantId_status", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("status", "pending")
      )
      .collect();
  },
});

// ============================================================================
// listMine — list own video submissions
// ============================================================================

export const listMine = tenantQuery({
  args: {},
  returns: v.array(videoSubmissionValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("video_submissions")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.userId))
      .filter((q) => q.eq(q.field("tenantId"), ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// getById — get a single video submission by ID
// ============================================================================

export const getById = tenantQuery({
  args: {
    submissionId: v.id("video_submissions"),
  },
  returns: videoSubmissionValidator,
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission || submission.tenantId !== ctx.tenantId) {
      throw new ConvexError("Video submission not found");
    }
    return submission;
  },
});

// ============================================================================
// submit — submit a video for review
// ============================================================================

export const submit = tenantMutation({
  args: {
    fileId: v.id("_storage"),
    movementTag: v.optional(v.string()),
  },
  returns: v.id("video_submissions"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("video_submissions", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      fileId: args.fileId,
      movementTag: args.movementTag,
      status: "pending",
      submittedAt: Date.now(),
    });
  },
});

// ============================================================================
// review — mark a video submission as reviewed (coach+)
// ============================================================================

export const review = tenantMutation({
  args: {
    submissionId: v.id("video_submissions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const submission = await ctx.db.get(args.submissionId);
    if (!submission || submission.tenantId !== ctx.tenantId) {
      throw new ConvexError("Video submission not found");
    }

    await ctx.db.patch(args.submissionId, {
      status: "reviewed" as const,
    });

    return null;
  },
});
