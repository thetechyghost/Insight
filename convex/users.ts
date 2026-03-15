import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { authedQuery, authedMutation } from "./lib/customFunctions";
import { ConvexError } from "convex/values";
import {
  genderValidator,
  onboardingStatusValidator,
  unitPreferencesValidator,
  notificationPrefsValidator,
  emergencyContactValidator,
  scalingDesignationValidator,
} from "./lib/validators";

// ============================================================================
// getMe — return the authenticated user's full profile
// ============================================================================

export const getMe = authedQuery({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.string(),
      email: v.string(),
      avatarStorageId: v.optional(v.id("_storage")),
      bio: v.optional(v.string()),
      height: v.optional(v.number()),
      weight: v.optional(v.number()),
      dateOfBirth: v.optional(v.string()),
      gender: v.optional(genderValidator),
      trainingStartDate: v.optional(v.string()),
      emergencyContact: v.optional(emergencyContactValidator),
      medicalInfo: v.optional(v.string()),
      notificationPrefs: v.optional(notificationPrefsValidator),
      unitPreferences: v.optional(unitPreferencesValidator),
      defaultScalingLevel: v.optional(scalingDesignationValidator),
      maxHR: v.optional(v.number()),
      lactateThreshold: v.optional(v.number()),
      preferredHRZoneMethod: v.optional(
        v.union(v.literal("maxHR"), v.literal("lactate"), v.literal("custom"))
      ),
      onboardingStatus: v.optional(onboardingStatusValidator),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    return ctx.user ?? null;
  },
});

// ============================================================================
// getById — return a public profile for any user (limited fields)
// ============================================================================

export const getById = authedQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      bio: v.optional(v.string()),
      avatarStorageId: v.optional(v.id("_storage")),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    return {
      _id: user._id,
      name: user.name,
      bio: user.bio,
      avatarStorageId: user.avatarStorageId,
    };
  },
});

// ============================================================================
// createOrGet — idempotent user creation (public mutation)
// ============================================================================

export const createOrGet = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
    });
  },
});

// ============================================================================
// updateProfile — update mutable profile fields
// ============================================================================

export const updateProfile = authedMutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    height: v.optional(v.number()),
    weight: v.optional(v.number()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(genderValidator),
    trainingStartDate: v.optional(v.string()),
    emergencyContact: v.optional(emergencyContactValidator),
    medicalInfo: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new ConvexError("No fields provided to update");
    }

    await ctx.db.patch(ctx.userId, updates);
    return null;
  },
});

// ============================================================================
// updateNotificationPrefs — replace notification preferences
// ============================================================================

export const updateNotificationPrefs = authedMutation({
  args: {
    notificationPrefs: notificationPrefsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(ctx.userId, {
      notificationPrefs: args.notificationPrefs,
    });
    return null;
  },
});

// ============================================================================
// updateUnitPreferences — replace unit preferences
// ============================================================================

export const updateUnitPreferences = authedMutation({
  args: {
    unitPreferences: unitPreferencesValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(ctx.userId, {
      unitPreferences: args.unitPreferences,
    });
    return null;
  },
});

// ============================================================================
// updateOnboardingStatus — advance onboarding status
// ============================================================================

export const updateOnboardingStatus = authedMutation({
  args: {
    status: onboardingStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(ctx.userId, {
      onboardingStatus: args.status,
    });
    return null;
  },
});

// ============================================================================
// generateUploadUrl — generate a signed upload URL for file storage
// ============================================================================

export const generateUploadUrl = authedMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// ============================================================================
// updateAvatar — set the user's avatar storage ID
// ============================================================================

export const updateAvatar = authedMutation({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(ctx.userId, {
      avatarStorageId: args.storageId,
    });
    return null;
  },
});
