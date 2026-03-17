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
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/benchmarks")({
  component: BenchmarksPage,
});

type BenchmarkRow = {
  _id: string;
  name: string;
  workoutType: string;
  category?: string;
  scoringMethod: string;
  prescribedMovements: { exerciseName: string; reps?: number }[];
};

const columnHelper = createColumnHelper<BenchmarkRow>();

const tableColumns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor("workoutType", {
    header: "Type",
    cell: (info) => <Badge variant="outline">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor("category", {
    header: "Category",
    cell: (info) => info.getValue() ?? <span className="text-muted-foreground">-</span>,
  }),
  columnHelper.accessor("scoringMethod", {
    header: "Scoring",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("prescribedMovements", {
    header: "Movements",
    cell: (info) => `${info.getValue().length} movement${info.getValue().length !== 1 ? "s" : ""}`,
  }),
];

type Movement = { exerciseName: string; reps?: number };
type BenchmarkForm = {
  name: string;
  workoutType: string;
  scoringMethod: string;
  category: string;
  timeCap: string;
  description: string;
  intendedStimulus: string;
  movements: Movement[];
};

const emptyForm: BenchmarkForm = {
  name: "",
  workoutType: "ForTime",
  scoringMethod: "time",
  category: "",
  timeCap: "",
  description: "",
  intendedStimulus: "",
  movements: [{ exerciseName: "", reps: undefined }],
};

function BenchmarksPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editBenchmark, setEditBenchmark] = useState<any>(null);
  const [deleteBenchmark, setDeleteBenchmark] = useState<any>(null);
  const [form, setForm] = useState<BenchmarkForm>(emptyForm);
  const [sorting, setSorting] = useState<SortingState>([]);

  const debouncedSetSearch = useDebouncedCallback(
    useCallback((value: string) => setDebouncedSearch(value), []),
    { wait: 300 }
  );

  const benchmarks = useQuery(api.platformBenchmarkWorkouts.list, {
    category: categoryFilter === "all" ? undefined : categoryFilter as any,
    search: debouncedSearch || undefined,
  });

  const createBenchmark = useMutation(api.platformBenchmarkWorkouts.create);
  const updateBenchmark = useMutation(api.platformBenchmarkWorkouts.update);
  const removeBenchmark = useMutation(api.platformBenchmarkWorkouts.remove);

  function openCreate() {
    setForm(emptyForm);
    setEditBenchmark(null);
    setSheetOpen(true);
  }

  function openEdit(benchmark: any) {
    setForm({
      name: benchmark.name,
      workoutType: benchmark.workoutType,
      scoringMethod: benchmark.scoringMethod,
      category: benchmark.category ?? "",
      timeCap: benchmark.timeCap?.toString() ?? "",
      description: benchmark.description ?? "",
      intendedStimulus: benchmark.intendedStimulus ?? "",
      movements: benchmark.prescribedMovements.map((m: any) => ({
        exerciseName: m.exerciseName,
        reps: m.reps,
      })),
    });
    setEditBenchmark(benchmark);
    setSheetOpen(true);
  }

  async function handleSubmit() {
    const movements = form.movements
      .filter((m) => m.exerciseName.trim())
      .map((m) => ({
        exerciseName: m.exerciseName,
        reps: m.reps,
      }));

    const args = {
      name: form.name,
      workoutType: form.workoutType,
      prescribedMovements: movements,
      scoringMethod: form.scoringMethod as any,
      category: form.category ? (form.category as any) : undefined,
      timeCap: form.timeCap ? parseInt(form.timeCap, 10) : undefined,
      description: form.description || undefined,
      intendedStimulus: form.intendedStimulus || undefined,
    };

    if (editBenchmark) {
      await updateBenchmark({ benchmarkId: editBenchmark._id as Id<"benchmark_workouts">, ...args });
    } else {
      await createBenchmark(args);
    }
    setSheetOpen(false);
  }

  async function handleDelete() {
    if (!deleteBenchmark) return;
    await removeBenchmark({ benchmarkId: deleteBenchmark._id as Id<"benchmark_workouts"> });
    setDeleteBenchmark(null);
  }

  function addMovement() {
    setForm({ ...form, movements: [...form.movements, { exerciseName: "", reps: undefined }] });
  }

  function removeMovement(index: number) {
    setForm({ ...form, movements: form.movements.filter((_, i) => i !== index) });
  }

  function updateMovement(index: number, field: string, value: any) {
    const updated = [...form.movements];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, movements: updated });
  }

  const allColumns = [
    ...tableColumns,
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => (
        <div className="flex gap-2 justify-end">
          <button onClick={() => openEdit(row.original)} className="text-sm text-primary hover:underline">Edit</button>
          <button onClick={() => setDeleteBenchmark(row.original)} className="text-sm text-destructive hover:underline">Delete</button>
        </div>
      ),
    },
  ] as any[];

  const table = useReactTable({
    data: benchmarks ?? [],
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
          <h1 className="text-2xl font-bold">Benchmark Workouts</h1>
          <p className="text-sm text-muted-foreground">Manage platform-wide benchmark workouts</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Benchmark
        </Button>
      </div>

      <div className="flex gap-4">
        <Input
          className="w-64"
          placeholder="Search benchmarks..."
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); debouncedSetSearch(e.target.value); }}
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Hero">Hero</SelectItem>
            <SelectItem value="Girl">Girl</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!benchmarks ? (
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
                  <TableCell colSpan={allColumns.length} className="h-24 text-center">No benchmarks found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editBenchmark ? "Edit Benchmark" : "Create Benchmark"}</SheetTitle>
            <SheetDescription>{editBenchmark ? "Update this benchmark." : "Add a new benchmark workout."}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Fran" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Workout Type</Label>
                <Input value={form.workoutType} onChange={(e) => setForm({ ...form, workoutType: e.target.value })} placeholder="ForTime, AMRAP, etc." />
              </div>
              <div className="space-y-2">
                <Label>Scoring Method</Label>
                <Select value={form.scoringMethod} onValueChange={(v) => setForm({ ...form, scoringMethod: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="reps">Reps</SelectItem>
                    <SelectItem value="rounds_reps">Rounds + Reps</SelectItem>
                    <SelectItem value="weight">Weight</SelectItem>
                    <SelectItem value="distance">Distance</SelectItem>
                    <SelectItem value="calories">Calories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category || "none"} onValueChange={(v) => setForm({ ...form, category: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    <SelectItem value="Hero">Hero</SelectItem>
                    <SelectItem value="Girl">Girl</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time Cap (seconds)</Label>
                <Input type="number" value={form.timeCap} onChange={(e) => setForm({ ...form, timeCap: e.target.value })} placeholder="e.g. 600" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Workout description..." />
            </div>
            <div className="space-y-2">
              <Label>Intended Stimulus</Label>
              <Textarea value={form.intendedStimulus} onChange={(e) => setForm({ ...form, intendedStimulus: e.target.value })} placeholder="Expected pace, strategy..." />
            </div>

            {/* Movements */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Movements</Label>
                <Button variant="outline" size="sm" onClick={addMovement}>+ Add</Button>
              </div>
              {form.movements.map((m, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    className="flex-1"
                    value={m.exerciseName}
                    onChange={(e) => updateMovement(i, "exerciseName", e.target.value)}
                    placeholder="Exercise name"
                  />
                  <Input
                    className="w-20"
                    type="number"
                    value={m.reps ?? ""}
                    onChange={(e) => updateMovement(i, "reps", e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="Reps"
                  />
                  {form.movements.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeMovement(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleSubmit} disabled={!form.name.trim() || !form.movements.some((m) => m.exerciseName.trim())}>
              {editBenchmark ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={!!deleteBenchmark} onOpenChange={(o) => { if (!o) setDeleteBenchmark(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Benchmark</DialogTitle>
            <DialogDescription>Delete "{deleteBenchmark?.name}"? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBenchmark(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
