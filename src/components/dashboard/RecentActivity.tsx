import { FileText, CheckCircle, MessageSquare, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "document" | "task" | "message" | "session";
  title: string;
  description: string;
  time: string;
}

const mockActivities: Activity[] = [
  {
    id: "1",
    type: "session",
    title: "Session completed",
    description: "Consultation with Sarah Johnson",
    time: "2 hours ago",
  },
  {
    id: "2",
    type: "document",
    title: "Document generated",
    description: "Action Plan for Michael Chen",
    time: "3 hours ago",
  },
  {
    id: "3",
    type: "task",
    title: "Task completed",
    description: "Review financial documents",
    time: "5 hours ago",
  },
  {
    id: "4",
    type: "message",
    title: "Follow-up sent",
    description: "Email to Emma Williams",
    time: "Yesterday",
  },
];

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
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border p-5">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">Your latest actions</p>
      </div>
      <div className="p-4 space-y-4">
        {mockActivities.map((activity) => {
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
                <p className="text-sm text-muted-foreground truncate">
                  {activity.description}
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
