import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  created_at: string;
  is_auto_executed?: boolean;
  document_id?: string | null;
  task_type?: string;
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
  document_review: "📄 Review & send document",
};

export function CompactTodoList() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskText, setNewTaskText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [filter, setFilter] = useState<"active" | "completed">("active");
  const [sendingDocId, setSendingDocId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<number>(0);
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTodos(
        (data || []).map((todo: any) => ({
          ...todo,
          completed: todo.status === "completed",
          priority: todo.priority as "low" | "medium" | "high",
          is_auto_executed: todo.is_auto_executed || false,
          document_id: todo.document_id || null,
          task_type: todo.task_type || 'standard',
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
      const { data, error } = await supabase.functions.invoke("process-todo-actions", { body: { text } });
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
        .insert({ user_id: user.id, title: newTaskText.trim(), priority: "medium", status: "pending" })
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
    <div className="rounded-xl border border-primary bg-card shadow-sm">
      {/* Header */}
      <div className="rounded-t-xl bg-primary px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary-foreground">To-Do List</h3>
        <button
          onClick={isRecording ? stopRecording : startRecording}
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

      <div className="p-3 space-y-2">
        {/* Inline add */}
        <div className="flex gap-1.5">
          <Input
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Add a task..."
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
          <TabsList className="h-7 w-full bg-primary p-0.5">
            <TabsTrigger value="active" className="text-[11px] h-6 flex-1 data-[state=active]:bg-white data-[state=active]:text-black text-white">
              Active ({activeCount})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-[11px] h-6 flex-1 data-[state=active]:bg-white data-[state=active]:text-black text-white">
              Done ({completedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Task list */}
        <div className="max-h-64 overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          ) : filteredTodos.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-3">
              {filter === "active" ? "No active tasks" : "No completed tasks"}
            </p>
          ) : (
            filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-1.5 py-1.5 px-1 rounded-md hover:bg-muted/50 group"
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => toggleComplete(todo.id)}
                  className="h-3.5 w-3.5"
                />
                {editingId === todo.id ? (
                  <div className="flex-1 flex gap-1">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(todo.id)}
                      className="h-6 text-[11px] border-border px-1.5"
                      autoFocus
                    />
                    <button onClick={() => saveEdit(todo.id)} className="text-success hover:text-success/80">
                      <Check className="h-3 w-3" />
                    </button>
                    <button onClick={() => { setEditingId(null); setEditText(""); }} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    {todo.is_auto_executed && (
                      <Sparkles className="h-3 w-3 text-primary shrink-0" />
                    )}
                    <span
                      className={cn(
                        "flex-1 text-[11px] truncate",
                        todo.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {todo.title}
                    </span>
                    <Badge className={cn("text-[9px] px-1 py-0 h-4 leading-none", priorityColors[todo.priority])}>
                      {todo.priority[0].toUpperCase()}
                    </Badge>
                    <div className="hidden group-hover:flex gap-0.5">
                      {todo.document_id && (
                        <>
                          <button onClick={() => navigate(`/documents?view=${todo.document_id}`)} className="text-primary hover:text-primary/80">
                            <FileText className="h-3 w-3" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!todo.document_id) return;
                              setSendingDocId(todo.document_id);
                              try {
                                const { data: doc } = await (supabase.from('documents').select('*') as any).eq('id', todo.document_id).maybeSingle();
                                if (!doc) return;
                                const { data: patient } = await supabase.from('patients').select('email, pharmacy_email').eq('id', doc.patient_id).maybeSingle();
                                const email = doc.template_name?.toLowerCase().includes('prescription') ? patient?.pharmacy_email || patient?.email : patient?.email;
                                if (email) await supabase.functions.invoke('send-document-email', { body: { documentId: todo.document_id, recipientEmail: email } });
                                await (supabase.from('documents').update({ email_sent_at: new Date().toISOString(), is_draft: false } as any) as any).eq('id', todo.document_id);
                                await supabase.from('todos').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', todo.id);
                                setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: true } : t));
                                toast({ title: "Document sent" });
                              } catch { toast({ title: "Send failed", variant: "destructive" }); } finally { setSendingDocId(null); }
                            }}
                            disabled={todo.completed || sendingDocId === todo.document_id}
                            className={cn(todo.completed ? "text-muted-foreground" : "text-green-600 hover:text-green-700")}
                          >
                            {sendingDocId === todo.document_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          </button>
                        </>
                      )}
                      <button onClick={() => { setEditingId(todo.id); setEditText(todo.title); }} className="text-muted-foreground hover:text-foreground">
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button onClick={() => deleteTask(todo.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
