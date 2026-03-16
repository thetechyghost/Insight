import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useState, useCallback } from "react";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TenantDataTable } from "@/components/tenant-table/data-table";
import { TenantCreateSheet } from "@/components/tenant-create-sheet";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tenants/")({
  component: TenantsPage,
});

function TenantsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);

  // TanStack Pacer: 300ms debounce on search
  const debouncedSetSearch = useDebouncedCallback(
    useCallback((value: string) => {
      setDebouncedSearch(value);
      setCursor(undefined);
    }, []),
    { wait: 300 }
  );

  function handleSearchChange(value: string) {
    setSearchInput(value);
    debouncedSetSearch(value);
  }

  const result = useQuery(api.platformTenants.list, {
    search: debouncedSearch || undefined,
    status: statusFilter === "all" ? undefined : statusFilter as any,
    cursor,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            Manage all gym tenants on the platform
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Tenant
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search tenants..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCursor(undefined); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {result ? (
        <>
          <TenantDataTable data={result.tenants} />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{result.tenants.length} tenants shown</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!cursor}
                onClick={() => setCursor(undefined)}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!result.nextCursor}
                onClick={() => setCursor(result.nextCursor ?? undefined)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-muted-foreground">Loading...</div>
      )}

      <TenantCreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
