import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { FeatureFlagDataTable } from "@/components/feature-flag-table/data-table";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/feature-flags")({
  component: FeatureFlagsPage,
});

type FlagFormData = {
  name: string;
  status: "enabled" | "disabled" | "percentage_rollout";
  rolloutPercentage?: number;
};

function FeatureFlagsPage() {
  const flags = useQuery(api.platformFeatureFlags.list, {});
  const createFlag = useMutation(api.platformFeatureFlags.create);
  const updateFlag = useMutation(api.platformFeatureFlags.update);
  const removeFlag = useMutation(api.platformFeatureFlags.remove);

  const [createOpen, setCreateOpen] = useState(false);
  const [editFlag, setEditFlag] = useState<any>(null);
  const [deleteFlag, setDeleteFlag] = useState<any>(null);

  const [form, setForm] = useState<FlagFormData>({
    name: "",
    status: "disabled",
  });

  function resetForm() {
    setForm({ name: "", status: "disabled" });
  }

  function openEdit(flag: any) {
    setForm({
      name: flag.name,
      status: flag.status,
      rolloutPercentage: flag.rolloutPercentage,
    });
    setEditFlag(flag);
  }

  async function handleCreate() {
    await createFlag({
      name: form.name,
      status: form.status,
      rolloutPercentage: form.status === "percentage_rollout" ? form.rolloutPercentage : undefined,
    });
    setCreateOpen(false);
    resetForm();
  }

  async function handleUpdate() {
    if (!editFlag) return;
    await updateFlag({
      flagId: editFlag._id as Id<"feature_flags">,
      status: form.status,
      rolloutPercentage: form.status === "percentage_rollout" ? form.rolloutPercentage : undefined,
    });
    setEditFlag(null);
    resetForm();
  }

  async function handleDelete() {
    if (!deleteFlag) return;
    await removeFlag({ flagId: deleteFlag._id as Id<"feature_flags"> });
    setDeleteFlag(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feature Flags</h1>
          <p className="text-sm text-muted-foreground">
            Manage platform-wide feature flags and rollouts
          </p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New Flag
        </Button>
      </div>

      {!flags ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <FeatureFlagDataTable
          data={flags}
          onEdit={openEdit}
          onDelete={(flag) => setDeleteFlag(flag)}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Feature Flag</DialogTitle>
            <DialogDescription>Add a new feature flag to the platform.</DialogDescription>
          </DialogHeader>
          <FlagForm form={form} setForm={setForm} isEdit={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editFlag} onOpenChange={(open) => { if (!open) setEditFlag(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Feature Flag</DialogTitle>
            <DialogDescription>Update the flag "{editFlag?.name}".</DialogDescription>
          </DialogHeader>
          <FlagForm form={form} setForm={setForm} isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFlag(null)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteFlag} onOpenChange={(open) => { if (!open) setDeleteFlag(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feature Flag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteFlag?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFlag(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FlagForm({
  form,
  setForm,
  isEdit,
}: {
  form: FlagFormData;
  setForm: (f: FlagFormData) => void;
  isEdit: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="flag-name">Name</Label>
        <Input
          id="flag-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. beta_dashboard"
          disabled={isEdit}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="flag-status">Status</Label>
        <Select
          value={form.status}
          onValueChange={(v) =>
            setForm({ ...form, status: v as FlagFormData["status"] })
          }
        >
          <SelectTrigger id="flag-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
            <SelectItem value="percentage_rollout">Percentage Rollout</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {form.status === "percentage_rollout" && (
        <div className="space-y-2">
          <Label htmlFor="flag-percentage">Rollout Percentage</Label>
          <Input
            id="flag-percentage"
            type="number"
            min={0}
            max={100}
            value={form.rolloutPercentage ?? ""}
            onChange={(e) =>
              setForm({ ...form, rolloutPercentage: parseInt(e.target.value, 10) || 0 })
            }
            placeholder="e.g. 25"
          />
        </div>
      )}
    </div>
  );
}
