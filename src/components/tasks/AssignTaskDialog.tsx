import { useEffect, useMemo, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePracticeAssistant } from "@/hooks/usePracticeAssistant";

interface AssignTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected patient (optional). */
  patientId?: string | null;
  /** Existing task being re-assigned (optional). */
  task?: { id: string; title?: string | null; patient_id?: string | null } | null;
  onCreated?: () => void;
}

type Target =
  | { kind: "colleague"; userId: string; label: string }
  | { kind: "patient"; patientId: string; label: string };

/**
 * Creates a task and assigns it to a practice colleague (doctor or Practice
 * Management Assistant) or to a patient.
 */
export function AssignTaskDialog({
  open,
  onOpenChange,
  patientId,
  task,
  onCreated,
}: AssignTaskDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { colleagues } = usePracticeAssistant();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [targetKey, setTargetKey] = useState("");
  const [patients, setPatients] = useState<{ id: string; name: string; patient_user_id: string | null }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, name, patient_user_id")
        .order("name", { ascending: true });
      setPatients((data || []) as any);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const pid = task?.patient_id ?? patientId;
    if (pid) setTargetKey(`patient:${pid}`);
    if (task?.title) setTitle(task.title);
  }, [open, patientId, task?.id]);

  const targets = useMemo<Target[]>(() => {
    const list: Target[] = colleagues.map((c) => ({
      kind: "colleague",
      userId: c.user_id,
      label: `${c.full_name || "Colleague"}${c.role === "assistant" ? " (Assistant)" : ""}`,
    }));
    for (const p of patients) {
      list.push({ kind: "patient", patientId: p.id, label: `${p.name} (Patient)` });
    }
    return list;
  }, [colleagues, patients]);

  const reset = () => {
    setTitle("");
    setNotes("");
    setDueDate("");
    setPriority("medium");
    setTargetKey("");
  };

  const handleSave = async () => {
    if (!user || !title.trim() || !targetKey) return;
    setSaving(true);
    try {
      const [kind, id] = targetKey.split(":");
      const isPatient = kind === "patient";
      const patient = isPatient ? patients.find((p) => p.id === id) : undefined;

      const payload: Record<string, unknown> = {
        user_id: user.id,
        created_by: user.id,
        title: title.trim(),
        description: notes.trim() || null,
        priority,
        status: "pending",
        due_date: dueDate || null,
        assignee: isPatient ? "patient" : "doctor",
        assigned_to_user_id: isPatient ? patient?.patient_user_id ?? null : id,
        patient_id: isPatient ? id : patientId ?? null,
      };

      let data: any;
      if (task?.id) {
        const { data: updated, error: updateError } = await supabase
          .from("todos")
          .update({
            title: payload.title,
            description: payload.description,
            priority: payload.priority,
            due_date: payload.due_date,
            assignee: payload.assignee,
            assigned_to_user_id: payload.assigned_to_user_id,
          } as any)
          .eq("id", task.id)
          .select()
          .single();
        if (updateError) throw updateError;
        data = updated;
      } else {
        const { data: created, error } = await supabase
          .from("todos")
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;
        data = created;
      }

      const notifyUser = isPatient ? patient?.patient_user_id : id;
      if (notifyUser) {
        await supabase.from("notifications").insert({
          user_id: notifyUser,
          title: `📋 New task: ${title.trim()}`,
          description: notes.trim() || "A new task has been assigned to you.",
          type: "task_assigned",
          reference_id: (data as any).id,
        });
      }

      toast({ title: "Action assigned" });
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      toast({
        title: "Could not assign action",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Assign a task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="assign-to">Assign to</Label>
            <Select value={targetKey} onValueChange={setTargetKey}>
              <SelectTrigger id="assign-to">
                <SelectValue placeholder="Choose a wealth manager, assistant or client" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {targets.map((t) => (
                  <SelectItem
                    key={t.kind === "patient" ? `patient:${t.patientId}` : `colleague:${t.userId}`}
                    value={t.kind === "patient" ? `patient:${t.patientId}` : `colleague:${t.userId}`}
                  >
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assign-title">Action</Label>
            <Input
              id="assign-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Confirm Friday theatre list"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assign-notes">Notes</Label>
            <Textarea
              id="assign-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[70px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="assign-due">Due date</Label>
              <Input
                id="assign-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger id="assign-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim() || !targetKey} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
