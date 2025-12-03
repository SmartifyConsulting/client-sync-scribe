import { Link } from "react-router-dom";
import { FileText, CheckCircle, MessageSquare, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Activity {
  id: string;
  type: "document" | "task" | "message" | "session";
  title: string;
  description: string;
  time: string;
  patientId?: string;
  patientName?: string;
}

const activityIcons = {
  document: FileText,
  task: CheckCircle,
  message: MessageSquare,
  session: Clock,
};

const activityColors = {
  document: "bg-blue-500/10 text-blue-600",
  task: "bg-success/10 text-success",
  message: "bg-warning/10 text-warning",
  session: "bg-primary/10 text-primary",
};

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentPatients = async () => {
      try {
        const { data: patients } = await supabase
          .from('patients')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(4);

        if (patients && patients.length > 0) {
          // Create mock activities from real patients
          const activityTypes: ("session" | "document" | "task" | "message")[] = ["session", "document", "task", "message"];
          const titles = ["Session completed", "Document generated", "Task completed", "Follow-up sent"];
          const descriptions = ["Consultation with", "Action Plan for", "Review notes for", "Email to"];
          const times = ["2 hours ago", "3 hours ago", "5 hours ago", "Yesterday"];

          const mockActivities: Activity[] = patients.map((patient, index) => ({
            id: `act-${index}`,
            type: activityTypes[index % activityTypes.length],
            title: titles[index % titles.length],
            description: descriptions[index % descriptions.length],
            time: times[index % times.length],
            patientId: patient.id,
            patientName: patient.name,
          }));

          // Add a task activity without patient
          if (mockActivities.length >= 3) {
            mockActivities[2] = {
              id: 'act-task',
              type: 'task',
              title: 'Task completed',
              description: 'Review financial documents',
              time: '5 hours ago',
            };
          }

          setActivities(mockActivities);
        } else {
          // Show default activities when no patients exist
          setActivities([
            {
              id: "1",
              type: "task",
              title: "Getting started",
              description: "Add your first patient to get started",
              time: "Just now",
            },
          ]);
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentPatients();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border p-5">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">Your latest actions</p>
      </div>
      <div className="p-4 space-y-4">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type];
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 animate-fade-in"
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  activityColors[activity.type]
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">
                  {activity.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                  {activity.patientId && activity.patientName && (
                    <>
                      {" "}
                      <Link
                        to={`/patients/${activity.patientId}`}
                        className="text-primary hover:underline"
                      >
                        {activity.patientName}
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {activity.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
