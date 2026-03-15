import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation } from "./lib/customFunctions";

// ============================================================================
// Return validators
// ============================================================================

const quoteValidator = v.object({
  _id: v.id("motivation_quotes"),
  _creationTime: v.number(),
  content: v.string(),
  tenantId: v.optional(v.id("tenants")),
});

// ============================================================================
// getRandom — get a random motivation quote (platform + tenant)
// ============================================================================

export const getRandom = tenantQuery({
  args: {},
  returns: v.union(quoteValidator, v.null()),
  handler: async (ctx) => {
    // Get platform-wide quotes (no tenantId) and tenant-specific quotes
    const allQuotes = await ctx.db.query("motivation_quotes").collect();

    const eligible = allQuotes.filter(
      (q) => q.tenantId === undefined || q.tenantId === ctx.tenantId
    );

    if (eligible.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * eligible.length);
    return eligible[randomIndex];
  },
});

// ============================================================================
// list — list all quotes (platform + tenant)
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(quoteValidator),
  handler: async (ctx) => {
    const allQuotes = await ctx.db.query("motivation_quotes").collect();

    return allQuotes.filter(
      (q) => q.tenantId === undefined || q.tenantId === ctx.tenantId
    );
  },
});

// ============================================================================
// create — create a motivation quote for this tenant
// ============================================================================

export const create = tenantMutation({
  args: {
    content: v.string(),
  },
  returns: v.id("motivation_quotes"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("motivation_quotes", {
      content: args.content,
      tenantId: ctx.tenantId,
    });
  },
});

// ============================================================================
// remove — delete a motivation quote
// ============================================================================

export const remove = tenantMutation({
  args: { quoteId: v.id("motivation_quotes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) {
      throw new ConvexError("Quote not found");
    }

    // Only allow deleting tenant-specific quotes for this tenant
    if (quote.tenantId !== undefined && quote.tenantId !== ctx.tenantId) {
      throw new ConvexError("Quote not found");
    }

    // Don't allow deleting platform-wide quotes via tenant mutation
    if (quote.tenantId === undefined) {
      throw new ConvexError("Cannot delete platform-wide quotes");
    }

    await ctx.db.delete(args.quoteId);
    return null;
  },
});
