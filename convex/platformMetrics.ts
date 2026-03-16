import { v } from "convex/values";
import { platformQuery } from "./lib/platformFunctions";

// ============================================================================
// getOverview — aggregate platform stats
// ============================================================================

export const getOverview = platformQuery({
  args: {},
  returns: v.object({
    totalTenants: v.number(),
    totalUsers: v.number(),
    totalWorkoutLogsThisMonth: v.number(),
    activeToday: v.number(),
  }),
  handler: async (ctx) => {
    const tenants = await ctx.db.query("tenants").collect();
    const users = await ctx.db.query("users").collect();

    // Workout logs this month
    const now = Date.now();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthStart = startOfMonth.getTime();

    const workoutLogs = await ctx.db.query("workout_logs").collect();
    const thisMonthLogs = workoutLogs.filter((w) => w._creationTime >= monthStart);

    // Active today — users with login_success in last 24h
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentLogins = await ctx.db
      .query("security_events")
      .withIndex("by_eventType", (q) => q.eq("eventType", "login_success"))
      .collect();
    const todayLogins = recentLogins.filter((e) => e.timestamp >= oneDayAgo);
    const uniqueActiveUsers = new Set(todayLogins.map((e) => e.userId).filter(Boolean));

    return {
      totalTenants: tenants.length,
      totalUsers: users.length,
      totalWorkoutLogsThisMonth: thisMonthLogs.length,
      activeToday: uniqueActiveUsers.size,
    };
  },
});

// ============================================================================
// getGrowthTrends — new tenants and users per month (last 12 months)
// ============================================================================

export const getGrowthTrends = platformQuery({
  args: {},
  returns: v.array(v.object({
    month: v.string(),
    newTenants: v.number(),
    newUsers: v.number(),
  })),
  handler: async (ctx) => {
    const now = new Date();
    const months: { month: string; start: number; end: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      months.push({
        month: d.toISOString().slice(0, 7), // YYYY-MM
        start,
        end,
      });
    }

    const tenants = await ctx.db.query("tenants").collect();
    const users = await ctx.db.query("users").collect();

    return months.map(({ month, start, end }) => ({
      month,
      newTenants: tenants.filter((t) => t._creationTime >= start && t._creationTime < end).length,
      newUsers: users.filter((u) => u._creationTime >= start && u._creationTime < end).length,
    }));
  },
});

// ============================================================================
// getTenantHealthFlags — tenants with issues (suspended, low activity)
// ============================================================================

export const getTenantHealthFlags = platformQuery({
  args: {},
  returns: v.array(v.object({
    tenantId: v.id("tenants"),
    tenantName: v.string(),
    issue: v.string(),
    since: v.number(),
  })),
  handler: async (ctx) => {
    const flags: { tenantId: any; tenantName: string; issue: string; since: number }[] = [];

    // Suspended tenants
    const suspendedProvisionings = await ctx.db
      .query("tenant_provisioning")
      .withIndex("by_status", (q) => q.eq("status", "suspended"))
      .collect();

    for (const prov of suspendedProvisionings) {
      if (!prov.tenantId) continue;
      const tenant = await ctx.db.get(prov.tenantId);
      if (tenant) {
        flags.push({
          tenantId: prov.tenantId,
          tenantName: tenant.name,
          issue: "suspended",
          since: prov._creationTime,
        });
      }
    }

    return flags;
  },
});
