import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const privacySettingValidator = v.union(
  v.literal("private"),
  v.literal("coach_only"),
  v.literal("gym")
);

// ============================================================================
// Return validators
// ============================================================================

const progressPhotoValidator = v.object({
  _id: v.id("progress_photos"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  fileId: v.id("_storage"),
  date: v.string(),
  bodyRegionTags: v.optional(v.array(v.string())),
  privacySetting: privacySettingValidator,
});

// ============================================================================
// listMine — list the current user's progress photos
// ============================================================================

export const listMine = tenantQuery({
  args: {},
  returns: v.array(progressPhotoValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("progress_photos")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .order("desc")
      .collect();
  },
});

// ============================================================================
// getById — get a single photo (owner, or coach if coach_only/gym)
// ============================================================================

export const getById = tenantQuery({
  args: { photoId: v.id("progress_photos") },
  returns: progressPhotoValidator,
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.tenantId !== ctx.tenantId) {
      throw new ConvexError("Progress photo not found");
    }

    if (photo.userId !== ctx.userId) {
      if (photo.privacySetting === "private") {
        throw new ConvexError("Progress photo not found");
      }
      enforceRole(ctx.role, "coach");
    }

    return photo;
  },
});

// ============================================================================
// generateUploadUrl — generate a signed upload URL for photo storage
// ============================================================================

export const generateUploadUrl = tenantMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// ============================================================================
// create — create a new progress photo record
// ============================================================================

export const create = tenantMutation({
  args: {
    fileId: v.id("_storage"),
    date: v.string(),
    bodyRegionTags: v.optional(v.array(v.string())),
    privacySetting: privacySettingValidator,
  },
  returns: v.id("progress_photos"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("progress_photos", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});

// ============================================================================
// update — update a progress photo (owner only)
// ============================================================================

export const update = tenantMutation({
  args: {
    photoId: v.id("progress_photos"),
    date: v.optional(v.string()),
    bodyRegionTags: v.optional(v.array(v.string())),
    privacySetting: v.optional(privacySettingValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.userId !== ctx.userId || photo.tenantId !== ctx.tenantId) {
      throw new ConvexError("Progress photo not found");
    }

    const { photoId: _id, ...updates } = args;
    await ctx.db.patch(args.photoId, updates);

    return null;
  },
});

// ============================================================================
// remove — delete a progress photo and its storage file (owner only)
// ============================================================================

export const remove = tenantMutation({
  args: { photoId: v.id("progress_photos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.userId !== ctx.userId || photo.tenantId !== ctx.tenantId) {
      throw new ConvexError("Progress photo not found");
    }

    await ctx.storage.delete(photo.fileId);
    await ctx.db.delete(args.photoId);
    return null;
  },
});

// ============================================================================
// getComparison — get oldest + newest photos in a date range for comparison
// ============================================================================

export const getComparison = tenantQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.object({
    oldest: v.union(progressPhotoValidator, v.null()),
    newest: v.union(progressPhotoValidator, v.null()),
  }),
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("progress_photos")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", ctx.userId).gte("date", args.startDate).lte("date", args.endDate)
      )
      .collect();

    const tenantPhotos = photos.filter((p) => p.tenantId === ctx.tenantId);

    if (tenantPhotos.length === 0) {
      return { oldest: null, newest: null };
    }

    tenantPhotos.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    return {
      oldest: tenantPhotos[0],
      newest: tenantPhotos[tenantPhotos.length - 1],
    };
  },
});
