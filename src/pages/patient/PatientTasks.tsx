import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckSquare, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
}

export default function PatientTasks() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["patient-tasks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get patient records linked to this user
      const { data: patients } = await supabase
        .from("patients")
        .select("id")
        .eq("patient_user_id", user.id);

      if (!patients || patients.length === 0) return [];

      const patientIds = patients.map((p) => p.id);

      const { data: todos, error } = await supabase
        .from("todos")
        .select("*")
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (todos || []) as Todo[];
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckSquare className="h-4 w-4 text-green-500" />;
      case "pending": return <Clock className="h-4 w-4 text-muted-foreground" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
        <p className="text-muted-foreground mt-1">
          Tasks assigned to you by your healthcare providers
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No tasks yet</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-md">
              When your doctor assigns tasks to you, they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className={task.status === "completed" ? "opacity-60" : ""}>
              <CardContent className="flex items-start gap-3 py-4">
                {getStatusIcon(task.status)}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-foreground ${task.status === "completed" ? "line-through" : ""}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getPriorityColor(task.priority) as any} className="text-xs">
                      {task.priority}
                    </Badge>
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground">
                        Due: {format(new Date(task.due_date), "dd MMM yyyy")}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
