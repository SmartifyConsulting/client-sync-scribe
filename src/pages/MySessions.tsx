import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, FileText, Plus } from "lucide-react";
import { format, isToday, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { SECTION_TRIGGER_ALWAYS_GREEN_CLASS, SECTION_CONTENT_CLASS } from "@/components/ui/section-accordion";
import { ListGroupToolbar } from "@/components/common/ListGroupToolbar";


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

function getSurname(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1] || "").toUpperCase();
}

const TRIGGER_CLASS = SECTION_TRIGGER_ALWAYS_GREEN_CLASS;

function CountPill({ count }: { count: number }) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold px-1.5 py-0 min-w-5 h-5 inline-flex items-center justify-center rounded-full",
        "bg-muted text-muted-foreground",
        "group-data-[state=open]:!bg-white group-data-[state=open]:!text-primary",
      )}
    >
      {count}
    </span>
  );
}


function SessionCard({ s, t }: { s: SessionRow; t: any }) {
  return (
    <Link to={`/sessions/${s.id}`} className="block">
      <Card className="px-3 py-2 hover:bg-accent/40 transition-colors">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium truncate flex items-center gap-1.5 min-w-0">
            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">
              {s.patient?.name || t("mySessions.noPatient", "No patient")} — {format(new Date(s.started_at), "MMMM d, yyyy")}
            </span>
          </p>
          <div className="flex items-center gap-3 shrink-0">
            {s.duration_minutes ? <span className="text-xs text-muted-foreground">{s.duration_minutes} min</span> : null}

            <span
              className={cn(
                "text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full shrink-0",
                s.status === "completed"
                  ? "bg-success/10 text-success"
                  : s.status === "in_progress"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {s.status.replace("_", " ")}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function MySessions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDoctor, role } = useUserRole();
  const isHospitalUser = role === "emergency";
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [ownerFilter, setOwnerFilter] = useState<"mine" | "all">("all");


  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const { data: myPatients, error: patientsError } = await supabase
        .from("patients")
        .select("id")
        .eq("patient_user_id", user.id);
      if (patientsError) {
        if (!cancelled) {
          setLoadError(t("mySessions.loadError", "Could not load sessions."));
          setLoading(false);
        }
        return;
      }
      const patientIds = (myPatients ?? []).map((p: any) => p.id);

      let q = supabase
        .from("sessions")
        .select("id, title, status, started_at, duration_minutes, user_id, patient:patients(id, name)")
        .order("started_at", { ascending: false })
        .limit(500);
      q = patientIds.length
        ? q.or(`user_id.eq.${user.id},patient_id.in.(${patientIds.join(",")})`)
        : q.eq("user_id", user.id);

      const { data, error: sessionsError } = await q;
      if (sessionsError) {
        if (!cancelled) {
          setLoadError(t("mySessions.loadError", "Could not load sessions."));
          setLoading(false);
        }
        return;
      }
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
  }, [user, t]);

  const visibleSessions = useMemo(
    () =>
      ownerFilter === "mine"
        ? sessions.filter((s: any) => s.user_id === user?.id)
        : sessions,
    [sessions, ownerFilter, user?.id],
  );

  const items = useMemo(
    () =>
      visibleSessions.map((s) => ({
        item: s,
        date: s.started_at,
        patient: s.patient?.name || t("mySessions.noPatient", "No patient"),
        hospital: (s as any).hospital || null,
        search: [s.title, s.patient?.name, s.status].filter(Boolean).join(" "),
      })),
    [visibleSessions, t],
  );

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">
            {t("nav.mySessions", "Sessions")}
          </h1>
          <p className="text-muted-foreground text-xs">
            {t("mySessions.subtitle", "Browse your consultation sessions grouped by date.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDoctor && (
            <ToggleGroup
              type="single"
              value={ownerFilter}
              onValueChange={(v) => v && setOwnerFilter(v as "mine" | "all")}
              size="sm"
              variant="outline"
            >
              <ToggleGroupItem value="all" className="text-xs px-3">All</ToggleGroupItem>
              <ToggleGroupItem value="mine" className="text-xs px-3">Mine</ToggleGroupItem>
            </ToggleGroup>
          )}
          {isDoctor && (
            <Button asChild size="sm" className="gap-2">
              <Link to="/sessions">
                <Plus className="h-4 w-4" />
                {t("mySessions.addSession", "Add Session")}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("common.loading", "Loading…")}
        </div>
      ) : loadError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {loadError}
        </div>
      ) : (
        <ListGroupToolbar
          storageKey="sessions"
          items={items}
          allowHospital={isHospitalUser}
          searchPlaceholder={t("mySessions.search", "Search sessions...")}
          emptyLabel={t("mySessions.empty", "No sessions in this period.")}
          renderItem={(s: SessionRow) => <SessionCard s={s} t={t} />}
        />
      )}
    </div>
  );
}

