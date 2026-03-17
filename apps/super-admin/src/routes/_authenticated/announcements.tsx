import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/announcements")({
  component: AnnouncementsPage,
});

const priorityVariant: Record<string, "default" | "secondary" | "destructive"> = {
  info: "secondary",
  warning: "default",
  critical: "destructive",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
};

type AnnouncementForm = {
  title: string;
  content: string;
  priority: "info" | "warning" | "critical";
};

const emptyForm: AnnouncementForm = {
  title: "",
  content: "",
  priority: "info",
};

function AnnouncementsPage() {
  const [statusTab, setStatusTab] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState<any>(null);
  const [deleteAnnouncement, setDeleteAnnouncement] = useState<any>(null);
  const [form, setForm] = useState<AnnouncementForm>(emptyForm);

  const statusFilter = statusTab === "all" ? undefined : (statusTab as any);
  const announcements = useQuery(api.platformAnnouncements.list, { status: statusFilter });

  const createAnnouncement = useMutation(api.platformAnnouncements.create);
  const updateAnnouncement = useMutation(api.platformAnnouncements.update);
  const publishAnnouncement = useMutation(api.platformAnnouncements.publish);
  const archiveAnnouncement = useMutation(api.platformAnnouncements.archive);
  const removeAnnouncement = useMutation(api.platformAnnouncements.remove);

  function openCreate() {
    setForm(emptyForm);
    setEditAnnouncement(null);
    setSheetOpen(true);
  }

  function openEdit(ann: any) {
    setForm({
      title: ann.title,
      content: ann.content,
      priority: ann.priority,
    });
    setEditAnnouncement(ann);
    setSheetOpen(true);
  }

  async function handleSubmit() {
    if (editAnnouncement) {
      await updateAnnouncement({
        announcementId: editAnnouncement._id as Id<"platform_announcements">,
        title: form.title,
        content: form.content,
        priority: form.priority,
      });
    } else {
      await createAnnouncement({
        title: form.title,
        content: form.content,
        priority: form.priority,
      });
    }
    setSheetOpen(false);
  }

  async function handlePublish(id: string) {
    await publishAnnouncement({ announcementId: id as Id<"platform_announcements"> });
  }

  async function handleArchive(id: string) {
    await archiveAnnouncement({ announcementId: id as Id<"platform_announcements"> });
  }

  async function handleDelete() {
    if (!deleteAnnouncement) return;
    await removeAnnouncement({ announcementId: deleteAnnouncement._id as Id<"platform_announcements"> });
    setDeleteAnnouncement(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground">Platform-wide announcements for tenants</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Announcement
        </Button>
      </div>

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={statusTab} className="mt-4">
          {!announcements ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements found.</p>
          ) : (
            <div className="space-y-4">
              {announcements.map((ann: any) => (
                <Card key={ann._id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{ann.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={priorityVariant[ann.priority]}>{ann.priority}</Badge>
                        <Badge variant={statusVariant[ann.status]}>{ann.status}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{ann.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {ann.publishedAt
                          ? `Published ${new Date(ann.publishedAt).toLocaleString()}`
                          : `Created ${new Date(ann._creationTime).toLocaleString()}`}
                        {ann.targetTenantIds?.length
                          ? ` · ${ann.targetTenantIds.length} tenant${ann.targetTenantIds.length !== 1 ? "s" : ""}`
                          : " · All tenants"}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(ann)}>Edit</Button>
                        {ann.status === "draft" && (
                          <>
                            <Button size="sm" onClick={() => handlePublish(ann._id)}>Publish</Button>
                            <Button variant="destructive" size="sm" onClick={() => setDeleteAnnouncement(ann)}>Delete</Button>
                          </>
                        )}
                        {ann.status === "published" && (
                          <Button variant="outline" size="sm" onClick={() => handleArchive(ann._id)}>Archive</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editAnnouncement ? "Edit Announcement" : "New Announcement"}</SheetTitle>
            <SheetDescription>{editAnnouncement ? "Update this announcement." : "Create a new platform announcement."}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Announcement title" />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Announcement body..." rows={5} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as AnnouncementForm["priority"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleSubmit} disabled={!form.title.trim() || !form.content.trim()}>
              {editAnnouncement ? "Save" : "Create Draft"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={!!deleteAnnouncement} onOpenChange={(o) => { if (!o) setDeleteAnnouncement(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
            <DialogDescription>Delete "{deleteAnnouncement?.title}"? Only draft announcements can be deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAnnouncement(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
