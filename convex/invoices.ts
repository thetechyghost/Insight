import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// --- Return validator ---

const invoiceValidator = v.object({
  _id: v.id("invoices"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  subscriptionId: v.optional(v.id("subscriptions")),
  stripeInvoiceId: v.optional(v.string()),
  amount: v.number(),
  currency: v.string(),
  lineItems: v.optional(v.array(v.object({
    description: v.string(),
    amount: v.number(),
    quantity: v.number(),
  }))),
  subtotal: v.optional(v.number()),
  tax: v.optional(v.number()),
  total: v.optional(v.number()),
  status: v.union(
    v.literal("draft"), v.literal("open"), v.literal("paid"),
    v.literal("void"), v.literal("uncollectible"),
  ),
  dueDate: v.optional(v.string()),
  paidAt: v.optional(v.number()),
  paidDate: v.optional(v.string()),
  createdAt: v.number(),
});

// ============================================================================
// listMine — list invoices for the current user
// ============================================================================

export const listMine = tenantQuery({
  args: {},
  returns: v.array(invoiceValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .order("desc")
      .collect();
  },
});

// ============================================================================
// listByTenant — list all invoices for the tenant (admin+)
// ============================================================================

export const listByTenant = tenantQuery({
  args: {},
  returns: v.array(invoiceValidator),
  handler: async (ctx) => {
    enforceRole(ctx.role, "admin");

    return await ctx.db
      .query("invoices")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .order("desc")
      .collect();
  },
});

// ============================================================================
// getById — get a single invoice (verify tenant or ownership)
// ============================================================================

export const getById = tenantQuery({
  args: { invoiceId: v.id("invoices") },
  returns: invoiceValidator,
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.tenantId !== ctx.tenantId) {
      throw new ConvexError("Invoice not found");
    }

    // Non-admins can only see their own invoices
    if (invoice.userId !== ctx.userId) {
      enforceRole(ctx.role, "admin");
    }

    return invoice;
  },
});

// ============================================================================
// createManual — create a manual invoice (admin+)
// ============================================================================

export const createManual = tenantMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    lineItems: v.optional(v.array(v.object({
      description: v.string(),
      amount: v.number(),
      quantity: v.number(),
    }))),
    dueDate: v.optional(v.string()),
  },
  returns: v.id("invoices"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    return await ctx.db.insert("invoices", {
      tenantId: ctx.tenantId,
      userId: args.userId,
      amount: args.amount,
      currency: args.currency,
      lineItems: args.lineItems,
      dueDate: args.dueDate,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

// ============================================================================
// void — void an invoice (admin+)
// ============================================================================

export const voidInvoice = tenantMutation({
  args: { invoiceId: v.id("invoices") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.tenantId !== ctx.tenantId) {
      throw new ConvexError("Invoice not found");
    }

    if (invoice.status === "paid") {
      throw new ConvexError("Cannot void a paid invoice");
    }

    await ctx.db.patch(args.invoiceId, { status: "void" });
    return null;
  },
});

// ============================================================================
// syncFromStripe — internal: sync invoice state from Stripe webhook
// ============================================================================

export const syncFromStripe = internalMutation({
  args: {
    stripeInvoiceId: v.string(),
    status: v.union(
      v.literal("draft"), v.literal("open"), v.literal("paid"),
      v.literal("void"), v.literal("uncollectible"),
    ),
    paidAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_stripeInvoiceId", (q) =>
        q.eq("stripeInvoiceId", args.stripeInvoiceId)
      )
      .first();

    if (!invoice) {
      throw new ConvexError("Invoice not found for Stripe ID");
    }

    const updates: Record<string, unknown> = { status: args.status };
    if (args.paidAt !== undefined) updates.paidAt = args.paidAt;

    await ctx.db.patch(invoice._id, updates);
    return null;
  },
});
