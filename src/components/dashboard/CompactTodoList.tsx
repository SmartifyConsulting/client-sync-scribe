import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { translateTodoTitle } from "@/lib/translateTodoTitle";
import { isSamplePatient } from "@/lib/samplePatients";
import { SampleBadge } from "@/components/patients/SampleBadge";
import {
  Mic,
  MicOff,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  Loader2,
  Sparkles,
  Send,
  FileText,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentPreview } from "@/components/sessions/DocumentPreview";
import { useDocumentHeaderFooter } from "@/hooks/useDocumentHeaderFooter";
import { useProfile } from "@/hooks/useProfile";
import { resolveDocumentPreviewContent } from "@/lib/resolveDocumentPreviewContent";
import { TodoRow } from "@/components/todos/TodoRow";
import { AssignTaskDialog } from "@/components/tasks/AssignTaskDialog";
import { getTodoDisplay } from "@/lib/todoDisplay";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, User as UserIcon, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  SECTION_FRAME_CLASS,
  SECTION_ITEM_ROUNDED_CLASS,
  SECTION_TRIGGER_ROUNDED_CLASS,
  SECTION_TRIGGER_CLASS,
  SECTION_TRIGGER_ALWAYS_GREEN_CLASS,
  SECTION_CONTENT_CLASS,
  SectionCountPill,
  DATE_BUCKETS,
  dateBucketFor,
} from "@/components/ui/section-accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { useTranslation } from "react-i18next";

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  created_at: string;
  is_auto_executed?: boolean;
  document_id?: string | null;
  task_type?: string;
  patient_id?: string | null;
  patient_name?: string | null;
}

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
};

const actionTypeLabels: Record<string, string> = {
  schedule_appointment: "📅 Scheduled appointment",
  write_prescription: "💊 Created prescription",
  create_invoice: "🧾 Created invoice",
  write_medical_certificate: "📋 Created medical certificate",
  write_referral_letter: "✉️ Created referral letter",
  write_general_letter: "📝 Created general letter",
  manual_task: "📌 Manual task created",
  document_review: "📄 Review document",
};

