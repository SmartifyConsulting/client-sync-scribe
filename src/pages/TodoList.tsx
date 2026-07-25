import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { translateTodoTitle } from "@/lib/translateTodoTitle";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Mic,
  MicOff,
  Check,
  Trash2,
  Edit3,
  X,
  Loader2,
  Calendar,
  Flag,
  Zap,
  Brain,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Send,
  User,
  FileText,
  Eye,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isToday, isYesterday } from "date-fns";
import { DocumentPreview } from "@/components/sessions/DocumentPreview";
import { useDocumentHeaderFooter } from "@/hooks/useDocumentHeaderFooter";
import { useProfile } from "@/hooks/useProfile";
import { resolveDocumentPreviewContent } from "@/lib/resolveDocumentPreviewContent";
import { TodoRow } from "@/components/todos/TodoRow";

interface TodoItem {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  priority: "low" | "medium" | "high";
  created_at: string;
  due_date?: string | null;
  patient_id?: string | null;
  patient_name?: string | null;
  session_id?: string | null;
  document_id?: string | null;
  is_auto_executed?: boolean;
  task_type?: string;
}

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
};

const priorityKey = {
  low: "todo.low",
  medium: "todo.medium",
  high: "todo.high",
} as const;

const actionTypeLabels: Record<string, string> = {
  schedule_appointment: "ðŸ“… Scheduled appointment",
  write_prescription: "ðŸ’Š Created prescription",
  create_invoice: "ðŸ§¾ Created invoice",
  write_medical_certificate: "ðŸ“‹ Created medical certificate",
  write_referral_letter: "âœ‰ï¸ Created referral letter",
  write_general_letter: "ðŸ“ Created general letter",
  manual_task: "ðŸ“Œ Manual task created",
  document_review: "ðŸ“„ Review document",
};

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d, yyyy");
}

function getDateKey(dateStr: string): string {
  return format(new Date(dateStr), "yyyy-MM-dd");
}

