import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type EventRow = {
  id: string; event_type: string; created_at: string; provider_id: string | null;
  actor_user_id: string | null; payload: any;
};

const labelFor = (e: EventRow) => {
  switch (e.event_type) {
    case "sos_triggered": return "SOS triggered";
    case "accepted": return "Responder accepted";
    case "released": return "Responder released — finding next";
    case "en_route": return "En route";
    case "arrived": return "Arrived on scene";
    case "patient_collected": return "Patient collected";
    case "at_hospital": return "Arrived at hospital";
    case "completed": return "Incident completed";
    case "voice_note": return "Voice note added";
    case "eta_set": return `ETA set${e.payload?.eta_minutes ? `: ${e.payload.eta_minutes} min` : ""}`;
    default: return e.event_type;
  }
};

export function IncidentTimeline({ incidentId }: { incidentId: string }) {
  const [events, setEvents] = useState<EventRow[]>([]);

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

  if (events.length === 0) return null;
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Timeline</p>
      <ol className="relative space-y-3 border-l-2 border-primary/20 pl-4">
        {events.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
            <p className="text-sm font-semibold">{labelFor(e)}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(e.created_at).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
