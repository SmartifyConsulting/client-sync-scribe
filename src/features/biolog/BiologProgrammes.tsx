import { useState } from "react";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  useAssignProgramme,
  useBiologProgrammes,
  useDeleteProgramme,
  useEndAssignment,
  useProgrammeAssignments,
  useSaveProgramme,
} from "./useBiolog";

interface Props {
  ownerUserId?: string;
  readOnly?: boolean;
}

export function BiologProgrammes({ ownerUserId, readOnly }: Props) {
  const { data: programmes = [], isLoading } = useBiologProgrammes();
  const { data: assignments = [] } = useProgrammeAssignments(ownerUserId);
  const saveProgramme = useSaveProgramme();
  const deleteProgramme = useDeleteProgramme();
  const assign = useAssignProgramme(ownerUserId);
  const endAssignment = useEndAssignment();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("mixed");
  const [durationDays, setDurationDays] = useState(30);
  const [targets, setTargets] = useState("");

  const reset = () => {
    setName("");
    setDescription("");
    setKind("mixed");
    setDurationDays(30);
    setTargets("");
  };

  const handleCreate = async () => {
    if (!name.trim()) return toast.error("Give the programme a name.");
    try {
      await saveProgramme.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        kind,
        duration_days: durationDays,
        targets: targets
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean)
          .map((label) => ({ label })),
      });
      toast.success("Programme created.");
      reset();
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Could not create the programme.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">Active programmes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {assignments.length === 0 && (
            <p className="text-xs text-muted-foreground">No programmes assigned yet.</p>
          )}
          {assignments.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-300 p-3"
            >
              <div>
                <p className="text-xs font-bold text-foreground">
                  {a.programme?.name ?? "Programme"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Started {format(parseISO(a.start_date), "d MMM yyyy")}
                  {a.programme?.duration_days ? ` · ${a.programme.duration_days} days` : ""}
                </p>
                {a.programme?.targets?.length ? (
                  <ul className="mt-1 list-disc pl-4 text-[11px] text-muted-foreground">
                    {a.programme.targets.map((t, i) => (
                      <li key={i}>{t.label}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={a.status === "active" ? "default" : "secondary"} className="text-[10px]">
                  {a.status}
                </Badge>
                {!readOnly && a.status === "active" && (
                  <Button size="sm" variant="outline" onClick={() => endAssignment.mutate(a.id)}>
                    Complete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">Programme library</CardTitle>
          {!readOnly && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  New programme
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-sm">New programme</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="text-xs" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Type</Label>
                      <Select value={kind} onValueChange={setKind}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diet">Diet</SelectItem>
                          <SelectItem value="exercise">Exercise</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Duration (days)</Label>
                      <Input
                        type="number"
                        value={durationDays}
                        onChange={(e) => setDurationDays(Number(e.target.value) || 30)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Targets (one per line)</Label>
                    <Textarea
                      value={targets}
                      onChange={(e) => setTargets(e.target.value)}
                      placeholder={"No refined sugar\n30 minutes walking"}
                      className="text-xs"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={saveProgramme.isPending}>
                    {saveProgramme.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {programmes.length === 0 && (
            <p className="text-xs text-muted-foreground">No programmes created yet.</p>
          )}
          {programmes.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-300 p-3"
            >
              <div>
                <p className="text-xs font-bold text-foreground">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {p.kind} · {p.duration_days} days
                </p>
                {p.description && (
                  <p className="text-[11px] text-muted-foreground">{p.description}</p>
                )}
              </div>
              {!readOnly && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await assign.mutateAsync({ programmeId: p.id });
                        toast.success("Programme assigned.");
                      } catch (err: any) {
                        toast.error(err?.message || "Could not assign that programme.");
                      }
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                    Assign
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteProgramme.mutate(p.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
