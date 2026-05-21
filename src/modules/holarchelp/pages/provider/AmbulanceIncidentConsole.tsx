import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SosLiveMap } from "../../components/SosLiveMap";
import { IncidentTimeline } from "../../components/IncidentTimeline";
import { IncidentVoiceNoteRecorder } from "../../components/IncidentVoiceNoteRecorder";
import { EtaCountdown } from "../../components/EtaCountdown";
import { IncidentPhotos } from "../../components/IncidentPhotos";
import { EmergencyPatientContext } from "../../components/EmergencyPatientContext";
import { HospitalPicker } from "../../components/HospitalPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useProviderAccess } from "../../components/ProviderGate";
import { useLiveProviderLocation } from "../../hooks/useLiveProviderLocation";
import { AlertTriangle } from "lucide-react";

type Loc = { latitude: number; longitude: number; recorded_at: string };

const STEPS = [
  { v: "en_route", label: "En route" },
  { v: "arrived", label: "On scene" },
  { v: "patient_collected", label: "Patient loaded" },
  { v: "en_route_to_hospital", label: "→ Hospital" },
  { v: "at_hospital", label: "At hospital" },
  { v: "completed", label: "Complete" },
];

export default function AmbulanceIncidentConsole() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { providerId } = useProviderAccess();
  const [incident, setIncident] = useState<any | null>(null);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [eta, setEta] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState(false);

  const isAssigned = incident?.assigned_provider_id === providerId;
  const isLive = incident && !["completed","cancelled"].includes(incident.status);

  useLiveProviderLocation(id ?? null, providerId, !!isAssigned && !!isLive);

  useEffect(() => {
    if (!id) return;
    supabase.from("holarchelp_incidents" as any).select("*").eq("id", id).maybeSingle()
      .then(({ data }) => {
        setIncident(data);
        setNotes(((data as any)?.pre_arrival_notes) ?? "");
      });
    supabase.from("holarchelp_locations" as any).select("latitude, longitude, recorded_at")
      .eq("incident_id", id).order("recorded_at", { ascending: false }).limit(200)
      .then(({ data }) => setLocations((data as any) ?? []));

    const ch = supabase.channel(`amb-inc-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "holarchelp_locations", filter: `incident_id=eq.${id}` },
        (p) => setLocations((prev) => [p.new as any, ...prev].slice(0, 200)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "holarchelp_incidents", filter: `id=eq.${id}` },
        (p) => setIncident((prev: any) => ({ ...(prev ?? {}), ...(p.new as any) })))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const setStatus = async (status: string) => {
    const { error } = await supabase.rpc("holarchelp_set_incident_status" as any, {
      _incident_id: id, _status: status, _payload: {},
    });
    if (error) return toast.error(error.message);
    toast.success(`Status: ${status.replace(/_/g, " ")}`);
  };

  const setEtaMinutes = async () => {
    if (!eta || !id) return;
    const { error } = await supabase.from("holarchelp_incidents" as any)
      .update({ eta_minutes: Number(eta), last_eta_update: new Date().toISOString() } as any).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("holarchelp_incident_events" as any).insert({
      incident_id: id, provider_id: providerId, event_type: "eta_set", payload: { eta_minutes: Number(eta) },
    } as any);
    toast.success("ETA shared with hospital");
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    const { error } = await supabase.from("holarchelp_incidents" as any)
      .update({ pre_arrival_notes: notes } as any).eq("id", id);
    setSavingNotes(false);
    if (error) return toast.error(error.message);
    await supabase.from("holarchelp_incident_events" as any).insert({
      incident_id: id, provider_id: providerId, event_type: "pre_arrival_notes_updated", payload: { length: notes.length },
    } as any);
    toast.success("Notes saved");
  };

  const release = async () => {
    if (!id) return;
    const reason = window.prompt("Reason for unable to continue?") || "unable_to_continue";
    const { error } = await supabase.rpc("holarchelp_release_incident" as any, { _incident_id: id, _reason: reason });
    if (error) return toast.error(error.message);
    supabase.functions.invoke("dispatch-sos", { body: { incident_id: id, exclude_provider_ids: [providerId] } });
    toast.success("Released — incident reopened");
    navigate("/provider/ambulance");
  };

  if (!incident) return <div className="text-muted-foreground">Loading…</div>;

  const mapPoints: import("../../components/LiveMap").LiveMapPoint[] = [];
  if (locations[0]) mapPoints.push({ kind: "patient", latitude: locations[0].latitude, longitude: locations[0].longitude });
  if (incident.provider_latitude && incident.provider_longitude) {
    mapPoints.push({ kind: "ambulance", latitude: incident.provider_latitude, longitude: incident.provider_longitude });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate("/provider/ambulance")} className="text-xs text-muted-foreground hover:text-foreground">← Back to dispatch</button>
          <h1 className="mt-1 text-xl font-extrabold">Emergency response console</h1>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isLive ? "bg-sos/10 text-sos" : "bg-secondary text-primary"}`}>
          {(incident.status ?? "").toUpperCase().replace(/_/g, " ")}
        </span>
      </div>

      {!isAssigned && incident.assigned_provider_id && (
        <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
          <p className="font-semibold text-amber-800 dark:text-amber-300">This incident has been locked by another responder.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <SosLiveMap incidentId={id!} mode="ambulance" height={320} />


          {isAssigned && (
            <>
              <div className="rounded-2xl border bg-card p-3 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status stepper</p>
                <div className="flex flex-wrap gap-1.5">
                  {STEPS.map((s) => (
                    <Button key={s.v}
                            size="sm"
                            variant={incident.status === s.v ? "default" : "outline"}
                            onClick={() => setStatus(s.v)}>
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-3 space-y-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="eta" className="text-xs">ETA to hospital (minutes)</Label>
                  <div className="flex gap-2">
                    <Input id="eta" type="number" value={eta} onChange={(e) => setEta(e.target.value)} className="rounded-xl" />
                    <Button size="sm" onClick={setEtaMinutes}>Share</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Countdown: <EtaCountdown etaMinutes={incident.eta_minutes} lastUpdate={incident.last_eta_update} />
                  </p>
                </div>
              </div>

              <HospitalPicker
                incidentId={id!}
                selectedId={incident.destination_hospital_id ?? null}
                originLat={locations[0]?.latitude ?? incident.provider_latitude}
                originLng={locations[0]?.longitude ?? incident.provider_longitude}
              />

              <div className="rounded-2xl border bg-card p-3 space-y-2">
                <Label className="text-xs">Pre-arrival notes (visible to hospital)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[80px] rounded-xl" placeholder="GCS, vitals, mechanism of injury, allergies observed…" />
                <Button size="sm" variant="outline" onClick={saveNotes} disabled={savingNotes}>Save notes</Button>
              </div>

              <Button size="sm" variant="destructive" className="gap-1.5" onClick={release}>
                <AlertTriangle className="h-4 w-4" /> Unable to continue
              </Button>
            </>
          )}
        </div>

        <div className="space-y-3">
          <EmergencyPatientContext incidentId={id!} />
          <IncidentVoiceNoteRecorder incidentId={id!} providerId={providerId} />
          <IncidentPhotos incidentId={id!} readOnly />
          <IncidentTimeline incidentId={id!} />
        </div>
      </div>
    </div>
  );
}
