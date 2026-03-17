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
  const terminateMutation = useMutation(api.platformTenants.terminate);
  const createNote = useMutation(api.platformTenantNotes.create);

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmSlug, setConfirmSlug] = useState("");
  const [noteContent, setNoteContent] = useState("");

  if (!data) return <div className="text-muted-foreground">Loading...</div>;

  const { tenant, provisioningStatus, memberCount, ownerInfo } = data;
  const isSuspended = provisioningStatus === "suspended";
  const isTerminated = provisioningStatus === "terminated";

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

  async function handleTerminate() {
    await terminateMutation({
      tenantId: tenantId as Id<"tenants">,
      reason,
      confirmSlug,
    });
    setTerminateOpen(false);
    setReason("");
    setConfirmSlug("");
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
    terminated: "destructive",
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
          {!isTerminated && (
            <>
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
              <Button
                variant="destructive"
                onClick={() => setTerminateOpen(true)}
              >
                Terminate
              </Button>
            </>
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
          <MembersTab tenantId={tenantId as Id<"tenants">} />
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <UsageTab tenantId={tenantId as Id<"tenants">} />
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

      {/* Terminate Dialog */}
      <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Tenant</DialogTitle>
            <DialogDescription>
              This will permanently deactivate {tenant.name} and cancel all memberships.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="terminate-reason">Reason (required)</Label>
              <Input
                id="terminate-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Business closed, contract ended, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terminate-confirm">
                Type <span className="font-mono font-bold">{tenant.slug}</span> to confirm
              </Label>
              <Input
                id="terminate-confirm"
                value={confirmSlug}
                onChange={(e) => setConfirmSlug(e.target.value)}
                placeholder={tenant.slug}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTerminateOpen(false); setConfirmSlug(""); setReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={!reason.trim() || confirmSlug !== tenant.slug}
            >
              Terminate Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MembersTab({ tenantId }: { tenantId: Id<"tenants"> }) {
  const result = useQuery(api.platformTenants.getMembers, { tenantId });

  if (!result) return <div className="text-muted-foreground">Loading...</div>;

  if (result.members.length === 0) {
    return <p className="text-sm text-muted-foreground">No members found.</p>;
  }

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left px-4 py-2 font-medium">Name</th>
            <th className="text-left px-4 py-2 font-medium">Email</th>
            <th className="text-left px-4 py-2 font-medium">Role</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
            <th className="text-left px-4 py-2 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody>
          {result.members.map((m) => (
            <tr key={m.membershipId} className="border-b last:border-0">
              <td className="px-4 py-2">{m.name}</td>
              <td className="px-4 py-2 text-muted-foreground">{m.email}</td>
              <td className="px-4 py-2 capitalize">{m.role}</td>
              <td className="px-4 py-2 capitalize">{m.status}</td>
              <td className="px-4 py-2">{m.joinDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsageTab({ tenantId }: { tenantId: Id<"tenants"> }) {
  const activity = useQuery(api.platformMetrics.getTenantActivity, { tenantId });

  if (!activity) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard title="Total Members" value={activity.totalMembers} />
      <StatCard title="Active Users (7d)" value={activity.activeUsers7d} />
      <StatCard title="Active Users (30d)" value={activity.activeUsers30d} />
      <StatCard title="Workouts (30d)" value={activity.totalWorkoutLogs30d} />
      <StatCard title="Logins (7d)" value={activity.loginCount7d} />
    </div>
  );
}
