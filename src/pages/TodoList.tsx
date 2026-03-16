import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  created_at: string;
  due_date?: string | null;
  patient_id?: string | null;
  session_id?: string | null;
}

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
};

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export default function TodoList() {
  const { toast } = useToast();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Fetch todos from database
  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTodos((data || []).map(todo => ({
        ...todo,
        completed: todo.status === 'completed',
        priority: todo.priority as "low" | "medium" | "high",
      })));
    } catch (error) {
      console.error('Error fetching todos:', error);
      toast({
        title: "Error",
        description: "Failed to load todos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        await processAudio();
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Recording started",
        description: "Speak your task clearly",
      });
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice input",
        variant: "destructive",
      });
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
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      // Fetch user's preferred language
      const { data: profileData } = await supabase.from('profiles').select('preferred_language' as any).single();
      const language = (profileData as any)?.preferred_language || undefined;

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio, language }
      });

      if (error) {
        throw new Error(error.message || 'Transcription failed');
      }

      if (data?.text) {
        setNewTaskText(data.text);
        toast({
          title: "Transcription complete",
          description: "Your voice has been converted to text",
        });
      } else {
        throw new Error('No transcription returned');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const addTask = async () => {
    if (!newTaskText.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('todos')
        .insert({
          user_id: user.id,
          title: newTaskText.trim(),
          priority: newTaskPriority,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      setTodos([{ ...data, completed: false, priority: data.priority as "low" | "medium" | "high" }, ...todos]);
      setNewTaskText("");
      setNewTaskPriority("medium");

      toast({
        title: "Task added",
        description: "New task has been added to your list",
      });
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: "Error",
        description: "Failed to add task",
        variant: "destructive",
      });
    }
  };

  const toggleComplete = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const newStatus = todo.completed ? 'pending' : 'completed';
    
    try {
      const { error } = await supabase
        .from('todos')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;

      setTodos(
        todos.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t
        )
      );
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTodos(todos.filter((todo) => todo.id !== id));
      toast({
        title: "Task deleted",
        description: "Task has been removed from your list",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const startEditing = (todo: TodoItem) => {
    setEditingId(todo.id);
    setEditText(todo.title);
  };

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;

    try {
      const { error } = await supabase
        .from('todos')
        .update({ title: editText.trim() })
        .eq('id', id);

      if (error) throw error;

      setTodos(
        todos.map((todo) =>
          todo.id === id ? { ...todo, title: editText.trim() } : todo
        )
      );
      setEditingId(null);
      setEditText("");

      toast({
        title: "Task updated",
        description: "Your changes have been saved",
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const updatePriority = async (id: string, newPriority: "low" | "medium" | "high") => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ priority: newPriority })
        .eq('id', id);

      if (error) throw error;

      setTodos(
        todos.map((todo) =>
          todo.id === id ? { ...todo, priority: newPriority } : todo
        )
      );
      toast({
        title: "Priority updated",
        description: `Task priority changed to ${priorityLabels[newPriority]}`,
      });
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: "Error",
        description: "Failed to update priority",
        variant: "destructive",
      });
    }
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const completedCount = todos.filter((t) => t.completed).length;
  const activeCount = todos.filter((t) => !t.completed).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">To-Do List</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your tasks with voice or text input
        </p>
      </div>

      {/* Add New Task */}
      <div className="rounded-xl border border-primary bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">Add New Task</h2>

        {/* Voice Recording */}
        <div className="flex flex-col items-center gap-4 py-4 mb-4 border-b border-border">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300",
              isRecording
                ? "bg-destructive text-destructive-foreground animate-pulse-soft"
                : isProcessing
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow"
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-7 w-7" />
            ) : (
              <Mic className="h-7 w-7" />
            )}
          </button>
          <p className="text-sm text-muted-foreground">
            {isProcessing
              ? "Transcribing your voice..."
              : isRecording
              ? "Recording... Tap to stop"
              : "Tap to record a task"}
          </p>
        </div>

        {/* Text Input */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Or type your task here..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              className="flex-1"
            />
            <Button onClick={addTask} disabled={!newTaskText.trim()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Priority Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Priority:</span>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((priority) => (
                <button
                  key={priority}
                  onClick={() => setNewTaskPriority(priority)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-all",
                    newTaskPriority === priority
                      ? priority === "high"
                        ? "bg-destructive text-destructive-foreground"
                        : priority === "medium"
                        ? "bg-warning text-warning-foreground"
                        : "bg-muted text-muted-foreground ring-2 ring-primary"
                      : priorityColors[priority]
                  )}
                >
                  {priorityLabels[priority]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(["all", "active", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">
              ({f === "all" ? todos.length : f === "active" ? activeCount : completedCount})
            </span>
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="rounded-xl border border-primary bg-card shadow-sm overflow-hidden">
        {filteredTodos.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {filter === "all"
              ? "No tasks yet. Add your first task above!"
              : filter === "active"
              ? "No active tasks. Great job!"
              : "No completed tasks yet."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className={cn(
                  "flex items-center gap-4 p-4 transition-colors hover:bg-muted/30",
                  todo.completed && "bg-muted/20"
                )}
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => toggleComplete(todo.id)}
                  className="h-5 w-5"
                />

                {editingId === todo.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(todo.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={() => saveEdit(todo.id)}>
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "font-medium text-foreground",
                          todo.completed && "line-through text-muted-foreground"
                        )}
                      >
                        {todo.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity",
                                priorityColors[todo.priority]
                              )}
                            >
                              <Flag className="h-3 w-3" />
                              {priorityLabels[todo.priority]}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(["low", "medium", "high"] as const).map((p) => (
                              <DropdownMenuItem
                                key={p}
                                onClick={() => updatePriority(todo.id, p)}
                                className={cn(
                                  "gap-2",
                                  todo.priority === p && "bg-accent"
                                )}
                              >
                                <Flag className={cn(
                                  "h-3 w-3",
                                  p === "high" && "text-destructive",
                                  p === "medium" && "text-warning",
                                  p === "low" && "text-muted-foreground"
                                )} />
                                {priorityLabels[p]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {todo.due_date && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(todo.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => startEditing(todo)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteTask(todo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {todos.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          {completedCount} of {todos.length} tasks completed
        </p>
      )}
    </div>
  );
}