import { useEffect, useMemo, useState } from "react";
import { Ambulance, Hospital } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

type EventRow = {
  id: string; event_type: string; created_at: string; provider_id: string | null;
  actor_user_id: string | null; payload: any;
};

type ProviderInfo = { name: string; kind: "ambulance" | "hospital" };

const labelFor = (e: EventRow, t: (key: string, options?: any) => string) => {
  switch (e.event_type) {
    case "sos_triggered": return t("timeline.sosTriggered");
    case "auto_assigned": return t("timeline.autoAssigned");
    case "patient_picked": return t("timeline.patientPicked");
    case "accepted": return t("timeline.accepted");
    case "declined": return t("timeline.declined");
    case "reassigned": return t("timeline.reassigned");
    case "released": return t("timeline.released");
    case "en_route": return t("status.enRoute");
    case "arrived": return t("timeline.arrivedScene");
    case "patient_collected": return t("status.patientCollected");
    case "at_hospital": return t("timeline.arrivedHospital");
    case "completed": return t("timeline.completed");
    case "voice_note": return t("timeline.voiceNote");
    case "eta_set": return `${t("timeline.etaSet")}${e.payload?.eta_minutes ? `: ${e.payload.eta_minutes} min` : ""}`;
    default: return e.event_type;
  }
};

const PROVIDER_EVENTS = new Set([
  "auto_assigned", "patient_picked", "accepted", "declined", "reassigned", "released", "en_route", "arrived", "at_hospital",
]);

export function IncidentTimeline({ incidentId }: { incidentId: string }) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("holarchelp_incident_events" as any)
        .select("id, event_type, created_at, provider_id, actor_user_id, payload")
        .eq("incident_id", incidentId).order("created_at", { ascending: true });
      setEvents((data as any) ?? []);
    };
    load();
    const ch = supabase.channel(`tl-${incidentId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "holarchelp_incident_events", filter: `incident_id=eq.${incidentId}` },
        (p) => setEvents((prev) => [...prev, p.new as any]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [incidentId]);

  // Collect provider IDs from events (direct column or payload)
  const providerIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      if (e.provider_id) set.add(e.provider_id);
      const pid = e.payload?.provider_id;
      if (pid && typeof pid === "string") set.add(pid);
    }
    return Array.from(set);
  }, [events]);

  useEffect(() => {
    const missing = providerIds.filter((id) => !providers[id]);
    if (missing.length === 0) return;
    (async () => {
      const { data, error } = await supabase.rpc(
        "holarchelp_get_incident_providers_public" as any,
        { _incident_id: incidentId },
      );
      if (error) return;
      const next: Record<string, ProviderInfo> = {};
      for (const r of (data as any[]) ?? []) {
        if (r?.id && r?.display_name) {
          next[r.id] = { name: r.display_name, kind: r.kind === "hospital" ? "hospital" : "ambulance" };
        }
      }
      if (Object.keys(next).length) setProviders((prev) => ({ ...prev, ...next }));
    })();
  }, [providerIds, providers, incidentId]);

  if (events.length === 0) return null;
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("timeline.title")}</p>
      <ol className="relative space-y-3 border-l-2 border-primary/20 pl-4">
        {events.map((e) => {
          const pid = e.provider_id || e.payload?.provider_id;
          const prov = pid ? providers[pid] : undefined;
          const showProvider = prov && PROVIDER_EVENTS.has(e.event_type);
          const suffix =
            e.event_type === "auto_assigned"
              ? t("timeline.autoAssigned").replace(/^ðŸ¤–\s*/, "").toLowerCase()
              : e.event_type === "accepted" || e.event_type === "patient_picked"
                ? t("timeline.respondedPicked")
                : null;
          const Icon = prov?.kind === "hospital" ? Hospital : Ambulance;
          return (
            <li key={e.id} className="relative">
              <span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-sm font-semibold">{labelFor(e, t)}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(e.created_at).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
              </p>
              {showProvider && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border-2 border-primary/40 bg-primary/5 px-2.5 py-1 text-sm">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <span className="font-semibold text-foreground">{prov!.name}</span>
                  {suffix && <span className="text-muted-foreground">Â· {suffix}</span>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

