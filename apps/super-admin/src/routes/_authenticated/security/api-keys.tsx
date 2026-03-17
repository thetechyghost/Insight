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

export const Route = createFileRoute("/_authenticated/security/api-keys")({
  component: ApiKeysPage,
});

type ApiKeyRow = {
  _id: string;
  _creationTime: number;
  tenantId: string;
  name: string;
  scopes: string[];
  rateLimitTier: string;
  lastUsedAt?: number;
  isActive: boolean;
};

const columnHelper = createColumnHelper<ApiKeyRow>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor("scopes", {
    header: "Scopes",
    cell: (info) =>
      info
        .getValue()
        .map((s) => (
          <Badge key={s} variant="outline" className="mr-1">
            {s}
          </Badge>
        )),
  }),
  columnHelper.accessor("rateLimitTier", {
    header: "Rate Limit",
    cell: (info) => <Badge variant="secondary">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor("isActive", {
    header: "Status",
    cell: (info) =>
      info.getValue() ? (
        <Badge>Active</Badge>
      ) : (
        <Badge variant="destructive">Revoked</Badge>
      ),
  }),
  columnHelper.accessor("lastUsedAt", {
    header: "Last Used",
    cell: (info) => {
      const v = info.getValue();
      return v ? new Date(v).toLocaleDateString() : <span className="text-muted-foreground">Never</span>;
    },
  }),
];

function ApiKeysPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  const keys = useQuery(api.platformApiKeys.listAll, {});
  const revokeKey = useMutation(api.platformApiKeys.revoke);

  async function handleRevoke() {
    if (!revokeTarget) return;
    await revokeKey({ apiKeyId: revokeTarget as Id<"api_keys"> });
    setRevokeTarget(null);
  }

  const allColumns = [
    ...columns,
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => {
        if (!row.original.isActive) return null;
        return (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setRevokeTarget(row.original._id)}
            >
              Revoke
            </Button>
          </div>
        );
      },
    },
  ] as any[];

  const table = useReactTable({
    data: keys ?? [],
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="text-sm text-muted-foreground">
          View and manage API keys across all tenants
        </p>
      </div>

      {!keys ? (
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
                    No API keys found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!revokeTarget} onOpenChange={(o) => { if (!o) setRevokeTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              This will permanently revoke this API key. Any integrations using it will stop working. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRevoke}>Revoke</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
