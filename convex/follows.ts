import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const followStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted")
);

// ============================================================================
// Return validators
// ============================================================================

const followValidator = v.object({
  _id: v.id("follows"),
  _creationTime: v.number(),
  followerId: v.id("users"),
  followedId: v.id("users"),
  tenantId: v.id("tenants"),
  status: followStatusValidator,
});

// ============================================================================
// listFollowing — list users the current user follows (accepted only)
// ============================================================================

export const listFollowing = tenantQuery({
  args: {},
  returns: v.array(followValidator),
  handler: async (ctx) => {
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_followerId_tenantId", (q) =>
        q.eq("followerId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();

    return follows.filter((f) => f.status === "accepted");
  },
});

// ============================================================================
// listFollowers — list users who follow the current user
// ============================================================================

export const listFollowers = tenantQuery({
  args: {},
  returns: v.array(followValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("follows")
      .withIndex("by_followedId_tenantId", (q) =>
        q.eq("followedId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();
  },
});

// ============================================================================
// request — send a follow request
// ============================================================================

export const request = tenantMutation({
  args: { followeeId: v.id("users") },
  returns: v.id("follows"),
  handler: async (ctx, args) => {
    if (args.followeeId === ctx.userId) {
      throw new ConvexError("Cannot follow yourself");
    }

    // Check if already following or pending
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_followerId_tenantId", (q) =>
        q.eq("followerId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .filter((q) => q.eq(q.field("followedId"), args.followeeId))
      .first();

    if (existing) {
      throw new ConvexError("Already following or request pending");
    }

    return await ctx.db.insert("follows", {
      followerId: ctx.userId,
      followedId: args.followeeId,
      tenantId: ctx.tenantId,
      status: "pending",
    });
  },
});

// ============================================================================
// accept — accept a follow request (must be the followee)
// ============================================================================

export const accept = tenantMutation({
  args: { followId: v.id("follows") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const follow = await ctx.db.get(args.followId);
    if (!follow || follow.followedId !== ctx.userId) {
      throw new ConvexError("Follow request not found");
    }

    if (follow.status === "accepted") {
      throw new ConvexError("Already accepted");
    }

    await ctx.db.patch(args.followId, { status: "accepted" });
    return null;
  },
});

// ============================================================================
// remove — remove a follow relationship (either participant)
// ============================================================================

export const remove = tenantMutation({
  args: { followId: v.id("follows") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const follow = await ctx.db.get(args.followId);
    if (
      !follow ||
      (follow.followerId !== ctx.userId && follow.followedId !== ctx.userId)
    ) {
      throw new ConvexError("Follow not found or not a participant");
    }

    await ctx.db.delete(args.followId);
    return null;
  },
});
