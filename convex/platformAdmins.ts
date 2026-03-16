import { v } from "convex/values";
import { platformQuery } from "./lib/platformFunctions";
import { internalMutation } from "./_generated/server";

const platformAdminDoc = v.object({
  _id: v.id("platform_admins"),
  _creationTime: v.number(),
  userId: v.id("users"),
  platformRole: v.union(
    v.literal("super_admin"),
    v.literal("platform_support"),
    v.literal("platform_ops")
  ),
  status: v.union(v.literal("active"), v.literal("suspended")),
  lastLoginAt: v.optional(v.number()),
});

// ============================================================================
// getMe — return the current user's platform admin record
// ============================================================================

export const getMe = platformQuery({
  args: {},
  returns: platformAdminDoc,
  handler: async (ctx, _args) => {
    return ctx.platformAdmin;
  },
});

// ============================================================================
// updateLastLogin — internal mutation to track last login time
// ============================================================================

export const updateLastLogin = internalMutation({
  args: { platformAdminId: v.id("platform_admins") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.platformAdminId, { lastLoginAt: Date.now() });
    return null;
  },
});
