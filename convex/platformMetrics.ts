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

// ============================================================================
// getTenantActivity — per-tenant activity metrics (FR-AD-009)
// ============================================================================

export const getTenantActivity = platformQuery({
  args: { tenantId: v.id("tenants") },
  returns: v.object({
    totalMembers: v.number(),
    activeUsers7d: v.number(),
    activeUsers30d: v.number(),
    totalWorkoutLogs30d: v.number(),
    loginCount7d: v.number(),
  }),
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      return { totalMembers: 0, activeUsers7d: 0, activeUsers30d: 0, totalWorkoutLogs30d: 0, loginCount7d: 0 };
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Get tenant members
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_tenantId_status", (q) => q.eq("tenantId", args.tenantId).eq("status", "active"))
      .collect();
    const memberUserIds = new Set(memberships.map((m) => m.userId));

    // Login events for tenant members
    const loginEvents = await ctx.db
      .query("security_events")
      .withIndex("by_eventType", (q) => q.eq("eventType", "login_success"))
      .collect();
    const memberLogins = loginEvents.filter((e) => e.userId && memberUserIds.has(e.userId));

    const logins7d = memberLogins.filter((e) => e.timestamp >= sevenDaysAgo);
    const logins30d = memberLogins.filter((e) => e.timestamp >= thirtyDaysAgo);

    const activeUsers7d = new Set(logins7d.map((e) => e.userId).filter(Boolean)).size;
    const activeUsers30d = new Set(logins30d.map((e) => e.userId).filter(Boolean)).size;

    // Workout logs (by tenant members in last 30 days)
    const workoutLogs = await ctx.db.query("workout_logs").collect();
    const tenantWorkouts30d = workoutLogs.filter(
      (w) => memberUserIds.has(w.userId) && w._creationTime >= thirtyDaysAgo
    );

    return {
      totalMembers: memberships.length,
      activeUsers7d,
      activeUsers30d,
      totalWorkoutLogs30d: tenantWorkouts30d.length,
      loginCount7d: logins7d.length,
    };
  },
});

// ============================================================================
// getComparativeMetrics — cross-tenant comparison (FR-AD-011)
// ============================================================================

export const getComparativeMetrics = platformQuery({
  args: {},
  returns: v.array(v.object({
    tenantId: v.id("tenants"),
    tenantName: v.string(),
    memberCount: v.number(),
    activeRate30d: v.number(),
    workoutsPerMember30d: v.number(),
  })),
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const tenants = await ctx.db.query("tenants").collect();
    const allMemberships = await ctx.db.query("memberships").collect();
    const loginEvents = await ctx.db
      .query("security_events")
      .withIndex("by_eventType", (q) => q.eq("eventType", "login_success"))
      .collect();
    const recentLogins = loginEvents.filter((e) => e.timestamp >= thirtyDaysAgo);
    const workoutLogs = await ctx.db.query("workout_logs").collect();
    const recentWorkouts = workoutLogs.filter((w) => w._creationTime >= thirtyDaysAgo);

    return tenants.map((tenant) => {
      const members = allMemberships.filter(
        (m) => m.tenantId === tenant._id && m.status === "active"
      );
      const memberUserIds = new Set(members.map((m) => m.userId));
      const memberCount = members.length;

      const activeUsers = new Set(
        recentLogins
          .filter((e) => e.userId && memberUserIds.has(e.userId))
          .map((e) => e.userId)
      ).size;

      const tenantWorkouts = recentWorkouts.filter((w) => memberUserIds.has(w.userId)).length;

      return {
        tenantId: tenant._id,
        tenantName: tenant.name,
        memberCount,
        activeRate30d: memberCount > 0 ? Math.round((activeUsers / memberCount) * 100) : 0,
        workoutsPerMember30d: memberCount > 0 ? Math.round((tenantWorkouts / memberCount) * 10) / 10 : 0,
      };
    });
  },
});
