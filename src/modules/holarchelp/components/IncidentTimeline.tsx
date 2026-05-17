import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type EventRow = {
  id: string; event_type: string; created_at: string; provider_id: string | null;
  actor_user_id: string | null; payload: any;
};

type ProviderInfo = { name: string; kind: "ambulance" | "hospital" };

const labelFor = (e: EventRow) => {
  switch (e.event_type) {
    case "sos_triggered": return "SOS triggered";
    case "auto_assigned": return "🤖 Auto-assigned";
    case "patient_picked": return "✋ You picked";
    case "accepted": return "✋ Selected the call";
    case "declined": return "Responder declined";
    case "reassigned": return "Re-assigned";
    case "released": return "Responder released — finding next";
    case "en_route": return "En route";
    case "arrived": return "Ambulance arrived at SOS scene";
    case "patient_collected": return "Patient collected";
    case "at_hospital": return "Ambulance arrived at destination hospital";
    case "completed": return "Incident completed";
    case "voice_note": return "Voice note added";
    case "eta_set": return `ETA set${e.payload?.eta_minutes ? `: ${e.payload.eta_minutes} min` : ""}`;
    default: return e.event_type;
  }
};

const PROVIDER_EVENTS = new Set([
  "auto_assigned", "patient_picked", "accepted", "declined", "reassigned", "released", "en_route", "arrived", "at_hospital",
]);

export function IncidentTimeline({ incidentId }: { incidentId: string }) {
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
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Timeline</p>
      <ol className="relative space-y-3 border-l-2 border-primary/20 pl-4">
        {events.map((e) => {
          const pid = e.provider_id || e.payload?.provider_id;
          const prov = pid ? providers[pid] : undefined;
          const showProvider = prov && PROVIDER_EVENTS.has(e.event_type);
          return (
            <li key={e.id} className="relative">
              <span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-sm font-semibold">
                {labelFor(e)}
                {showProvider && (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    · {prov!.kind === "hospital" ? "🏥" : "🚑"} <span className="font-semibold text-foreground">{prov!.name}</span>
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
