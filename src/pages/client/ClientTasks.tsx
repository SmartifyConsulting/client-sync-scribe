import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { CheckSquare, Loader2, Clock, CheckCircle2, Mic, MicOff, Send, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { SectionCountPill, DATE_BUCKETS, dateBucketFor } from "@/components/ui/section-accordion";
import { SectionHeader } from "@/features/clients/components/sectionStyles";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";

interface PatientTodo {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  vulas_reward: number;
  created_at: string;
  completed_at: string | null;
  proof_url: string | null;
  patient_id: string | null;
  task_type: string;
}

export default function ClientTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [todos, setTodos] = useState<PatientTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientIds, setPatientIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) fetchTodos();
  }, [user]);

  const fetchTodos = async () => {
    try {
      // Single round trip: filter todos via the embedded clients relation
      // instead of waiting on a separate patient-id lookup first. The plain
      // patient-id query still runs (in parallel) since it's needed for
      // "add task" even when there are zero todos yet.
      const [todosRes, patientsRes] = await Promise.all([
        (supabase.from("todos") as any)
          .select("*, clients!inner(id)")
          .eq("clients.patient_user_id", user!.id)
          .eq("assignee", "client")
          .order("created_at", { ascending: false }),

        supabase.from("clients").select("id").eq("patient_user_id", user!.id),
      ]);

      if (todosRes.error) throw todosRes.error;
      setTodos(todosRes.data || []);
      setPatientIds((patientsRes.data || []).map((p: any) => p.id));
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const [groupBy, setGroupBy] = useState<"date" | "status">("date");
  const [search, setSearch] = useState("");

  const filteredTodos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return todos;
    return todos.filter((t) =>
      [t.title, t.description].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [todos, search]);

  const pendingTodos = filteredTodos.filter(t => t.status === "pending");
  const completedTodos = filteredTodos.filter(t => t.status === "completed");

  const dateGroups = useMemo(() => {
    const buckets: Record<string, PatientTodo[]> = { today: [], week: [], month: [], older: [] };
    for (const todo of filteredTodos) buckets[dateBucketFor(todo.due_date || todo.created_at)].push(todo);
    return DATE_BUCKETS.map((b) => ({ key: b.key, label: b.label, items: buckets[b.key] })).filter((g) => g.items.length > 0);
  }, [filteredTodos]);

  // --- Task input state (must be before early returns) ---
  const [taskText, setTaskText] = useState("");
  const [isRecordingTask, setIsRecordingTask] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const taskRecorderRef = useRef<MediaRecorder | null>(null);
  const taskChunksRef = useRef<Blob[]>([]);
  const startTaskRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      taskChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) taskChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(taskChunksRef.current, { type: mimeType });
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("file", blob, `task-${Date.now()}.webm`);
          const { data, error } = await supabase.functions.invoke("transcribe-audio", { body: formData });
          if (error) throw error;
          if (data?.text) setTaskText((prev) => (prev ? prev + " " : "") + data.text);
        } catch (err: any) {
          toast({ title: "Transcription failed", description: err.message, variant: "destructive" });
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      taskRecorderRef.current = recorder;
      setIsRecordingTask(true);
    } catch {
      toast({ title: "Mic Error", description: "Could not access microphone.", variant: "destructive" });
    }
  }, [toast]);

  const stopTaskRecording = useCallback(() => {
    taskRecorderRef.current?.stop();
    setIsRecordingTask(false);
  }, []);

  // Auto-trigger recording when arrived from "Record Task" button on dashboard
  const [searchParams, setSearchParams] = useSearchParams();
  const autoRecordTriggered = useRef(false);
  useEffect(() => {
    if (loading || autoRecordTriggered.current) return;
    if (searchParams.get("autoRecord") === "true") {
      autoRecordTriggered.current = true;
      setSearchParams({}, { replace: true });
      setTimeout(() => { startTaskRecording(); }, 300);
    }
  }, [loading, searchParams, setSearchParams, startTaskRecording]);

  const handleAddTask = async () => {
    if (!taskText.trim() || !user) return;
    setAddingTask(true);
    try {
      const { error } = await supabase.from("todos").insert({
        title: taskText.trim(),
        user_id: user.id,
        patient_id: patientIds[0] || null,
        status: "pending",
        priority: "medium",
        task_type: "general",
        assignee: "client",
      } as any);

      if (error) throw error;
      setTaskText("");
      toast({ title: "Action added" });
      fetchTodos();
    } catch (err: any) {
      toast({ title: "Failed to add action", description: err.message, variant: "destructive" });
    } finally {
      setAddingTask(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="page-title">
          My Tasks
        </h1>
        <p className="text-muted-foreground text-xs">Actions assigned to you by your wealth managers</p>
      </div>

      {/* Task Input Area */}
      <div className="flex flex-col items-center gap-3 py-4">
        <Button
          variant={isRecordingTask ? "destructive" : "outline"}
          size="icon"
          className="h-14 w-14 rounded-full shadow-md"
          onClick={isRecordingTask ? stopTaskRecording : startTaskRecording}
          disabled={isTranscribing}
        >
          {isTranscribing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isRecordingTask ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          {isRecordingTask ? "Recording... tap to stop" : isTranscribing ? "Transcribing..." : "Tap to dictate a task"}
        </p>
        <div className="flex w-full max-w-md gap-2">
          <Input
            placeholder="Type an action..."
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
            disabled={addingTask}
          />
          <Button size="icon" onClick={handleAddTask} disabled={!taskText.trim() || addingTask}>
            {addingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {todos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <CheckSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No actions assigned yet</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search actions..."
                className="h-9 pl-8 text-xs"
              />
            </div>
            <ToggleGroup type="single" value={groupBy} onValueChange={(v) => v && setGroupBy(v as "date" | "status")} size="sm" variant="outline">
              <ToggleGroupItem value="date" className="text-xs px-3">Date</ToggleGroupItem>
              <ToggleGroupItem value="status" className="text-xs px-3">Status</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {filteredTodos.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1 py-6 text-center">No actions match your search.</p>
          ) : groupBy === "date" ? (
            <div className="client-section-frame rounded-xl border border-border bg-card overflow-hidden divide-y divide-white">
              {dateGroups.map((group, idx) => (
                <Collapsible key={group.key} defaultOpen={idx === 0} className="bg-card overflow-hidden">
                  <SectionHeader icon={Clock} label={group.label} extra={<SectionCountPill count={group.items.length} />} />
                  <CollapsibleContent className="p-3">
                    <div className="divide-y divide-border">
                      {group.items.map((todo) => (
                        <TaskCard key={todo.id} todo={todo} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          ) : (
            <div className="client-section-frame rounded-xl border border-border bg-card overflow-hidden divide-y divide-white">
              {pendingTodos.length > 0 && (
                <Collapsible defaultOpen className="bg-card overflow-hidden">
                  <SectionHeader icon={Clock} label="Pending" extra={<SectionCountPill count={pendingTodos.length} />} />
                  <CollapsibleContent className="p-3">
                    <div className="divide-y divide-border">
                      {pendingTodos.map((todo) => (
                        <TaskCard key={todo.id} todo={todo} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {completedTodos.length > 0 && (
                <Collapsible defaultOpen={false} className="bg-card overflow-hidden">
                  <SectionHeader icon={CheckCircle2} label="Completed" extra={<SectionCountPill count={completedTodos.length} />} />
                  <CollapsibleContent className="p-3">
                    <div className="divide-y divide-border">
                      {completedTodos.map((todo) => (
                        <TaskCard key={todo.id} todo={todo} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TaskCard({ todo }: { todo: PatientTodo }) {
  const isCompleted = todo.status === "completed";

  const priorityColors: Record<string, string> = {
    high: "bg-destructive/10 text-destructive",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <div className={`flex items-center gap-2 px-1 py-2 ${isCompleted ? "opacity-60" : ""}`}>
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isCompleted ? "bg-sky-50 dark:bg-primary/15" : "bg-primary/10"}`}>
        {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <CheckSquare className="h-3.5 w-3.5 text-primary" />}
      </div>
      <span
        className={`flex-1 min-w-0 truncate text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}
        title={todo.description || todo.title}
      >
        {todo.title}
      </span>
      <Badge variant="outline" className={`text-xs shrink-0 ${priorityColors[todo.priority] || ""}`}>
        {todo.priority}
      </Badge>
      {todo.due_date && (
        <span className="hidden sm:inline text-xs text-muted-foreground shrink-0 whitespace-nowrap">
          Due {format(new Date(todo.due_date), "MMM d, yyyy")}
        </span>
      )}
    </div>
  );
}