export default function TodoList() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiResults, setAiResults] = useState<Array<{ action_type: string; description: string; auto_executed: boolean }> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("active");
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
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
      const { data, error } = await supabase
        .from('todos')
        .select('*, patients(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTodos((data || []).map((todo: any) => ({
        ...todo,
        completed: todo.status === 'completed',
        priority: todo.priority as "low" | "medium" | "high",
        is_auto_executed: todo.is_auto_executed || false,
        patient_name: todo.patients?.name || null,
        document_id: todo.document_id || null,
        task_type: todo.task_type || 'standard',
      })));
    } catch (error) {
      console.error('Error fetching todos:', error);
      toast({ title: "Error", description: "Failed to load todos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTodos(); }, []);

  const autoRecordTriggered = useRef(false);
  useEffect(() => {
    if (loading || autoRecordTriggered.current) return;
    if (searchParams.get('autoRecord') === 'true') {
      autoRecordTriggered.current = true;
      setSearchParams({}, { replace: true });
      setTimeout(() => startRecording(), 300);
    }
  }, [loading, searchParams]);

  const cleanupSilenceDetection = () => {
    if (silenceIntervalRef.current) { clearInterval(silenceIntervalRef.current); silenceIntervalRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    analyserRef.current = null;
    silenceTimerRef.current = 0;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => { stream.getTracks().forEach((t) => t.stop()); cleanupSilenceDetection(); await processAudio(); };
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
      silenceIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((s, v) => s + v, 0) / dataArray.length;
        if (avg < 10) { silenceTimerRef.current += 200; if (silenceTimerRef.current >= 8000 && mediaRecorderRef.current?.state === 'recording') { mediaRecorderRef.current.stop(); setIsRecording(false); } } else { silenceTimerRef.current = 0; }
      }, 200);
      toast({ title: "Listening...", description: "Speak your task â€” recording stops automatically after a pause" });
    } catch { toast({ title: "Microphone access denied", variant: "destructive" }); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  const processAudio = async () => {
    setIsProcessing(true);
    try {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => { reader.onloadend = () => resolve((reader.result as string).split(',')[1]); reader.onerror = reject; });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;
      const { data: profileData } = await supabase.from('profiles').select('preferred_language' as any).single();
      const language = (profileData as any)?.preferred_language || undefined;
      const { data, error } = await supabase.functions.invoke('transcribe-audio', { body: { audio: base64Audio, language } });
      if (error) throw new Error(error.message || 'Transcription failed');
      if (data?.text) { setNewTaskText(data.text); setIsProcessing(false); await handleAiProcess(data.text); return; }
      throw new Error('No transcription returned');
    } catch (error) {
      toast({ title: "Transcription failed", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  const handleAiProcess = async (textOverride?: string) => {
    const text = textOverride || newTaskText.trim();
    if (!text) return;
    setIsAiProcessing(true); setAiResults(null);
    try {
      const { clientDateContext } = await import('@/lib/clientDate');
      const { data, error } = await supabase.functions.invoke('process-todo-actions', { body: { text, ...clientDateContext() } });
      if (error) throw new Error(error.message);
      if (data?.results) {
        setAiResults(data.results); setNewTaskText(""); await fetchTodos();
        for (const result of data.results) { toast({ title: actionTypeLabels[result.action_type] || result.action_type, description: result.description }); }
      } else if (data?.error) throw new Error(data.error);
    } catch { toast({ title: "AI Processing Failed", variant: "destructive" }); } finally { setIsAiProcessing(false); }
  };

  const addTask = async () => {
    if (!newTaskText.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('todos').insert({ user_id: user.id, title: newTaskText.trim(), priority: newTaskPriority, status: 'pending' }).select().single();
      if (error) throw error;

      // Notify patient if task has a patient_id
      if (data.patient_id) {
        try {
          const { data: patient } = await supabase.from('patients').select('patient_user_id').eq('id', data.patient_id).maybeSingle();
          if (patient?.patient_user_id) {
            await supabase.from('notifications').insert({
              user_id: patient.patient_user_id,
              title: `ðŸ“‹ New task assigned: ${data.title}`,
              description: data.description || 'You have been assigned a new task by your healthcare provider.',
              type: 'task_assigned',
              reference_id: data.id,
            });
          }
        } catch (notifErr) { console.error('Error sending task notification:', notifErr); }
      }

      setTodos([{ ...data, completed: false, priority: data.priority as "low" | "medium" | "high", is_auto_executed: false, patient_name: null, document_id: null, task_type: 'standard' }, ...todos]);
      setNewTaskText(""); setNewTaskPriority("medium");
      toast({ title: "Task added" });
    } catch { toast({ title: "Error", description: "Failed to add task", variant: "destructive" }); }
  };

  const toggleComplete = async (id: string) => {
    const todo = todos.find(t => t.id === id); if (!todo) return;
    const newStatus = todo.completed ? 'pending' : 'completed';
    try {
      await supabase.from('todos').update({ status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }).eq('id', id);
      setTodos(todos.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const deleteTask = async (id: string) => {
    try { await supabase.from('todos').delete().eq('id', id); setTodos(todos.filter((t) => t.id !== id)); toast({ title: "Task deleted" }); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const startEditing = (todo: TodoItem) => { setEditingId(todo.id); setEditText(todo.title); };
  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;
    try { await supabase.from('todos').update({ title: editText.trim() }).eq('id', id); setTodos(todos.map((t) => t.id === id ? { ...t, title: editText.trim() } : t)); setEditingId(null); setEditText(""); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };
  const cancelEdit = () => { setEditingId(null); setEditText(""); };

  const updatePriority = async (id: string, newPriority: "low" | "medium" | "high") => {
    try { await supabase.from('todos').update({ priority: newPriority }).eq('id', id); setTodos(todos.map((t) => t.id === id ? { ...t, priority: newPriority } : t)); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const duplicateTask = async (todo: TodoItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('todos').insert({
        user_id: user.id,
        title: todo.title,
        priority: todo.priority,
        patient_id: todo.patient_id ?? null,
        status: 'pending',
      }).select('*, patients(name)').single();
      if (error) throw error;
      setTodos([{ ...(data as any), completed: false, patient_name: (data as any).patients?.name || null, is_auto_executed: false, task_type: (data as any).task_type || 'standard' }, ...todos]);
      toast({ title: "Task duplicated" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleSendDoc = async (todo: TodoItem) => {
    if (!todo.document_id) return;
    setSendingDocId(todo.document_id);
    try {
      const { data: doc } = await supabase.from('documents').select('*, patients:patient_id(email, pharmacy_email, patient_user_id, name)').eq('id', todo.document_id).maybeSingle();
      if (!doc) throw new Error('Document not found');
      const patient = (doc as any).patients;
      const recipientEmail = doc.template_name?.toLowerCase().includes('prescription')
        ? patient?.pharmacy_email || patient?.email : patient?.email;
      if (recipientEmail) {
        await supabase.functions.invoke('send-document-email', { body: { documentId: todo.document_id, recipientEmail } });
      }
      await supabase.from('documents').update({ email_sent_at: new Date().toISOString(), is_draft: false } as any).eq('id', todo.document_id);
      await supabase.from('todos').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', todo.id);

      // If this is a Patient Task Assignment, create actual patient todos
      if (doc.template_name === 'Patient Task Assignment' && patient?.patient_user_id && todo.patient_id) {
        try {
          // Parse tasks from document content
          const titleMatches = doc.content.match(/<strong>\d+\.\s*(.+?)<\/strong>/g) || [];
          for (const match of titleMatches) {
            const title = match.replace(/<\/?strong>/g, '').replace(/^\d+\.\s*/, '').trim();
            const { data: newTodo } = await supabase.from('todos').insert({
              user_id: patient.patient_user_id,
              patient_id: todo.patient_id,
              title,
              task_type: 'patient_assignment',
              priority: 'medium',
              status: 'pending',
              vulas_reward: 1,
            }).select('id').single();
            if (newTodo) {
              await supabase.from('notifications').insert({
                user_id: patient.patient_user_id,
                title: `ðŸ“‹ New task assigned: ${title}`,
                description: 'You have been assigned a new task by your healthcare provider.',
                type: 'task_assigned',
                reference_id: newTodo.id,
              });
            }
          }
        } catch (ptErr) { console.error('Error creating patient tasks:', ptErr); }
      }

      setTodos(todos.map(t => t.id === todo.id ? { ...t, completed: true } : t));
      toast({ title: "Document sent" });
    } catch { toast({ title: "Send failed", variant: "destructive" }); } finally { setSendingDocId(null); }
  };

  const toggleDateCollapse = (dateKey: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey); else next.add(dateKey);
      return next;
    });
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  // Group by date
  const groupedTodos = filteredTodos.reduce<Record<string, TodoItem[]>>((groups, todo) => {
    const key = getDateKey(todo.created_at);
    if (!groups[key]) groups[key] = [];
    groups[key].push(todo);
    return groups;
  }, {});
  const sortedDateKeys = Object.keys(groupedTodos).sort((a, b) => b.localeCompare(a));

  const completedCount = todos.filter((t) => t.completed).length;
  const activeCount = todos.filter((t) => !t.completed).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t("nav.myTasks", "To-Do List")}</h1>
        <p className=”mt-1 text-muted-foreground text-base”>Manage your tasks with voice or text input â€” AI can auto-execute actions</p>
      </div>

      {/* Add New Task â€” reduced by 60% */}
      <div className="rounded-xl border border-primary bg-card p-2.5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-2">{t("todo.addNewTask")}</h2>
        <div className="flex items-center gap-2 py-1.5 mb-1.5 border-b border-border">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || isAiProcessing}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 shrink-0",
              isRecording ? "bg-destructive text-destructive-foreground animate-pulse-soft"
                : isProcessing || isAiProcessing ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          <p className="text-sm text-muted-foreground">
            {isProcessing ? t("todo.transcribing") : isAiProcessing ? t("todo.aiProcessing") : isRecording ? t("todo.listening") : t("todo.tapToRecord")}
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input placeholder={t("todo.typeTask")} value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} className="flex-1 h-8 text-sm" />
            <Button onClick={addTask} disabled={!newTaskText.trim() || isAiProcessing} className="gap-1 h-8 px-3 text-sm"><Plus className="h-3.5 w-3.5" />{t("todo.add")}</Button>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">{t("todo.priority")}</span>
              <div className="flex gap-1">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button key={p} onClick={() => setNewTaskPriority(p)} className={cn("rounded-full px-2 py-0.5 text-sm font-medium transition-all", newTaskPriority === p ? p === "high" ? "bg-destructive text-destructive-foreground" : p === "medium" ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground ring-2 ring-primary" : priorityColors[p])}>
                    {t(priorityKey[p])}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => handleAiProcess()} disabled={!newTaskText.trim() || isAiProcessing} variant="secondary" className="gap-1 h-7 px-2 text-sm">
              {isAiProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}{t("todo.aiProcess")}
            </Button>
          </div>
        </div>
      </div>

      {/* AI Results Banner */}
      {aiResults && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Zap className="h-4 w-4 text-success" />AI Processing Results</h3>
            <Button variant="ghost" size="sm" onClick={() => setAiResults(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-1">
            {aiResults.map((result, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span>{actionTypeLabels[result.action_type] || result.action_type}</span>
                <span className="text-muted-foreground">â€”</span>
                <span className="text-muted-foreground truncate">{result.description}</span>
                {result.auto_executed ? <Badge className="bg-success/10 text-success border-success/20 ml-auto shrink-0"><Zap className="h-4 w-4 mr-1" />Done</Badge> : <Badge variant="outline" className="ml-auto shrink-0">Manual</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(["active", "completed", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors", filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
            {t(`todo.${f}`)}
            <span className="ml-1.5 text-sm opacity-70">({f === "all" ? todos.length : f === "active" ? activeCount : completedCount})</span>
          </button>
        ))}
      </div>


      {/* Task List â€” Grouped by Date */}
      <div className="space-y-3">
        {sortedDateKeys.length === 0 ? (
          <div className="rounded-xl border border-primary bg-card p-8 text-center text-muted-foreground">
            {filter === "all" ? "No tasks yet. Add your first task above!" : filter === "active" ? "No active tasks. Great job!" : "No completed tasks yet."}
          </div>
        ) : (
          sortedDateKeys.map((dateKey) => {
            const items = groupedTodos[dateKey];
            const isCollapsed = collapsedDates.has(dateKey);
            const label = getDateLabel(items[0].created_at);
            return (
              <Collapsible key={dateKey} open={!isCollapsed} onOpenChange={() => toggleDateCollapse(dateKey)}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
                  {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                  <Badge variant="outline" className="ml-auto text-sm">{items.length}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="rounded-xl border border-primary bg-card shadow-sm overflow-hidden mt-1">
                    <div className="divide-y divide-border">
                      {items.map((todo) => (
                        <TodoRow
                          key={todo.id}
                          todo={todo as any}
                          onToggle={toggleComplete}
                          onStartEdit={(t) => startEditing(t as any)}
                          onDelete={deleteTask}
                          onDuplicate={duplicateTask}
                          onSend={(t) => handleSendDoc(t as any)}
                          onPreview={(t) => handlePreviewDoc(t as any)}
                          onSetPriority={updatePriority}
                          isEditing={editingId === todo.id}
                          editText={editText}
                          setEditText={setEditText}
                          saveEdit={saveEdit}
                          cancelEdit={cancelEdit}
                          sending={sendingDocId === todo.document_id}
                          previewing={loadingPreview === todo.document_id}
                        />
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </div>

      {/* Summary */}
      {todos.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">{completedCount} of {todos.length} tasks completed</p>
      )}

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

