import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useState, useCallback } from "react";
import { useDebouncedCallback } from "@tanstack/react-pacer";
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
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/exercises")({
  component: ExercisesPage,
});

type ExerciseRow = {
  _id: string;
  name: string;
  category: string;
  difficultyLevel?: string;
  equipment?: string[];
};

const columnHelper = createColumnHelper<ExerciseRow>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor("category", {
    header: "Category",
    cell: (info) => <Badge variant="outline">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor("difficultyLevel", {
    header: "Difficulty",
    cell: (info) => info.getValue() ?? <span className="text-muted-foreground">-</span>,
  }),
  columnHelper.accessor("equipment", {
    header: "Equipment",
    cell: (info) => {
      const eq = info.getValue();
      return eq?.length ? eq.join(", ") : <span className="text-muted-foreground">None</span>;
    },
  }),
];

type ExerciseForm = {
  name: string;
  category: string;
  equipment: string;
  muscleGroups: string;
  instructions: string;
  difficultyLevel: string;
};

const emptyForm: ExerciseForm = {
  name: "",
  category: "weightlifting",
  equipment: "",
  muscleGroups: "",
  instructions: "",
  difficultyLevel: "",
};

function ExercisesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editExercise, setEditExercise] = useState<any>(null);
  const [deleteExercise, setDeleteExercise] = useState<any>(null);
  const [form, setForm] = useState<ExerciseForm>(emptyForm);
  const [sorting, setSorting] = useState<SortingState>([]);

  const debouncedSetSearch = useDebouncedCallback(
    useCallback((value: string) => setDebouncedSearch(value), []),
    { wait: 300 }
  );

  const exercises = useQuery(api.platformExercises.list, {
    category: categoryFilter === "all" ? undefined : categoryFilter as any,
    search: debouncedSearch || undefined,
  });

  const createExercise = useMutation(api.platformExercises.create);
  const updateExercise = useMutation(api.platformExercises.update);
  const removeExercise = useMutation(api.platformExercises.remove);

  function openCreate() {
    setForm(emptyForm);
    setEditExercise(null);
    setSheetOpen(true);
  }

  function openEdit(exercise: any) {
    setForm({
      name: exercise.name,
      category: exercise.category,
      equipment: exercise.equipment?.join(", ") ?? "",
      muscleGroups: exercise.muscleGroups?.join(", ") ?? "",
      instructions: exercise.instructions ?? "",
      difficultyLevel: exercise.difficultyLevel ?? "",
    });
    setEditExercise(exercise);
    setSheetOpen(true);
  }

  async function handleSubmit() {
    const args = {
      name: form.name,
      category: form.category as any,
      equipment: form.equipment ? form.equipment.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      muscleGroups: form.muscleGroups ? form.muscleGroups.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      instructions: form.instructions || undefined,
      difficultyLevel: form.difficultyLevel ? (form.difficultyLevel as any) : undefined,
    };

    if (editExercise) {
      await updateExercise({ exerciseId: editExercise._id as Id<"exercises">, ...args });
    } else {
      await createExercise(args);
    }
    setSheetOpen(false);
  }

  async function handleDelete() {
    if (!deleteExercise) return;
    await removeExercise({ exerciseId: deleteExercise._id as Id<"exercises"> });
    setDeleteExercise(null);
  }

  const allColumns = [
    ...columns,
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => (
        <div className="flex gap-2 justify-end">
          <button onClick={() => openEdit(row.original)} className="text-sm text-primary hover:underline">Edit</button>
          <button onClick={() => setDeleteExercise(row.original)} className="text-sm text-destructive hover:underline">Delete</button>
        </div>
      ),
    },
  ] as any[];

  const table = useReactTable({
    data: exercises ?? [],
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
          <h1 className="text-2xl font-bold">Exercise Library</h1>
          <p className="text-sm text-muted-foreground">Manage platform-wide exercises available to all tenants</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Exercise
        </Button>
      </div>

      <div className="flex gap-4">
        <Input
          className="w-64"
          placeholder="Search exercises..."
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); debouncedSetSearch(e.target.value); }}
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="weightlifting">Weightlifting</SelectItem>
            <SelectItem value="gymnastics">Gymnastics</SelectItem>
            <SelectItem value="monostructural">Monostructural</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!exercises ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id} className="cursor-pointer select-none" onClick={h.column.getToggleSortingHandler()}>
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
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
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={allColumns.length} className="h-24 text-center">No exercises found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editExercise ? "Edit Exercise" : "Create Exercise"}</SheetTitle>
            <SheetDescription>{editExercise ? "Update this exercise." : "Add a new exercise to the platform library."}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Back Squat" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weightlifting">Weightlifting</SelectItem>
                  <SelectItem value="gymnastics">Gymnastics</SelectItem>
                  <SelectItem value="monostructural">Monostructural</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={form.difficultyLevel || "none"} onValueChange={(v) => setForm({ ...form, difficultyLevel: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="elite">Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Equipment (comma-separated)</Label>
              <Input value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} placeholder="barbell, dumbbells" />
            </div>
            <div className="space-y-2">
              <Label>Muscle Groups (comma-separated)</Label>
              <Input value={form.muscleGroups} onChange={(e) => setForm({ ...form, muscleGroups: e.target.value })} placeholder="quads, glutes" />
            </div>
            <div className="space-y-2">
              <Label>Instructions</Label>
              <Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Step-by-step..." />
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleSubmit} disabled={!form.name.trim()}>
              {editExercise ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={!!deleteExercise} onOpenChange={(o) => { if (!o) setDeleteExercise(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exercise</DialogTitle>
            <DialogDescription>Delete "{deleteExercise?.name}"? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteExercise(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
