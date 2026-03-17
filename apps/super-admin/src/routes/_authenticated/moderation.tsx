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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/moderation")({
  component: ModerationPage,
});

type ModerationRow = {
  _id: string;
  _creationTime: number;
  contentType: string;
  contentId: string;
  tenantId: string;
  reason: string;
  status: string;
  reviewedAt?: number;
};

const columnHelper = createColumnHelper<ModerationRow>();

const columns = [
  columnHelper.accessor("contentType", {
    header: "Type",
    cell: (info) => (
      <Badge variant="outline" className="capitalize">
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor("contentId", {
    header: "Content ID",
    cell: (info) => (
      <span className="font-mono text-xs">{info.getValue().slice(0, 16)}...</span>
    ),
  }),
  columnHelper.accessor("reason", {
    header: "Reason",
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const s = info.getValue();
      const variant =
        s === "approved" ? "default" : s === "removed" ? "destructive" : "secondary";
      return <Badge variant={variant}>{s}</Badge>;
    },
  }),
  columnHelper.accessor("_creationTime", {
    header: "Reported",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
];

function ModerationPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    action: "approve" | "remove";
  } | null>(null);

  const items = useQuery(api.platformModeration.list, {
    status: statusFilter === "all" ? undefined : (statusFilter as any),
  });
  const approveItem = useMutation(api.platformModeration.approve);
  const removeItem = useMutation(api.platformModeration.remove);

  async function handleConfirm() {
    if (!confirmAction) return;
    const itemId = confirmAction.id as Id<"moderation_queue">;
    if (confirmAction.action === "approve") {
      await approveItem({ itemId });
    } else {
      await removeItem({ itemId });
    }
    setConfirmAction(null);
  }

  const allColumns = [
    ...columns,
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => {
        if (row.original.status !== "pending") return null;
        return (
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              onClick={() =>
                setConfirmAction({ id: row.original._id, action: "approve" })
              }
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                setConfirmAction({ id: row.original._id, action: "remove" })
              }
            >
              Remove
            </Button>
          </div>
        );
      },
    },
  ] as any[];

  const table = useReactTable({
    data: items ?? [],
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  const pendingCount = items?.filter((i) => i.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Moderation</h1>
          <p className="text-sm text-muted-foreground">
            Review and moderate flagged content across the platform
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingCount} pending
              </Badge>
            )}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v); }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="removed">Removed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!items ? (
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
                    No moderation items found.
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
              {confirmAction?.action === "approve"
                ? "Approve Content"
                : "Remove Content"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.action === "approve"
                ? "This content will be marked as approved and remain visible."
                : "This content will be marked for removal and hidden from users."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction?.action === "remove" ? "destructive" : "default"}
              onClick={handleConfirm}
            >
              {confirmAction?.action === "approve" ? "Approve" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
