import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Mic, Clock, User as UserIcon, Loader2, FileText } from "lucide-react";
import { format, isToday, differenceInCalendarDays } from "date-fns";

interface SessionRow {
  id: string;
  title: string | null;
  status: string;
  started_at: string;
  duration_minutes: number | null;
  patient?: { id: string; name: string } | null;
}

type Bucket = "today" | "week" | "month" | "older";

const BUCKETS: { key: Bucket; labelKey: string; fallback: string }[] = [
  { key: "today", labelKey: "mySessions.today", fallback: "Today" },
  { key: "week", labelKey: "mySessions.lastWeek", fallback: "Last week" },
  { key: "month", labelKey: "mySessions.lastMonth", fallback: "Last month" },
  { key: "older", labelKey: "mySessions.older", fallback: "Older" },
];

function bucketFor(date: Date): Bucket {
  if (isToday(date)) return "today";
  const days = differenceInCalendarDays(new Date(), date);
  if (days <= 7) return "week";
  if (days <= 30) return "month";
  return "older";
}

export default function MySessions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Include sessions where the user is the patient (RLS allows this via
      // patients.patient_user_id = auth.uid()), not just the recording doctor.
      const { data: myPatients } = await supabase
        .from("patients")
        .select("id")
        .eq("patient_user_id", user.id);
      const patientIds = (myPatients ?? []).map((p: any) => p.id);

      let q = supabase
        .from("sessions")
        .select("id, title, status, started_at, duration_minutes, patient:patients(id, name)")
        .order("started_at", { ascending: false })
        .limit(500);
      q = patientIds.length
        ? q.or(`user_id.eq.${user.id},patient_id.in.(${patientIds.join(",")})`)
        : q.eq("user_id", user.id);

      const { data } = await q;
      const rows = ((data as any[]) || []).filter(
        (r, i, arr) => arr.findIndex((x) => x.id === r.id) === i,
      );
      if (!cancelled) {
        setSessions(rows as SessionRow[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const grouped = useMemo(() => {
    const out: Record<Bucket, SessionRow[]> = { today: [], week: [], month: [], older: [] };
    for (const s of sessions) {
      const d = new Date(s.started_at);
      out[bucketFor(d)].push(s);
    }
    return out;
  }, [sessions]);

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t("nav.mySessions", "My Sessions")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("mySessions.subtitle", "Browse your consultation sessions grouped by date.")}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("common.loading", "Loading…")}
        </div>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={["today"]}
          className="space-y-3"
        >
          {BUCKETS.map((b) => {
            const rows = grouped[b.key];
            return (
              <AccordionItem
                key={b.key}
                value={b.key}
                className="border border-primary/30 rounded-lg bg-card data-[state=open]:border-primary/50"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-2">
                    <span className="text-sm font-semibold text-primary">{t(b.labelKey, b.fallback)}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {rows.length}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-2 py-3">
                      {t("mySessions.empty", "No sessions in this period.")}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {rows.map((s) => (
                        <li key={s.id}>
                          <Link to={`/sessions/${s.id}`}>
                            <Card className="p-3 hover:bg-accent/40 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-medium truncate flex items-center gap-1.5">
                                    <FileText className="h-4 w-4 text-primary shrink-0" />
                                    {s.title || s.patient?.name || t("mySessions.untitled", "Untitled session")}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    {s.patient?.name && (
                                      <span className="flex items-center gap-1">
                                        <UserIcon className="h-3 w-3" />
                                        {s.patient.name}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(s.started_at), "d MMM yyyy, HH:mm")}
                                    </span>
                                    {s.duration_minutes ? (
                                      <span>{s.duration_minutes} min</span>
                                    ) : null}
                                  </div>
                                </div>
                                <span
                                  className={`text-xs uppercase font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                    s.status === "completed"
                                      ? "bg-success/10 text-success"
                                      : s.status === "in_progress"
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {s.status.replace("_", " ")}
                                </span>
                              </div>
                            </Card>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
