import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const reportValidator = v.object({
  _id: v.id("saved_reports"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  name: v.string(),
  reportType: v.string(),
  filters: v.optional(v.any()),
  grouping: v.optional(v.any()),
  dateRange: v.optional(v.object({ start: v.string(), end: v.string() })),
  schedule: v.optional(v.string()),
});

const exportFormatValidator = v.union(v.literal("csv"), v.literal("pdf"));

const exportValidator = v.object({
  _id: v.id("report_exports"),
  _creationTime: v.number(),
  savedReportId: v.id("saved_reports"),
  format: exportFormatValidator,
  fileId: v.id("_storage"),
  generatedAt: v.number(),
});

// ============================================================================
// list — list saved reports for this tenant (admin+)
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(reportValidator),
  handler: async (ctx) => {
    enforceRole(ctx.role, "admin");
    return await ctx.db
      .query("saved_reports")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// create — create a saved report (admin+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    reportType: v.string(),
    filters: v.optional(v.any()),
    grouping: v.optional(v.any()),
    dateRange: v.optional(v.object({ start: v.string(), end: v.string() })),
    schedule: v.optional(v.string()),
  },
  returns: v.id("saved_reports"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    return await ctx.db.insert("saved_reports", {
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});

// ============================================================================
// update — update a saved report (admin+)
// ============================================================================

export const update = tenantMutation({
  args: {
    reportId: v.id("saved_reports"),
    name: v.optional(v.string()),
    reportType: v.optional(v.string()),
    filters: v.optional(v.any()),
    grouping: v.optional(v.any()),
    dateRange: v.optional(v.object({ start: v.string(), end: v.string() })),
    schedule: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const report = await ctx.db.get(args.reportId);
    if (!report || report.tenantId !== ctx.tenantId) {
      throw new ConvexError("Report not found");
    }
    const { reportId: _, ...updates } = args;
    await ctx.db.patch(args.reportId, updates);
    return null;
  },
});

// ============================================================================
// remove — delete a saved report (admin+)
// ============================================================================

export const remove = tenantMutation({
  args: { reportId: v.id("saved_reports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const report = await ctx.db.get(args.reportId);
    if (!report || report.tenantId !== ctx.tenantId) {
      throw new ConvexError("Report not found");
    }
    await ctx.db.delete(args.reportId);
    return null;
  },
});

// ============================================================================
// generateExport — create a report export request (admin+)
// ============================================================================

export const generateExport = tenantMutation({
  args: {
    reportId: v.id("saved_reports"),
    format: exportFormatValidator,
    fileId: v.id("_storage"),
  },
  returns: v.id("report_exports"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const report = await ctx.db.get(args.reportId);
    if (!report || report.tenantId !== ctx.tenantId) {
      throw new ConvexError("Report not found");
    }
    return await ctx.db.insert("report_exports", {
      savedReportId: args.reportId,
      format: args.format,
      fileId: args.fileId,
      generatedAt: Date.now(),
    });
  },
});
