import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Activity, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

type Ev = { id: string; incident_id: string; event_type: string; payload: any; created_at: string };

const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const tone = (t: string) =>
  t.includes("completed") || t.includes("admitted") ? "border-success/40 bg-success/10 text-success"
  : t.includes("released") || t.includes("escalated") ? "border-destructive/40 bg-destructive/10 text-destructive"
  : t.includes("accepted") || t.includes("assigned") ? "border-primary/40 bg-primary/10 text-primary"
  : "border-border bg-card text-foreground";

export default function IncidentTimelineScreen() {
  const { t } = useTranslation();
  const { providerId } = useProviderAccess();
  const [events, setEvents] = useState<Ev[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!providerId) return;
      const { data: incRows } = await supabase.from("holarchelp_incidents" as any)
        .select("id").eq("destination_hospital_id", providerId).limit(200);
      const ids = ((incRows as any) ?? []).map((r: any) => r.id);
      if (!ids.length) { setEvents([]); return; }
      const { data } = await supabase.from("holarchelp_incident_events" as any)
        .select("*").in("incident_id", ids).order("created_at", { ascending: false }).limit(200);
      setEvents(((data as any) ?? []) as Ev[]);
    };
    load();
    if (!providerId) return;
    const ch = supabase.channel(`hosp-events-${providerId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "holarchelp_incident_events" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [providerId]);

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{t("provider.hospitalEmergencyOperations")}</p>
        <h1 className="text-2xl font-extrabold">{t("nav.incidentTimeline")}</h1>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <ul className="divide-y">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40">
              <Activity className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5">
                  <span className={`rounded-full border px-1.5 py-0.5 text-sm font-bold uppercase ${tone(e.event_type)}`}>
                    {t(`eventType.${e.event_type}`, { defaultValue: e.event_type.replace(/_/g," ") })}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">{t("ambulance.incident")} #{e.incident_id.slice(0,8)}</span>
                </p>
              </div>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{fmt(e.created_at)}</span>
              <Link to={`/provider/hospital/incident/${e.incident_id}`} className="rounded-lg border bg-background px-2 py-1 text-sm font-semibold hover:bg-muted">
                <ChevronRight className="h-3 w-3" />
              </Link>
            </li>
          ))}
          {!events.length && <li className="p-8 text-center text-sm text-muted-foreground">{t("timeline.noEvents")}</li>}
        </ul>
      </div>
    </div>
  );
}

