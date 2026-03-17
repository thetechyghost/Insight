import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const overview = useQuery(api.platformMetrics.getOverview);
  const growth = useQuery(api.platformMetrics.getGrowthTrends);
  const healthFlags = useQuery(api.platformMetrics.getTenantHealthFlags);
  const comparativeMetrics = useQuery(api.platformMetrics.getComparativeMetrics);

  if (!overview) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of all tenants and platform health
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Tenants"
          value={overview.totalTenants}
        />
        <StatCard
          title="Total Users"
          value={overview.totalUsers}
        />
        <StatCard
          title="Workouts This Month"
          value={overview.totalWorkoutLogsThisMonth}
        />
        <StatCard
          title="Active Today"
          value={overview.activeToday}
        />
      </div>

      {/* Charts + System Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Tenant & User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {growth ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={growth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tickFormatter={(v) => v.slice(5)} // MM only
                  />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="newUsers"
                    stackId="1"
                    className="fill-primary/20 stroke-primary"
                  />
                  <Area
                    type="monotone"
                    dataKey="newTenants"
                    stackId="2"
                    className="fill-secondary/20 stroke-secondary"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Convex", status: "Operational" },
              { name: "Azure Functions", status: "Operational" },
              { name: "TimescaleDB", status: "Operational" },
              { name: "Event Hub", status: "Operational" },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{service.name}</span>
                <span className="flex items-center gap-1.5 text-green-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {service.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Comparative Metrics */}
      {comparativeMetrics && comparativeMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tenant Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-2 font-medium">Tenant</th>
                    <th className="text-left px-4 py-2 font-medium">Members</th>
                    <th className="text-left px-4 py-2 font-medium">Active Rate (30d)</th>
                    <th className="text-left px-4 py-2 font-medium">Workouts/Member (30d)</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativeMetrics.map((m) => (
                    <tr key={m.tenantId} className="border-b last:border-0">
                      <td className="px-4 py-2">
                        <Link
                          to="/tenants/$tenantId"
                          params={{ tenantId: m.tenantId }}
                          className="text-primary hover:underline"
                        >
                          {m.tenantName}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{m.memberCount}</td>
                      <td className="px-4 py-2">{m.activeRate30d}%</td>
                      <td className="px-4 py-2">{m.workoutsPerMember30d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tenant Health Flags */}
      {healthFlags && healthFlags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tenant Health Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthFlags.map((flag) => (
                <div
                  key={flag.tenantId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{flag.tenantName}</span>
                    <Badge variant={flag.issue === "suspended" ? "destructive" : "secondary"}>
                      {flag.issue}
                    </Badge>
                  </div>
                  <Link
                    to="/tenants/$tenantId"
                    params={{ tenantId: flag.tenantId }}
                    className="text-sm text-primary hover:underline"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
