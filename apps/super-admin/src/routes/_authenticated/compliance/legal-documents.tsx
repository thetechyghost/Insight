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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/compliance/legal-documents")({
  component: LegalDocumentsPage,
});

type LegalDocRow = {
  _id: string;
  _creationTime: number;
  type: string;
  version: string;
  content: string;
  effectiveDate: string;
  tenantId?: string;
};

const columnHelper = createColumnHelper<LegalDocRow>();

const columns = [
  columnHelper.accessor("type", {
    header: "Type",
    cell: (info) => (
      <Badge variant="outline" className="capitalize">
        {info.getValue().replace(/_/g, " ")}
      </Badge>
    ),
  }),
  columnHelper.accessor("version", {
    header: "Version",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor("effectiveDate", {
    header: "Effective Date",
  }),
  columnHelper.accessor("tenantId", {
    header: "Scope",
    cell: (info) =>
      info.getValue() ? (
        <Badge variant="secondary">Tenant</Badge>
      ) : (
        <Badge>Platform</Badge>
      ),
  }),
];

type DocForm = {
  type: string;
  version: string;
  content: string;
  effectiveDate: string;
};

const emptyForm: DocForm = {
  type: "terms_of_service",
  version: "",
  content: "",
  effectiveDate: "",
};

function LegalDocumentsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<any>(null);
  const [form, setForm] = useState<DocForm>(emptyForm);
  const [sorting, setSorting] = useState<SortingState>([]);

  const documents = useQuery(api.legalDocuments.list, {});
  const createDoc = useMutation(api.legalDocuments.create);
  const updateDoc = useMutation(api.legalDocuments.update);

  function openCreate() {
    setForm(emptyForm);
    setEditDoc(null);
    setSheetOpen(true);
  }

  function openEdit(doc: any) {
    setForm({
      type: doc.type,
      version: doc.version,
      content: doc.content,
      effectiveDate: doc.effectiveDate,
    });
    setEditDoc(doc);
    setSheetOpen(true);
  }

  async function handleSubmit() {
    if (editDoc) {
      await updateDoc({
        documentId: editDoc._id as Id<"legal_documents">,
        content: form.content || undefined,
        effectiveDate: form.effectiveDate || undefined,
      });
    } else {
      await createDoc({
        type: form.type as any,
        version: form.version,
        content: form.content,
        effectiveDate: form.effectiveDate,
      });
    }
    setSheetOpen(false);
  }

  const allColumns = [
    ...columns,
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => openEdit(row.original)}
            className="text-sm text-primary hover:underline"
          >
            Edit
          </button>
        </div>
      ),
    },
  ] as any[];

  const table = useReactTable({
    data: documents ?? [],
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Legal Documents</h1>
          <p className="text-sm text-muted-foreground">
            Manage platform-wide legal documents — terms of service, privacy policy, waivers, and DPAs
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Document
        </Button>
      </div>

      {!documents ? (
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
                    No legal documents found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editDoc ? "Edit Document" : "Create Document"}</SheetTitle>
            <SheetDescription>
              {editDoc
                ? "Update this legal document version."
                : "Create a new legal document version."}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => { if (v) setForm({ ...form, type: v }); }}
                disabled={!!editDoc}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="terms_of_service">Terms of Service</SelectItem>
                  <SelectItem value="privacy_policy">Privacy Policy</SelectItem>
                  <SelectItem value="waiver">Waiver</SelectItem>
                  <SelectItem value="dpa">DPA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="e.g. 2.1"
                disabled={!!editDoc}
              />
            </div>
            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Full document text..."
                className="min-h-[200px]"
              />
            </div>
          </div>
          <SheetFooter>
            <Button
              onClick={handleSubmit}
              disabled={!form.version.trim() || !form.content.trim() || !form.effectiveDate}
            >
              {editDoc ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
