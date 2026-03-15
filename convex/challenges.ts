import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// ============================================================================
// Local validators
// ============================================================================

const challengeTypeValidator = v.union(
  v.literal("distance"),
  v.literal("volume"),
  v.literal("frequency"),
  v.literal("benchmark")
);

// ============================================================================
// Return validators
// ============================================================================

const challengeValidator = v.object({
  _id: v.id("challenges"),
  _creationTime: v.number(),
  name: v.string(),
  type: challengeTypeValidator,
  tenantId: v.optional(v.id("tenants")),
  startDate: v.string(),
  endDate: v.string(),
  rules: v.optional(v.any()),
  description: v.optional(v.string()),
});

const participantValidator = v.object({
  _id: v.id("challenge_participants"),
  _creationTime: v.number(),
  challengeId: v.id("challenges"),
  userId: v.id("users"),
  progress: v.optional(v.number()),
  enrolledAt: v.number(),
});

// ============================================================================
// list — list challenges for the tenant, with optional status filter
// ============================================================================

export const list = tenantQuery({
  args: {
    status: v.optional(v.union(v.literal("upcoming"), v.literal("active"), v.literal("completed"))),
  },
  returns: v.array(challengeValidator),
  handler: async (ctx, args) => {
    const challenges = await ctx.db
      .query("challenges")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();

    if (!args.status) return challenges;

    const now = new Date().toISOString().slice(0, 10);
    return challenges.filter((c) => {
      if (args.status === "upcoming") return c.startDate > now;
      if (args.status === "active") return c.startDate <= now && c.endDate >= now;
      if (args.status === "completed") return c.endDate < now;
      return true;
    });
  },
});

// ============================================================================
// getById — get a single challenge
// ============================================================================

export const getById = tenantQuery({
  args: { challengeId: v.id("challenges") },
  returns: challengeValidator,
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge || challenge.tenantId !== ctx.tenantId) {
      throw new ConvexError("Challenge not found");
    }
    return challenge;
  },
});

// ============================================================================
// create — create a new challenge (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    type: challengeTypeValidator,
    startDate: v.string(),
    endDate: v.string(),
    description: v.optional(v.string()),
    rules: v.optional(v.any()),
  },
  returns: v.id("challenges"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db.insert("challenges", {
      name: args.name,
      type: args.type,
      tenantId: ctx.tenantId,
      startDate: args.startDate,
      endDate: args.endDate,
      description: args.description,
      rules: args.rules,
    });
  },
});

// ============================================================================
// update — update a challenge (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    challengeId: v.id("challenges"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    rules: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge || challenge.tenantId !== ctx.tenantId) {
      throw new ConvexError("Challenge not found");
    }

    const { challengeId: _id, ...updates } = args;
    await ctx.db.patch(args.challengeId, updates);
    return null;
  },
});

// ============================================================================
// close — mark a challenge as completed (coach+)
// ============================================================================

export const close = tenantMutation({
  args: { challengeId: v.id("challenges") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge || challenge.tenantId !== ctx.tenantId) {
      throw new ConvexError("Challenge not found");
    }

    // Set endDate to today to mark as completed
    await ctx.db.patch(args.challengeId, {
      endDate: new Date().toISOString().slice(0, 10),
    });
    return null;
  },
});

// ============================================================================
// join — join a challenge
// ============================================================================

export const join = tenantMutation({
  args: { challengeId: v.id("challenges") },
  returns: v.id("challenge_participants"),
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge || challenge.tenantId !== ctx.tenantId) {
      throw new ConvexError("Challenge not found");
    }

    // Check if already joined
    const existing = await ctx.db
      .query("challenge_participants")
      .withIndex("by_challengeId", (q) => q.eq("challengeId", args.challengeId))
      .filter((q) => q.eq(q.field("userId"), ctx.userId))
      .first();

    if (existing) {
      throw new ConvexError("Already joined this challenge");
    }

    return await ctx.db.insert("challenge_participants", {
      challengeId: args.challengeId,
      userId: ctx.userId,
      progress: 0,
      enrolledAt: Date.now(),
    });
  },
});

// ============================================================================
// leave — leave a challenge
// ============================================================================

export const leave = tenantMutation({
  args: { challengeId: v.id("challenges") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("challenge_participants")
      .withIndex("by_challengeId", (q) => q.eq("challengeId", args.challengeId))
      .filter((q) => q.eq(q.field("userId"), ctx.userId))
      .first();

    if (!participant) {
      throw new ConvexError("Not a participant in this challenge");
    }

    await ctx.db.delete(participant._id);
    return null;
  },
});

// ============================================================================
// updateProgress — update a participant's progress (internal)
// ============================================================================

export const updateProgress = internalMutation({
  args: {
    participantId: v.id("challenge_participants"),
    progress: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) {
      throw new ConvexError("Participant not found");
    }

    await ctx.db.patch(args.participantId, { progress: args.progress });
    return null;
  },
});

// ============================================================================
// getStandings — get challenge standings sorted by progress desc
// ============================================================================

export const getStandings = tenantQuery({
  args: { challengeId: v.id("challenges") },
  returns: v.array(participantValidator),
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("challenge_participants")
      .withIndex("by_challengeId", (q) => q.eq("challengeId", args.challengeId))
      .collect();

    // Sort by progress descending
    participants.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
    return participants;
  },
});
