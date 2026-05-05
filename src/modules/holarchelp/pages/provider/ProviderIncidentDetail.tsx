import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LiveMap } from "../../components/LiveMap";
import { VoiceNoteAudio } from "../../components/VoiceNoteAudio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useProviderAccess } from "../../components/ProviderGate";
import { useAuth } from "@/hooks/useAuth";

type Loc = { latitude: number; longitude: number; recorded_at: string };

export default function ProviderIncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { providerId } = useProviderAccess();
  const [incident, setIncident] = useState<any | null>(null);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [eta, setEta] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    supabase.from("holarchelp_incidents" as any).select("*").eq("id", id).maybeSingle()
      .then(({ data }) => setIncident(data));
    supabase.from("holarchelp_locations" as any).select("latitude, longitude, recorded_at")
      .eq("incident_id", id).order("recorded_at", { ascending: false }).limit(200)
      .then(({ data }) => setLocations((data as any) ?? []));
    supabase.from("holarchelp_incident_events" as any).select("*")
      .eq("incident_id", id).order("created_at", { ascending: false })
      .then(({ data }) => setEvents((data as any) ?? []));

    const ch = supabase.channel(`provider-incident-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "holarchelp_locations", filter: `incident_id=eq.${id}` },
        (p) => setLocations((prev) => [p.new as any, ...prev].slice(0, 200)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "holarchelp_incidents", filter: `id=eq.${id}` },
        (p) => setIncident((prev: any) => ({ ...(prev ?? {}), ...(p.new as any) })))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const updateStatus = async (patch: any, eventType: string) => {
    if (!id || !providerId) return;
    const { error } = await supabase.from("holarchelp_incidents" as any).update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("holarchelp_incident_events" as any).insert({
      incident_id: id, provider_id: providerId, actor_user_id: user?.id ?? null,
      event_type: eventType, payload: patch,
    } as any);
    toast.success("Updated");
  };

  if (!incident) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate("/provider")} className="text-xs text-muted-foreground hover:text-foreground">← Back to dispatch</button>
          <h1 className="mt-1 text-xl font-extrabold">Active incident</h1>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${incident.status === "active" ? "bg-sos/10 text-sos" : "bg-secondary text-primary"}`}>
          {incident.status?.toUpperCase()}
        </span>
      </div>

      <LiveMap points={locations} height={320} />

      {(incident.voice_note_transcript || incident.voice_note_audio_url) && (
        <div className="rounded-2xl border-2 border-red-600/40 bg-red-50 dark:bg-red-950/20 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
            Patient voice note
          </p>
          {incident.voice_note_transcript && (
            <p className="text-sm whitespace-pre-wrap mb-2">{incident.voice_note_transcript}</p>
          )}
          {incident.voice_note_audio_url && (
            <VoiceNoteAudio path={incident.voice_note_audio_url} />
          )}
        </div>
      )}

      <div className="rounded-2xl border bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status updates</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="eta" className="text-xs">ETA (minutes)</Label>
            <div className="flex gap-2">
              <Input id="eta" type="number" value={eta} onChange={(e) => setEta(e.target.value)} className="rounded-xl" />
              <Button size="sm" onClick={() => updateStatus({ eta_minutes: Number(eta) }, "eta_set")}>Set</Button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => updateStatus({ en_route_at: new Date().toISOString() }, "en_route")}>Mark en route</Button>
          <Button size="sm" variant="outline" onClick={() => updateStatus({ arrived_at: new Date().toISOString() }, "arrived")}>Mark arrived</Button>
          <Button size="sm" onClick={() => updateStatus({ status: "resolved", resolved_at: new Date().toISOString() }, "resolved")}>Mark resolved</Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</p>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <div>
                  <span className="font-semibold">{e.event_type}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