export function CompactTodoList() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [assignTask, setAssignTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTaskText, setNewTaskText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [filter, setFilter] = useState<"active" | "completed">("active");
  const [sendingDocId, setSendingDocId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ content: string; title: string; logoUrl?: string; fontFamily?: string; userId?: string; templateName?: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);

  const { headerFooter } = useDocumentHeaderFooter(
    previewDoc ? { user_id: previewDoc.userId, template_name: previewDoc.templateName } : null
  );

  const handlePreviewDoc = async (todo: TodoItem) => {
    if (!todo.document_id) return;
    setLoadingPreview(todo.document_id);
    try {
      const { data: doc } = await supabase.from('documents').select('*').eq('id', todo.document_id).maybeSingle();
      if (!doc) throw new Error('Document not found');

      const resolved = await resolveDocumentPreviewContent({
        id: doc.id,
        content: doc.content,
        user_id: doc.user_id,
        patient_id: doc.patient_id,
        template_name: doc.template_name,
        session_id: doc.session_id,
        name: doc.name,
      });

      setPreviewDoc({
        content: resolved.resolvedContent,
        title: doc.template_name || doc.name || 'Document',
        logoUrl: resolved.logoUrl || profile?.logo_url || undefined,
        userId: doc.user_id,
        templateName: doc.template_name,
      });
    } catch (err) {
      console.error('Preview error:', err);
      toast({ title: 'Preview failed', variant: 'destructive' });
    } finally {
      setLoadingPreview(null);
    }
  };


  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<number>(0);
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTodos = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .eq("assignee", "doctor")
        .order("created_at", { ascending: false });


      if (error) throw error;

      // Resolve the real patient names so grouping never has to guess from the title.
      const patientIds = Array.from(
        new Set((data || []).map((t: any) => t.patient_id).filter(Boolean)),
      ) as string[];
      const nameById = new Map<string, string>();
      if (patientIds.length > 0) {
        const { data: patientRows } = await supabase
          .from("patients")
          .select("id, name")
          .in("id", patientIds);
        (patientRows || []).forEach((p: any) => nameById.set(p.id, p.name));
      }

      const docIds2 = Array.from(new Set((data || []).map((t: any) => t.document_id).filter(Boolean))) as string[];
      const sentDocs = new Set<string>();
      if (docIds2.length > 0) {
        const { data: docRows } = await (supabase.from("documents").select("id, email_sent_at") as any).in("id", docIds2);
        (docRows || []).forEach((d: any) => { if (d.email_sent_at) sentDocs.add(d.id); });
      }

      setTodos(
        (data || [])
          .filter((todo: any) => !(todo.document_id && sentDocs.has(todo.document_id)))
          .map((todo: any) => ({
          ...todo,
          completed: todo.status === "completed",
          priority: todo.priority as "low" | "medium" | "high",
          is_auto_executed: todo.is_auto_executed || false,
          document_id: todo.document_id || null,
          task_type: todo.task_type || 'standard',
          patient_name: (todo.patient_id && nameById.get(todo.patient_id)) || null,
        }))
      );
    } catch (error) {
      console.error("Error fetching todos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const cleanupSilenceDetection = () => {
    if (silenceIntervalRef.current) {
      clearInterval(silenceIntervalRef.current);
      silenceIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    silenceTimerRef.current = 0;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        cleanupSilenceDetection();
        await processAudio();
      };

      mediaRecorder.start();
      setIsRecording(true);

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      silenceTimerRef.current = 0;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const SILENCE_THRESHOLD = 10;
      const SILENCE_DURATION_MS = 8000;
      const POLL_INTERVAL_MS = 200;

      silenceIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
        if (average < SILENCE_THRESHOLD) {
          silenceTimerRef.current += POLL_INTERVAL_MS;
          if (silenceTimerRef.current >= SILENCE_DURATION_MS && mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
          }
        } else {
          silenceTimerRef.current = 0;
        }
      }, POLL_INTERVAL_MS);

      toast({ title: "Listening...", description: "Speak your task — stops after a pause" });
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async () => {
    setIsProcessing(true);
    try {
      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      
      // Skip transcription if audio is too short/silent (under 5KB is typically just the webm header)
      if (audioBlob.size < 5000) {
        setIsProcessing(false);
        return;
      }
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      const { data: profileData } = await supabase.from("profiles").select("preferred_language" as any).single();
      const language = (profileData as any)?.preferred_language || undefined;

      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { audio: base64Audio, language },
      });

      if (error) throw new Error(error.message || "Transcription failed");
      if (data?.text) {
        setNewTaskText(data.text);
        setIsProcessing(false);
        await handleAiProcess(data.text);
        return;
      }
      throw new Error("No transcription returned");
    } catch (error) {
      toast({ title: "Transcription failed", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAiProcess = async (textOverride?: string) => {
    const text = textOverride || newTaskText.trim();
    if (!text) return;
    setIsAiProcessing(true);
    try {
      const { clientDateContext } = await import("@/lib/clientDate");
      const { data, error } = await supabase.functions.invoke("process-todo-actions", { body: { text, ...clientDateContext() } });
      if (error) throw new Error(error.message);
      if (data?.results) {
        setNewTaskText("");
        await fetchTodos();
        for (const result of data.results) {
          toast({ title: actionTypeLabels[result.action_type] || result.action_type, description: result.description });
        }
      }
    } catch {
      toast({ title: "AI Processing Failed", variant: "destructive" });
    } finally {
      setIsAiProcessing(false);
    }
  };

  const addTask = async () => {
    if (!newTaskText.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("todos")
        .insert({ user_id: user.id, title: newTaskText.trim(), priority: "medium", status: "pending", assignee: "doctor" } as any)
        .select()
        .single();
      if (error) throw error;
      setTodos([{ ...data, completed: false, priority: data.priority as "low" | "medium" | "high", is_auto_executed: false }, ...todos]);
      setNewTaskText("");
    } catch {
      toast({ title: "Error", description: "Failed to add task", variant: "destructive" });
    }
  };

  const toggleComplete = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const newStatus = todo.completed ? "pending" : "completed";
    try {
      await supabase.from("todos").update({ status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : null }).eq("id", id);
      setTodos(todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const clearAllCompleted = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("todos").delete().eq("user_id", user.id).eq("status", "completed");
      setTodos((prev) => prev.filter((t) => !t.completed));
      toast({ title: "Completed tasks cleared" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const deleteTask = async (id: string) => {

    try {
      await supabase.from("todos").delete().eq("id", id);
      setTodos(todos.filter((t) => t.id !== id));
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;
    try {
      await supabase.from("todos").update({ title: editText.trim() }).eq("id", id);
      setTodos(todos.map((t) => (t.id === id ? { ...t, title: editText.trim() } : t)));
      setEditingId(null);
      setEditText("");
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const filteredTodos = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    return t.completed && new Date(t.created_at) >= twoWeeksAgo;
  });
  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

  return (
      <div className="rounded-xl border border-primary bg-card shadow-sm font-size-preserve">
        {/* Header */}
        <div className="w-full rounded-t-xl bg-primary px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary-foreground">{t("doctorDashboard.todoList")}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { isRecording ? stopRecording() : startRecording(); }}
              disabled={isProcessing || isAiProcessing}
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center transition-colors",
                isRecording
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-terracotta hover:bg-terracotta-dark"
              )}
            >
              {isProcessing || isAiProcessing ? (
                <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
              ) : isRecording ? (
                <MicOff className="h-3.5 w-3.5 text-white" />
              ) : (
                <Mic className="h-3.5 w-3.5 text-white stroke-white fill-none" />
              )}
            </button>
          </div>
        </div>

        <div className="p-3 space-y-2">
        {/* Inline add */}
        <div className="flex gap-1.5">
          <Input
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder={t("doctorDashboard.addTask")}
            className="h-8 text-xs border-border rounded-lg px-2.5"
            disabled={isProcessing || isAiProcessing}
          />
          <button
            onClick={addTask}
            disabled={!newTaskText.trim() || isProcessing || isAiProcessing}
            className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0 hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-primary-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "active" | "completed")}>
          <TabsList className="h-9 w-full bg-neutral-600 p-1">
            <TabsTrigger value="active" className="h-7 flex-1 data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-1.5 py-1 sm:px-3 sm:py-1.5">
              {t("doctorDashboard.active")} ({activeCount})
            </TabsTrigger>
            <TabsTrigger value="completed" className="h-7 flex-1 data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-1.5 py-1 sm:px-3 sm:py-1.5">
              {t("doctorDashboard.done")} ({completedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Clear all (Done view only) */}
        {filter === "completed" && completedCount > 0 && (
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all completed tasks?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes your {completedCount} completed task{completedCount === 1 ? "" : "s"}. Active tasks are not affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAllCompleted}>Clear all</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Task list — grouped by date, then patient */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          ) : filteredTodos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">
              {filter === "active" ? t("doctorDashboard.noActiveTasks") : t("doctorDashboard.noCompletedTasks")}
            </p>
          ) : (
            (() => {
              const grouped: Record<string, TodoItem[]> = { today: [], week: [], month: [], older: [] };
              filteredTodos.forEach((todo) => {
                const key = dateBucketFor((todo as any).due_date || todo.created_at);
                grouped[key].push(todo);
              });
              const patientGroups = (items: TodoItem[]) => {
                const map = new Map<string, TodoItem[]>();
                for (const todo of items) {
                  const display = getTodoDisplay(todo as any);
                  const name = display.patient || "General Tasks";
                  if (!map.has(name)) map.set(name, []);
                  map.get(name)?.push(todo);
                }
                return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
              };
              const renderTodoRow = (todo: TodoItem) => (
                <TodoRow
                  insideGroup
                  key={todo.id}
                  compact
                  todo={todo as any}
                  onToggle={toggleComplete}
                  onStartEdit={(t) => { setEditingId(t.id); setEditText(t.title); }}
                  onDelete={deleteTask}
                  onPreview={(t) => handlePreviewDoc(t as any)}
                  onAssign={(t) => setAssignTask(t)}
                  onPreviewCalendar={(t) => navigate(`/calendar${(t as any).due_date ? `?date=${(t as any).due_date}` : ""}`)}
                  onEditAppointment={(t) => navigate(`/calendar${(t as any).due_date ? `?date=${(t as any).due_date}` : ""}`)}
                  onSend={async (t) => {
                    if (!t.document_id) return;
                    setSendingDocId(t.document_id);
                    try {
                      const { data: doc } = await (supabase.from('documents').select('*') as any).eq('id', t.document_id).maybeSingle();
                      if (!doc) return;
                      const { data: patient } = await supabase.from('patients').select('email, pharmacy_email').eq('id', doc.patient_id).maybeSingle();
                      const email = doc.template_name?.toLowerCase().includes('prescription') ? patient?.pharmacy_email || patient?.email : patient?.email;
                      if (email) await supabase.functions.invoke('send-document-email', { body: { documentId: t.document_id, recipientEmail: email } });
                      await (supabase.from('documents').update({ email_sent_at: new Date().toISOString(), is_draft: false } as any) as any).eq('id', t.document_id);
                      await supabase.from('todos').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', t.id);
                      setTodos(prev => prev.map(x => x.id === t.id ? { ...x, completed: true } : x));
                      toast({ title: "Document sent" });
                    } catch { toast({ title: "Send failed", variant: "destructive" }); } finally { setSendingDocId(null); }
                  }}
                  isEditing={editingId === todo.id}
                  editText={editText}
                  setEditText={setEditText}
                  saveEdit={saveEdit}
                  cancelEdit={() => { setEditingId(null); setEditText(""); }}
                  sending={sendingDocId === todo.document_id}
                  previewing={loadingPreview === todo.document_id}
                />
              );
              const buckets = DATE_BUCKETS.filter((b) => grouped[b.key].length > 0);
              if (buckets.length === 0) return null;
              return (
                <Accordion type="multiple" defaultValue={[buckets[0].key]} className="space-y-2">
                  {buckets.map((b) => (
                    <AccordionItem key={b.key} value={b.key} className={SECTION_ITEM_ROUNDED_CLASS}>
                      <AccordionTrigger className={cn(SECTION_TRIGGER_ALWAYS_GREEN_CLASS, SECTION_TRIGGER_ROUNDED_CLASS, "px-3 py-2")}>

                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-sm font-semibold truncate text-left">{b.label}</span>
                          <SectionCountPill count={grouped[b.key].length} className="ml-auto mr-1" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className={SECTION_CONTENT_CLASS}>
                        <Accordion type="multiple" className="space-y-3">
                          {patientGroups(grouped[b.key]).map(([patientName, items]) => (
                            <AccordionItem key={`${b.key}-${patientName}`} value={`${b.key}-${patientName}`} className={SECTION_ITEM_ROUNDED_CLASS}>
                              <AccordionTrigger className={cn(SECTION_TRIGGER_CLASS, SECTION_TRIGGER_ROUNDED_CLASS, "px-3 py-1.5")}>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <UserIcon className="h-4 w-4 text-primary shrink-0" />
                                  {isSamplePatient({ name: patientName }) && <SampleBadge />}
                                  <span className="text-base font-semibold truncate text-left">{patientName}</span>
                                  <SectionCountPill count={items.length} className="ml-auto mr-1" />
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pt-3 pb-3">
                                <div className="space-y-2">
                                  {items.map(renderTodoRow)}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              );
            })()
          )}
        </div>

      </div>

      <AssignTaskDialog
        open={!!assignTask}
        onOpenChange={(o) => { if (!o) setAssignTask(null); }}
        task={assignTask}
        onCreated={fetchTodos}
      />

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreview
          title={previewDoc.title}
          content={previewDoc.content}
          logoUrl={previewDoc.logoUrl}
          fontFamily={previewDoc.fontFamily ?? headerFooter?.font_family}
          headerFooter={headerFooter}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
