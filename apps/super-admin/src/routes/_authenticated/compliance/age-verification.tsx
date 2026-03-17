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

export const Route = createFileRoute("/_authenticated/compliance/age-verification")({
  component: AgeVerificationPage,
});

type VerificationRow = {
  _id: string;
  _creationTime: number;
  userId: string;
  consentStatus: string;
  guardianContact?: {
    name: string;
    email: string;
    phone?: string;
  };
  verificationMethod?: string;
};

const columnHelper = createColumnHelper<VerificationRow>();

const columns = [
  columnHelper.accessor("consentStatus", {
    header: "Status",
    cell: (info) => {
      const s = info.getValue();
      const variant =
        s === "granted" ? "default" : s === "denied" ? "destructive" : "secondary";
      return <Badge variant={variant}>{s}</Badge>;
    },
  }),
  columnHelper.accessor("guardianContact", {
    header: "Guardian",
    cell: (info) => {
      const g = info.getValue();
      return g ? (
        <div>
          <div className="font-medium">{g.name}</div>
          <div className="text-sm text-muted-foreground">{g.email}</div>
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  }),
  columnHelper.accessor("verificationMethod", {
    header: "Method",
    cell: (info) =>
      info.getValue() ?? <span className="text-muted-foreground">-</span>,
  }),
  columnHelper.accessor("_creationTime", {
    header: "Submitted",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
];

function AgeVerificationPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    action: "approve" | "deny";
  } | null>(null);

  const records = useQuery(api.ageVerification.listAll, {});
  const approveVerification = useMutation(api.ageVerification.approve);
  const denyVerification = useMutation(api.ageVerification.deny);

  async function handleConfirm() {
    if (!confirmAction) return;
    const verificationId = confirmAction.id as Id<"age_verification">;
    if (confirmAction.action === "approve") {
      await approveVerification({ verificationId });
    } else {
      await denyVerification({ verificationId });
    }
    setConfirmAction(null);
  }

  const allColumns = [
    ...columns,
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => {
        const status = row.original.consentStatus;
        if (status !== "pending") return null;
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
                setConfirmAction({ id: row.original._id, action: "deny" })
              }
            >
              Deny
            </Button>
          </div>
        );
      },
    },
  ] as any[];

  const table = useReactTable({
    data: records ?? [],
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  const pendingCount = records?.filter((r) => r.consentStatus === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Age Verification Queue</h1>
          <p className="text-sm text-muted-foreground">
            Review and process parental consent requests
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingCount} pending
              </Badge>
            )}
          </p>
        </div>
      </div>

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
                  <TableCell colSpan={allColumns.length} className="h-24 text-center">
                    No age verification records found.
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
                ? "Approve Verification"
                : "Deny Verification"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.action === "approve"
                ? "This will grant age verification consent. Continue?"
                : "This will deny age verification consent. Continue?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction?.action === "deny" ? "destructive" : "default"}
              onClick={handleConfirm}
            >
              {confirmAction?.action === "approve" ? "Approve" : "Deny"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
