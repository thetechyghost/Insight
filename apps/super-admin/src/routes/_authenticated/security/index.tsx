import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/security/")({
  component: SecurityEventsPage,
});

type EventRow = {
  _id: string;
  _creationTime: number;
  userId?: string;
  eventType: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  timestamp: number;
  details?: any;
};

const EVENT_TYPES = [
  "login_success",
  "login_failure",
  "password_change",
  "mfa_enabled",
  "suspicious_activity",
  "account_locked",
  "session_created",
  "session_terminated",
] as const;

const columnHelper = createColumnHelper<EventRow>();

const columns = [
  columnHelper.accessor("timestamp", {
    header: "Time",
    cell: (info) => new Date(info.getValue()).toLocaleString(),
  }),
  columnHelper.accessor("eventType", {
    header: "Event",
    cell: (info) => {
      const t = info.getValue();
      const variant =
        t === "login_failure" || t === "suspicious_activity" || t === "account_locked"
          ? "destructive"
          : t === "login_success" || t === "session_created"
            ? "default"
            : "secondary";
      return (
        <Badge variant={variant} className="capitalize">
          {t.replace(/_/g, " ")}
        </Badge>
      );
    },
  }),
  columnHelper.accessor("ipAddress", {
    header: "IP Address",
    cell: (info) =>
      info.getValue() ?? <span className="text-muted-foreground">-</span>,
  }),
  columnHelper.accessor("deviceFingerprint", {
    header: "Device",
    cell: (info) => {
      const v = info.getValue();
      return v ? (
        <span className="font-mono text-xs">{v.slice(0, 12)}...</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  }),
];

function SecurityEventsPage() {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [sorting, setSorting] = useState<SortingState>([]);

  const events = useQuery(api.securityEvents.list, {
    eventType: eventTypeFilter === "all" ? undefined : (eventTypeFilter as any),
    limit: 100,
  });

  const table = useReactTable({
    data: events ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  const failedLogins = events?.filter((e) => e.eventType === "login_failure").length ?? 0;
  const lockedAccounts = events?.filter((e) => e.eventType === "account_locked").length ?? 0;
  const suspiciousEvents = events?.filter((e) => e.eventType === "suspicious_activity").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Security Events</h1>
        <p className="text-sm text-muted-foreground">
          Monitor authentication events, failed logins, and suspicious activity
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedLogins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locked Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lockedAccounts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suspiciousEvents}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Select value={eventTypeFilter} onValueChange={(v) => { if (v) setEventTypeFilter(v); }}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Event Types</SelectItem>
            {EVENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!events ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead
                      key={h.id}
                      className="cursor-pointer select-none"
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No security events found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
