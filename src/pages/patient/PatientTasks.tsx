import { useState, useEffect } from "react";
import { CheckSquare, Loader2, Clock, CheckCircle2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PatientTodo {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  moolas_reward: number;
  created_at: string;
  completed_at: string | null;
  proof_url: string | null;
}

export default function PatientTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [todos, setTodos] = useState<PatientTodo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchTodos();
  }, [user]);

  const fetchTodos = async () => {
    try {
      // Get patient records linked to this user
      const { data: patients } = await supabase
        .from("patients")
        .select("id")
        .eq("patient_user_id", user!.id);

      if (!patients?.length) { setLoading(false); return; }

      const patientIds = patients.map(p => p.id);
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const pendingTodos = todos.filter(t => t.status === "pending");
  const completedTodos = todos.filter(t => t.status === "completed");

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
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          My To-Do List
        </h1>
        <p className="text-xs text-muted-foreground">Tasks assigned to you by your healthcare providers</p>
      </div>

      {todos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <CheckSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tasks assigned yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingTodos.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending ({pendingTodos.length})
              </h2>
              {pendingTodos.map((todo) => (
                <TaskCard key={todo.id} todo={todo} />
              ))}
            </div>
          )}

          {completedTodos.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Completed ({completedTodos.length})
              </h2>
              {completedTodos.map((todo) => (
                <TaskCard key={todo.id} todo={todo} />
              ))}
            </div>
          )}
        </div>
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
    <div className={`rounded-xl border p-4 ${isCompleted ? "border-border bg-muted/30 opacity-70" : "border-primary/30 bg-card shadow-sm"}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isCompleted ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"}`}>
          {isCompleted ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <CheckSquare className="h-4 w-4 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>{todo.title}</p>
          {todo.description && <p className="text-xs text-muted-foreground mt-0.5">{todo.description}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${priorityColors[todo.priority] || ""}`}>
              {todo.priority}
            </Badge>
            {todo.due_date && (
              <span className="text-[10px] text-muted-foreground">
                Due {format(new Date(todo.due_date), "MMM d, yyyy")}
              </span>
            )}
            {todo.moolas_reward > 0 && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                🪙 {todo.moolas_reward} Moolas
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
