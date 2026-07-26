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
import { Clock, User as UserIcon, Loader2, FileText, Plus } from "lucide-react";
import { format, isToday, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";

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

const TRIGGER_CLASS =
  "group px-4 py-3 hover:no-underline border-0 rounded-none bg-transparent hover:bg-muted data-[state=open]:!bg-primary data-[state=open]:hover:!bg-primary/90 data-[state=open]:!text-white [&>svg]:group-data-[state=open]:!text-white";

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
              {s.duration_minutes ? <span>{s.duration_minutes} min</span> : null}
            </div>
          </div>
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
      </Card>
    </Link>
  );
}

export default function MySessions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDoctor } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [groupModeState, setGroupMode] = useState<"date" | "patient">("date");
  const groupMode = isDoctor ? groupModeState : "date";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
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

  const groupedByDate = useMemo(() => {
    const out: Record<Bucket, SessionRow[]> = { today: [], week: [], month: [], older: [] };
    for (const s of sessions) out[bucketFor(new Date(s.started_at))].push(s);
    return out;
  }, [sessions]);

  const groupedByPatient = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    for (const s of sessions) {
      const name = s.patient?.name || t("mySessions.noPatient", "No patient");
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      getSurname(a).localeCompare(getSurname(b)),
    );
  }, [sessions, t]);

  const defaultOpen =
    groupMode === "date"
      ? ["today"]
      : groupedByPatient.length > 0
        ? [groupedByPatient[0][0]]
        : [];

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">
            {t("nav.mySessions", "My Sessions")}
          </h1>
          <p className="text-muted-foreground text-xs">
            {t("mySessions.subtitle", "Browse your consultation sessions grouped by date.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
        {isDoctor && (
          <ToggleGroup
            type="single"
            value={groupMode}
            onValueChange={(v) => v && setGroupMode(v as "date" | "patient")}
            size="sm"
            variant="outline"
          >
            <ToggleGroupItem value="date" className="text-xs px-3">
              {t("mySessions.groupByDate", "Date")}
            </ToggleGroupItem>
            <ToggleGroupItem value="patient" className="text-xs px-3">
              {t("mySessions.groupByPatient", "Patient")}
            </ToggleGroupItem>
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
      ) : (
        <Accordion
          key={groupMode}
          type="multiple"
          defaultValue={defaultOpen}
          className="rounded-lg border bg-card overflow-hidden divide-y"
        >
          {groupMode === "date"
            ? BUCKETS.map((b) => {
                const rows = groupedByDate[b.key];
                return (
                  <AccordionItem
                    key={b.key}
                    value={b.key}
                    className="border-0 rounded-none bg-card"
                  >
                    <AccordionTrigger className={TRIGGER_CLASS}>
                      <div className="flex items-center justify-between w-full pr-2">
                        <span className="text-xs font-medium">{t(b.labelKey, b.fallback)}</span>
                        <CountPill count={rows.length} />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pt-3 pb-3">
                      {rows.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-2 py-3">
                          {t("mySessions.empty", "No sessions in this period.")}
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {rows.map((s) => (
                            <li key={s.id}>
                              <SessionCard s={s} t={t} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })
            : groupedByPatient.map(([name, rows], idx) => (
                <AccordionItem
                  key={name}
                  value={name}
                  className="border-0 rounded-none bg-card"
                >
                  <AccordionTrigger className={TRIGGER_CLASS}>
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="text-xs font-medium">{name}</span>
                      <CountPill count={rows.length} />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pt-3 pb-3">
                    <ul className="space-y-2">
                      {rows.map((s) => (
                        <li key={s.id}>
                          <SessionCard s={s} t={t} />
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
        </Accordion>
      )}
    </div>
  );
}
