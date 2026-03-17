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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/integrations/")({
  component: IntegrationsPage,
});

// ─── Connections ────────────────────────────────────────────────────────────

type ConnectionRow = {
  _id: string;
  _creationTime: number;
  tenantId: string;
  provider: string;
  status: string;
};

const connHelper = createColumnHelper<ConnectionRow>();

const connectionColumns = [
  connHelper.accessor("provider", {
    header: "Provider",
    cell: (info) => <span className="font-medium capitalize">{info.getValue()}</span>,
  }),
  connHelper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const s = info.getValue();
      const variant =
        s === "connected" ? "default" : s === "error" ? "destructive" : "secondary";
      return <Badge variant={variant}>{s}</Badge>;
    },
  }),
  connHelper.accessor("_creationTime", {
    header: "Connected",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
];

// ─── Webhooks ───────────────────────────────────────────────────────────────

type WebhookRow = {
  _id: string;
  _creationTime: number;
  tenantId: string;
  url: string;
  eventsSubscribed: string[];
  status: string;
  failureCount?: number;
};

const hookHelper = createColumnHelper<WebhookRow>();

const webhookColumns = [
  hookHelper.accessor("url", {
    header: "URL",
    cell: (info) => (
      <span className="font-mono text-xs">{info.getValue()}</span>
    ),
  }),
  hookHelper.accessor("eventsSubscribed", {
    header: "Events",
    cell: (info) =>
      info
        .getValue()
        .slice(0, 3)
        .map((e) => (
          <Badge key={e} variant="outline" className="mr-1 text-xs">
            {e}
          </Badge>
        )),
  }),
  hookHelper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const s = info.getValue();
      const variant =
        s === "active" ? "default" : s === "failed" ? "destructive" : "secondary";
      return <Badge variant={variant}>{s}</Badge>;
    },
  }),
  hookHelper.accessor("failureCount", {
    header: "Failures",
    cell: (info) => {
      const c = info.getValue() ?? 0;
      return c > 0 ? (
        <span className="text-destructive font-medium">{c}</span>
      ) : (
        <span className="text-muted-foreground">0</span>
      );
    },
  }),
];

function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          View integration connections and webhooks across all tenants
        </p>
      </div>

      <Tabs defaultValue="connections">
        <TabsList>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>
        <TabsContent value="connections">
          <ConnectionsTab />
        </TabsContent>
        <TabsContent value="webhooks">
          <WebhooksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConnectionsTab() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const connections = useQuery(api.platformIntegrations.listAllConnections, {});

  const table = useReactTable({
    data: connections ?? [],
    columns: connectionColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="pt-4">
      {!connections ? (
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
                  <TableCell colSpan={connectionColumns.length} className="h-24 text-center">
                    No integration connections found.
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

function WebhooksTab() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const webhooks = useQuery(api.platformIntegrations.listAllWebhooks, {});

  const table = useReactTable({
    data: webhooks ?? [],
    columns: webhookColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="pt-4">
      {!webhooks ? (
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
                  <TableCell colSpan={webhookColumns.length} className="h-24 text-center">
                    No webhooks found.
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
