import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/stat-card";

export const Route = createFileRoute("/_authenticated/tenants/$tenantId")({
  component: TenantDetailPage,
});

function TenantDetailPage() {
  const { tenantId } = Route.useParams();
  const data = useQuery(api.platformTenants.getById, {
    tenantId: tenantId as Id<"tenants">,
  });
  const notes = useQuery(api.platformTenantNotes.listByTenant, {
    tenantId: tenantId as Id<"tenants">,
  });

  const suspendMutation = useMutation(api.platformTenants.suspend);
  const reactivateMutation = useMutation(api.platformTenants.reactivate);
  const createNote = useMutation(api.platformTenantNotes.create);

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [noteContent, setNoteContent] = useState("");

  if (!data) return <div className="text-muted-foreground">Loading...</div>;

  const { tenant, provisioningStatus, memberCount, ownerInfo } = data;
  const isSuspended = provisioningStatus === "suspended";

  async function handleSuspend() {
    await suspendMutation({
      tenantId: tenantId as Id<"tenants">,
      reason,
    });
    setSuspendOpen(false);
    setReason("");
  }

  async function handleReactivate() {
    await reactivateMutation({
      tenantId: tenantId as Id<"tenants">,
      reason,
    });
    setReactivateOpen(false);
    setReason("");
  }

  async function handleAddNote() {
    if (!noteContent.trim()) return;
    await createNote({
      tenantId: tenantId as Id<"tenants">,
      content: noteContent,
    });
    setNoteContent("");
  }

  const statusVariant: Record<string, "default" | "destructive" | "secondary"> = {
    active: "default",
    suspended: "destructive",
    pending: "secondary",
    approved: "secondary",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground text-lg font-bold">
            {tenant.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{tenant.name}</h1>
              <Badge variant={statusVariant[provisioningStatus] ?? "secondary"}>
                {provisioningStatus}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {tenant.slug} &middot; Created{" "}
              {new Date(tenant._creationTime).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isSuspended ? (
            <Button variant="outline" onClick={() => setReactivateOpen(true)}>
              Reactivate
            </Button>
          ) : (
            <Button
              variant="outline"
              className="text-yellow-600 border-yellow-600/30"
              onClick={() => setSuspendOpen(true)}
            >
              Suspend
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Members" value={memberCount} />
            <StatCard
              title="Owner"
              value={ownerInfo?.name ?? "Unknown"}
              subtitle={ownerInfo?.email}
            />
            <StatCard
              title="Timezone"
              value={tenant.timezone ?? "Not set"}
            />
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tenant Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono">{tenant.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timezone</span>
                <span>{tenant.timezone ?? "Not configured"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custom Domain</span>
                <span>{tenant.customDomain ?? "None"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stripe Connect</span>
                <span>{tenant.stripeConnectAccountId ?? "Not connected"}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Member list — coming in a future iteration.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Usage analytics — coming in a future iteration.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Add an internal note..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddNote} disabled={!noteContent.trim()}>
              Add
            </Button>
          </div>
          {notes?.map((note) => (
            <Card key={note._id}>
              <CardContent className="pt-4">
                <p className="text-sm">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(note._creationTime).toLocaleString()}
                  {note.updatedAt && " (edited)"}
                </p>
              </CardContent>
            </Card>
          ))}
          {notes?.length === 0 && (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Suspend Dialog */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Tenant</DialogTitle>
            <DialogDescription>
              This will temporarily disable access for all members of {tenant.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Reason (required)</Label>
            <Input
              id="suspend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Payment overdue, terms violation, etc."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={!reason.trim()}>
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog open={reactivateOpen} onOpenChange={setReactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Tenant</DialogTitle>
            <DialogDescription>
              This will restore access for all members of {tenant.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reactivate-reason">Reason (required)</Label>
            <Input
              id="reactivate-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Payment resolved, review completed, etc."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateOpen(false)}>Cancel</Button>
            <Button onClick={handleReactivate} disabled={!reason.trim()}>Reactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
