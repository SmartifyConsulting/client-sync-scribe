import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isToday, isYesterday, parseISO, isWithinInterval, subDays, startOfDay, endOfDay } from "date-fns";

interface Session {
  id: string;
  patient_id: string;
  patient_name?: string;
  session_date: string;
  notes?: string;
  created_at: string;
}

type SessionGroup = "today" | "lastWeek" | "lastMonth" | "older";

export default function Sessions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<SessionGroup[]>(["today"]);

  useEffect(() => {
    fetchSessions();
  }, [user?.id]);

  const fetchSessions = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("sessions")
        .select(`
          id,
          patient_id,
          session_date,
          notes,
          created_at,
          patients(full_name)
        `)
        .eq("doctor_id", user.id)
        .order("session_date", { ascending: false });

      if (error) throw error;

      const sessionsWithNames = data?.map((s: any) => ({
        ...s,
        patient_name: s.patients?.full_name || "Unknown Patient",
      })) || [];

      setSessions(sessionsWithNames);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupSessions = () => {
    const now = new Date();
    const oneWeekAgo = subDays(now, 7);
    const oneMonthAgo = subDays(now, 30);

    const groups: Record<SessionGroup, Session[]> = {
      today: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    };

    sessions.forEach((session) => {
      const sessionDate = parseISO(session.session_date);

      if (isToday(sessionDate)) {
        groups.today.push(session);
      } else if (isWithinInterval(sessionDate, { start: oneWeekAgo, end: now })) {
        groups.lastWeek.push(session);
      } else if (isWithinInterval(sessionDate, { start: oneMonthAgo, end: now })) {
        groups.lastMonth.push(session);
      } else {
        groups.older.push(session);
      }
    });

    return groups;
  };

  const toggleGroup = (group: SessionGroup) => {
    setExpandedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const groupedSessions = groupSessions();
  const groupLabels: Record<SessionGroup, string> = {
    today: "Today",
    lastWeek: "Last Week",
    lastMonth: "Last Month",
    older: "Older",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading sessions...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Sessions</h1>
          <p className="text-muted-foreground mt-1">
            View your past and upcoming sessions with patients
          </p>
        </div>

        <Accordion type="multiple" value={expandedGroups}>
          {(["today", "lastWeek", "lastMonth", "older"] as SessionGroup[]).map(
            (groupKey) => {
              const groupSes = groupedSessions[groupKey];
              const count = groupSes.length;

              return (
                <AccordionItem
                  key={groupKey}
                  value={groupKey}
                  className="rounded-lg border border-border bg-card shadow-sm"
                >
                  <AccordionTrigger
                    className="px-4 py-3 hover:no-underline"
                    onClick={() => toggleGroup(groupKey)}
                  >
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-primary">
                        {groupLabels[groupKey]}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        ({count})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {count === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        No sessions in this period
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {groupSes.map((session) => (
                          <div
                            key={session.id}
                            className="p-3 bg-muted/50 rounded-md border border-border/50"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-sm text-foreground">
                                  {session.patient_name}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(parseISO(session.session_date), "PPpp")}
                                </p>
                                {session.notes && (
                                  <p className="text-xs text-foreground mt-2">
                                    {session.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            }
          )}
        </Accordion>

        {sessions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No sessions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
