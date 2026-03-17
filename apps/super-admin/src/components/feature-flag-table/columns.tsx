import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

type FeatureFlagRow = {
  _id: string;
  name: string;
  status: "enabled" | "disabled" | "percentage_rollout";
  targetTenantIds?: string[];
  rolloutPercentage?: number;
};

const columnHelper = createColumnHelper<FeatureFlagRow>();

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  enabled: "default",
  disabled: "secondary",
  percentage_rollout: "outline",
};

export const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => (
      <Badge variant={statusVariant[info.getValue()] ?? "secondary"}>
        {info.getValue().replace("_", " ")}
      </Badge>
    ),
  }),
  columnHelper.accessor("targetTenantIds", {
    header: "Targets",
    cell: (info) => {
      const ids = info.getValue();
      if (!ids || ids.length === 0) return <span className="text-muted-foreground">All tenants</span>;
      return <span>{ids.length} tenant{ids.length !== 1 ? "s" : ""}</span>;
    },
  }),
  columnHelper.accessor("rolloutPercentage", {
    header: "Rollout %",
    cell: (info) => {
      const pct = info.getValue();
      return pct !== undefined ? `${pct}%` : <span className="text-muted-foreground">-</span>;
    },
  }),
];
