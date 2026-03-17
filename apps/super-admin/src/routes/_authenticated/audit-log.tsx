import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/audit-log")({
  component: AuditLogPage,
});

type AuditEntry = {
  _id: string;
  _creationTime: number;
  actorId: string;
  action: string;
  targetEntity: string;
  targetId?: string;
  beforeValue?: any;
  afterValue?: any;
  timestamp: number;
};

const columnHelper = createColumnHelper<AuditEntry>();

const columns = [
  columnHelper.accessor("timestamp", {
    header: "Time",
    cell: (info) => new Date(info.getValue()).toLocaleString(),
  }),
  columnHelper.accessor("action", {
    header: "Action",
    cell: (info) => (
      <Badge variant="outline" className="font-mono text-xs">
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor("targetEntity", {
    header: "Entity",
    cell: (info) => <span className="text-sm">{info.getValue()}</span>,
  }),
  columnHelper.accessor("targetId", {
    header: "Target ID",
    cell: (info) => {
      const val = info.getValue();
      return val ? (
        <span className="font-mono text-xs text-muted-foreground">{val.slice(0, 16)}...</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  }),
  columnHelper.display({
    id: "details",
    header: "Details",
    cell: ({ row }) => {
      const { beforeValue, afterValue } = row.original;
      if (!beforeValue && !afterValue) return <span className="text-muted-foreground">-</span>;
      return (
        <details className="text-xs">
          <summary className="cursor-pointer text-primary">View</summary>
          <div className="mt-1 space-y-1 max-w-xs">
            {beforeValue && (
              <div>
                <span className="font-semibold text-muted-foreground">Before: </span>
                <pre className="whitespace-pre-wrap">{JSON.stringify(beforeValue, null, 2)}</pre>
              </div>
            )}
            {afterValue && (
              <div>
                <span className="font-semibold text-muted-foreground">After: </span>
                <pre className="whitespace-pre-wrap">{JSON.stringify(afterValue, null, 2)}</pre>
              </div>
            )}
          </div>
        </details>
      );
    },
  }),
];

function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const actions = useQuery(api.platformAuditLog.getActions, {});
  const result = useQuery(api.platformAuditLog.list, {
    action: actionFilter === "all" ? undefined : actionFilter,
    targetEntity: entityFilter || undefined,
    cursor,
    limit: 25,
  });

  const table = useReactTable({
    data: result?.entries ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Platform administration activity log
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-64">
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setCursor(undefined); }}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actions?.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          className="w-48"
          placeholder="Filter by entity..."
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setCursor(undefined); }}
        />
      </div>

      {/* Table */}
      {!result ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
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
                      No audit log entries found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor(undefined)}
              disabled={!cursor}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor(result.nextCursor)}
              disabled={!result.nextCursor}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
