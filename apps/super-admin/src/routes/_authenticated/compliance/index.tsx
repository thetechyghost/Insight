import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
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
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/compliance/")({
  component: ComplianceDashboard,
});

// ─── Data Request Types & Columns ───────────────────────────────────────────

type DataRequestRow = {
  _id: string;
  _creationTime: number;
  userId: string;
  type: string;
  status: string;
  submittedDate: number;
  completedDate?: number;
};

const drColumnHelper = createColumnHelper<DataRequestRow>();

const dataRequestColumns = [
  drColumnHelper.accessor("type", {
    header: "Type",
    cell: (info) => (
      <Badge variant="outline" className="capitalize">
        {info.getValue()}
      </Badge>
    ),
  }),
  drColumnHelper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const s = info.getValue();
      const variant = s === "completed" ? "default" : s === "processing" ? "secondary" : "outline";
      return <Badge variant={variant}>{s}</Badge>;
    },
  }),
  drColumnHelper.accessor("submittedDate", {
    header: "Submitted",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
  drColumnHelper.accessor("completedDate", {
    header: "Completed",
    cell: (info) => {
      const d = info.getValue();
      return d ? new Date(d).toLocaleDateString() : <span className="text-muted-foreground">-</span>;
    },
  }),
];

// ─── Consent Record Types & Columns ─────────────────────────────────────────

type ConsentRow = {
  _id: string;
  _creationTime: number;
  userId: string;
  type: string;
  versionAccepted: string;
  timestamp: number;
  ipAddress?: string;
};

const crColumnHelper = createColumnHelper<ConsentRow>();

const consentColumns = [
  crColumnHelper.accessor("type", {
    header: "Consent Type",
    cell: (info) => (
      <Badge variant="outline" className="capitalize">
        {info.getValue().replace(/_/g, " ")}
      </Badge>
    ),
  }),
  crColumnHelper.accessor("versionAccepted", {
    header: "Version",
  }),
  crColumnHelper.accessor("timestamp", {
    header: "Timestamp",
    cell: (info) => new Date(info.getValue()).toLocaleString(),
  }),
  crColumnHelper.accessor("ipAddress", {
    header: "IP Address",
    cell: (info) => info.getValue() ?? <span className="text-muted-foreground">-</span>,
  }),
];

function ComplianceDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compliance Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage GDPR/CCPA data requests and view consent audit trail
        </p>
      </div>

      <Tabs defaultValue="data-requests">
        <TabsList>
          <TabsTrigger value="data-requests">Data Requests</TabsTrigger>
          <TabsTrigger value="consent-audit">Consent Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="data-requests">
          <DataRequestsTab />
        </TabsContent>
        <TabsContent value="consent-audit">
          <ConsentAuditTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Data Requests Tab ──────────────────────────────────────────────────────

function DataRequestsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    action: "process" | "complete";
  } | null>(null);

  const requests = useQuery(api.dataRequests.listAll, {
    status: statusFilter === "all" ? undefined : (statusFilter as any),
  });
  const processRequest = useMutation(api.dataRequests.process);
  const completeRequest = useMutation(api.dataRequests.complete);

  async function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction.action === "process") {
      await processRequest({ requestId: confirmAction.id as Id<"data_requests"> });
    } else {
      await completeRequest({ requestId: confirmAction.id as Id<"data_requests"> });
    }
    setConfirmAction(null);
  }

  const allColumns = [
    ...dataRequestColumns,
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => {
        const status = row.original.status;
        return (
          <div className="flex gap-2 justify-end">
            {status === "received" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setConfirmAction({ id: row.original._id, action: "process" })
                }
              >
                Process
              </Button>
            )}
            {status === "processing" && (
              <Button
                size="sm"
                onClick={() =>
                  setConfirmAction({ id: row.original._id, action: "complete" })
                }
              >
                Complete
              </Button>
            )}
          </div>
        );
      },
    },
  ] as any[];

  const table = useReactTable({
    data: requests ?? [],
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="space-y-4 pt-4">
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v); }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!requests ? (
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
                  <TableCell colSpan={allColumns.length} className="h-24 text-center">
                    No data requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={!!confirmAction}
        onOpenChange={(o) => {
          if (!o) setConfirmAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.action === "process"
                ? "Start Processing"
                : "Mark as Complete"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.action === "process"
                ? "This will mark the data request as processing. Continue?"
                : "This will mark the data request as completed. Continue?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Consent Audit Tab ──────────────────────────────────────────────────────

function ConsentAuditTab() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const records = useQuery(api.consentRecords.listAll, {});

  const table = useReactTable({
    data: records ?? [],
    columns: consentColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="space-y-4 pt-4">
      {!records ? (
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
                  <TableCell colSpan={consentColumns.length} className="h-24 text-center">
                    No consent records found.
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
