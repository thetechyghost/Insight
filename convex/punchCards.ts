import { v, ConvexError } from "convex/values";
import { tenantQuery } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// --- Return validator ---

const punchCardValidator = v.object({
  _id: v.id("punch_cards"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  membershipPlanId: v.optional(v.id("membership_plans")),
  totalPunches: v.number(),
  remainingPunches: v.number(),
  purchasedAt: v.number(),
  expiresAt: v.optional(v.number()),
  expiryDate: v.optional(v.string()),
});

// ============================================================================
// getMine — get active punch cards for the current user (remaining > 0)
// ============================================================================

export const getMine = tenantQuery({
  args: {},
  returns: v.array(punchCardValidator),
  handler: async (ctx) => {
    const cards = await ctx.db
      .query("punch_cards")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();

    const now = Date.now();
    return cards.filter(
      (c) => c.remainingPunches > 0 && (!c.expiresAt || c.expiresAt > now)
    );
  },
});

// ============================================================================
// deduct — internal: decrement a punch from a punch card
// ============================================================================

export const deduct = internalMutation({
  args: { punchCardId: v.id("punch_cards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.punchCardId);
    if (!card) {
      throw new ConvexError("Punch card not found");
    }

    if (card.remainingPunches <= 0) {
      throw new ConvexError("No punches remaining on this card");
    }

    await ctx.db.patch(args.punchCardId, {
      remainingPunches: card.remainingPunches - 1,
    });
    return null;
  },
});
