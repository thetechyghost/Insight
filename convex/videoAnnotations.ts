import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Local validators ---

const annotationTypeValidator = v.union(
  v.literal("drawing"),
  v.literal("text"),
  v.literal("voice_over")
);

// --- Return validator ---

const videoAnnotationValidator = v.object({
  _id: v.id("video_annotations"),
  _creationTime: v.number(),
  videoSubmissionId: v.id("video_submissions"),
  frameTimestamp: v.number(),
  annotationType: annotationTypeValidator,
  content: v.optional(v.string()),
  fileId: v.optional(v.id("_storage")),
  annotationTemplateId: v.optional(v.id("annotation_templates")),
});

// ============================================================================
// listByVideo — list all annotations for a video submission
// ============================================================================

export const listByVideo = tenantQuery({
  args: {
    videoSubmissionId: v.id("video_submissions"),
  },
  returns: v.array(videoAnnotationValidator),
  handler: async (ctx, args) => {
    // Verify the video belongs to this tenant
    const submission = await ctx.db.get(args.videoSubmissionId);
    if (!submission || submission.tenantId !== ctx.tenantId) {
      throw new ConvexError("Video submission not found");
    }

    return await ctx.db
      .query("video_annotations")
      .withIndex("by_videoSubmissionId", (q) =>
        q.eq("videoSubmissionId", args.videoSubmissionId)
      )
      .collect();
  },
});

// ============================================================================
// create — create an annotation on a video (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    videoSubmissionId: v.id("video_submissions"),
    frameTimestamp: v.number(),
    annotationType: annotationTypeValidator,
    content: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    annotationTemplateId: v.optional(v.id("annotation_templates")),
  },
  returns: v.id("video_annotations"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const submission = await ctx.db.get(args.videoSubmissionId);
    if (!submission || submission.tenantId !== ctx.tenantId) {
      throw new ConvexError("Video submission not found");
    }

    return await ctx.db.insert("video_annotations", {
      videoSubmissionId: args.videoSubmissionId,
      frameTimestamp: args.frameTimestamp,
      annotationType: args.annotationType,
      content: args.content,
      fileId: args.fileId,
      annotationTemplateId: args.annotationTemplateId,
    });
  },
});

// ============================================================================
// update — update an annotation (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    annotationId: v.id("video_annotations"),
    frameTimestamp: v.optional(v.number()),
    annotationType: v.optional(annotationTypeValidator),
    content: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    annotationTemplateId: v.optional(v.id("annotation_templates")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const annotation = await ctx.db.get(args.annotationId);
    if (!annotation) {
      throw new ConvexError("Annotation not found");
    }

    // Verify tenant ownership via the video submission
    const submission = await ctx.db.get(annotation.videoSubmissionId);
    if (!submission || submission.tenantId !== ctx.tenantId) {
      throw new ConvexError("Video submission not found");
    }

    const { annotationId: _id, ...updates } = args;
    await ctx.db.patch(args.annotationId, updates);

    return null;
  },
});

// ============================================================================
// remove — delete an annotation (coach+)
// ============================================================================

export const remove = tenantMutation({
  args: {
    annotationId: v.id("video_annotations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const annotation = await ctx.db.get(args.annotationId);
    if (!annotation) {
      throw new ConvexError("Annotation not found");
    }

    const submission = await ctx.db.get(annotation.videoSubmissionId);
    if (!submission || submission.tenantId !== ctx.tenantId) {
      throw new ConvexError("Video submission not found");
    }

    await ctx.db.delete(args.annotationId);

    return null;
  },
});
