import { v, ConvexError } from "convex/values";
import { authedQuery, authedMutation } from "./lib/customFunctions";
import { query } from "./_generated/server";

const typeValidator = v.union(
  v.literal("terms_of_service"),
  v.literal("privacy_policy"),
  v.literal("waiver"),
  v.literal("dpa")
);

const legalDoc = v.object({
  _id: v.id("legal_documents"),
  _creationTime: v.number(),
  type: typeValidator,
  version: v.string(),
  content: v.string(),
  effectiveDate: v.string(),
  tenantId: v.optional(v.id("tenants")),
});

// ============================================================================
// getLatest — get the latest version of a legal document type
// ============================================================================

export const getLatest = query({
  args: { type: typeValidator },
  returns: v.union(legalDoc, v.null()),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("legal_documents")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .order("desc")
      .take(1);
    return docs[0] ?? null;
  },
});

// ============================================================================
// list — list all legal documents (super_admin)
// ============================================================================

export const list = authedQuery({
  args: {},
  returns: v.array(legalDoc),
  handler: async (ctx) => {
    return await ctx.db.query("legal_documents").collect();
  },
});

// ============================================================================
// create — create a new legal document version
// ============================================================================

export const create = authedMutation({
  args: {
    type: typeValidator,
    version: v.string(),
    content: v.string(),
    effectiveDate: v.string(),
    tenantId: v.optional(v.id("tenants")),
  },
  returns: v.id("legal_documents"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("legal_documents", args);
  },
});

// ============================================================================
// update — update a legal document
// ============================================================================

export const update = authedMutation({
  args: {
    documentId: v.id("legal_documents"),
    content: v.optional(v.string()),
    effectiveDate: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { documentId, ...updates } = args;
    const doc = await ctx.db.get(documentId);
    if (!doc) throw new ConvexError("Legal document not found");
    await ctx.db.patch(documentId, updates);
    return null;
  },
});
