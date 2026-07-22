import { Link } from "react-router-dom";
import { FileText, CheckCircle, MessageSquare, Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { SampleBadge } from "@/components/patients/SampleBadge";
import { isSamplePatient } from "@/lib/samplePatients";
import { useTranslation } from "react-i18next";
import { relativeTimeLabel } from "@/lib/relativeTimeLabel";

interface Activity {
  id: string;
  type: "document" | "task" | "message" | "session";
  title: string;
  description: string;
  /** ISO timestamp; rendered via i18n relative-time helper */
  timeIso: string;
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
  const { t } = useTranslation();
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
          const titles = [t("doctorDashboard.sessionCompleted"), t("doctorDashboard.documentGenerated"), t("doctorDashboard.taskCompleted"), t("doctorDashboard.followUpSent")];
          const descriptions = ["Consultation with", "Action Plan for", "Review notes for", "Email to"];
          const now = Date.now();
          const offsetsMs = [2 * 3600_000, 3 * 3600_000, 5 * 3600_000, 26 * 3600_000];

          const mockActivities: Activity[] = patients.map((patient, index) => ({
            id: `act-${index}`,
            type: activityTypes[index % activityTypes.length],
            title: titles[index % titles.length],
            description: descriptions[index % descriptions.length],
            timeIso: new Date(now - offsetsMs[index % offsetsMs.length]).toISOString(),
            patientId: patient.id,
            patientName: patient.name,
          }));

          // Add a task activity without patient
          if (mockActivities.length >= 3) {
            mockActivities[2] = {
              id: 'act-task',
              type: 'task',
              title: t("doctorDashboard.taskCompleted"),
              description: 'Review financial documents',
              timeIso: new Date(now - 5 * 3600_000).toISOString(),
            };
          }

          setActivities(mockActivities);
        } else {
          // Show default activities when no patients exist
          setActivities([
            {
              id: "1",
              type: "task",
              title: t("doctorDashboard.gettingStarted"),
              description: t("doctorDashboard.addFirstPatient"),
              timeIso: new Date().toISOString(),
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
      <div className="rounded-xl border border-primary bg-card shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <Collapsible defaultOpen={true}>
      <div className="rounded-xl border border-primary bg-card shadow-sm">
        <CollapsibleTrigger className="w-full rounded-xl data-[state=open]:rounded-b-none bg-primary px-4 py-3 flex items-center justify-between transition-all">
          <h3 className="text-xs font-medium text-primary-dark-foreground">{t("doctorDashboard.recentActivity")}</h3>
          <ChevronDown className="h-4 w-4 text-primary-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 space-y-2">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type];
              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-2 animate-fade-in"
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md shrink-0",
                      activityColors[activity.type]
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">
                      {activity.title}
                    </p>
                    {activity.patientId && activity.patientName ? (
                      <Link
                        to={`/patients/${activity.patientId}`}
                        className={cn("text-xs text-primary hover:underline truncate inline-flex items-center gap-1", isSamplePatient({ name: activity.patientName }) && "italic")}
                      >
                        {activity.patientName}
                        {isSamplePatient({ name: activity.patientName }) && <SampleBadge />}
                      </Link>
                    ) : (
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {relativeTimeLabel(activity.timeIso)}
                  </span>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
