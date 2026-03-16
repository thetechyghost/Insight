import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";

type TenantRow = {
  _id: string;
  name: string;
  slug: string;
  _creationTime: number;
  memberCount: number;
  provisioningStatus: "pending" | "approved" | "active" | "suspended";
};

const columnHelper = createColumnHelper<TenantRow>();

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  pending: "secondary",
  approved: "outline",
  suspended: "destructive",
};

export const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => (
      <div>
        <div className="font-medium">{info.getValue()}</div>
        <div className="text-xs text-muted-foreground">{info.row.original.slug}</div>
      </div>
    ),
  }),
  columnHelper.accessor("provisioningStatus", {
    header: "Status",
    cell: (info) => (
      <Badge variant={statusVariant[info.getValue()] ?? "secondary"}>
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor("memberCount", {
    header: "Members",
  }),
  columnHelper.accessor("_creationTime", {
    header: "Created",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
  columnHelper.display({
    id: "actions",
    cell: (info) => (
      <Link
        to="/tenants/$tenantId"
        params={{ tenantId: info.row.original._id }}
        className="text-sm text-primary hover:underline"
      >
        View
      </Link>
    ),
  }),
];
