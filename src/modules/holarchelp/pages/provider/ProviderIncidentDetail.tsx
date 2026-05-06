import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LiveMap } from "../../components/LiveMap";
import { IncidentTimeline } from "../../components/IncidentTimeline";
import { IncidentVoiceNoteRecorder } from "../../components/IncidentVoiceNoteRecorder";
import { EtaCountdown } from "../../components/EtaCountdown";
import { IncidentPhotos } from "../../components/IncidentPhotos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useProviderAccess } from "../../components/ProviderGate";
import { useProviderLocationTracking } from "../../hooks/useProviderLocationTracking";
import { AlertTriangle } from "lucide-react";

type Loc = { latitude: number; longitude: number; recorded_at: string };

export default function ProviderIncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { providerId } = useProviderAccess();
  const [incident, setIncident] = useState<any | null>(null);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [eta, setEta] = useState<string>("");
  const [hospitals, setHospitals] = useState<{ id: string; name: string }[]>([]);

  const isAssigned = incident?.assigned_provider_id === providerId;
  const isLive = incident && !["completed", "cancelled"].includes(incident.status);

  useProviderLocationTracking(id ?? null, !!isAssigned && !!isLive);

  useEffect(() => {
    if (!id) return;
    supabase.from("holarchelp_incidents" as any).select("*").eq("id", id).maybeSingle()
      .then(({ data }) => setIncident(data));
    supabase.from("holarchelp_locations" as any).select("latitude, longitude, recorded_at")
      .eq("incident_id", id).order("recorded_at", { ascending: false }).limit(200)
      .then(({ data }) => setLocations((data as any) ?? []));
    supabase.from("holarchelp_hospitals" as any)
      .select("id, name").eq("status", "approved").eq("subscription_status", "active").eq("accepting_patients", true)
      .then(({ data }) => setHospitals((data as any) ?? []));

    const ch = supabase.channel(`provider-incident-${id}`)
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
  };

  const setDestination = async (hospitalId: string) => {
    const { error } = await supabase.from("holarchelp_incidents" as any)
      .update({ destination_hospital_id: hospitalId } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Destination hospital set");
  };

  const release = async () => {
    if (!id) return;
    const reason = window.prompt("Reason for unable to continue?") || "unable_to_continue";
    const { error } = await supabase.rpc("holarchelp_release_incident" as any, { _incident_id: id, _reason: reason });
    if (error) return toast.error(error.message);
    // Re-broadcast to other providers
    supabase.functions.invoke("dispatch-sos", {
      body: { incident_id: id, exclude_provider_ids: [providerId] },
    });
    toast.success("Released — incident reopened");
    navigate("/provider");
  };

  if (!incident) return <div className="text-muted-foreground">Loading…</div>;

  const ambulancePoint = incident.provider_latitude && incident.provider_longitude
    ? [{ latitude: incident.provider_latitude, longitude: incident.provider_longitude, recorded_at: incident.provider_location_updated_at ?? new Date().toISOString() }]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate("/provider")} className="text-xs text-muted-foreground hover:text-foreground">← Back to dispatch</button>
          <h1 className="mt-1 text-xl font-extrabold">Incident</h1>
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

      <LiveMap points={[...locations.slice(0, 1), ...ambulancePoint]} height={320} />

      {isAssigned && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live response</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="eta" className="text-xs">ETA (minutes)</Label>
              <div className="flex gap-2">
                <Input id="eta" type="number" value={eta} onChange={(e) => setEta(e.target.value)} className="rounded-xl" />
                <Button size="sm" onClick={setEtaMinutes}>Set</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Countdown: <EtaCountdown etaMinutes={incident.eta_minutes} lastUpdate={incident.last_eta_update} />
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Destination hospital</Label>
              <Select value={incident.destination_hospital_id ?? ""} onValueChange={setDestination}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select hospital" /></SelectTrigger>
                <SelectContent>
                  {hospitals.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setStatus("en_route")}>Mark en route</Button>
            <Button size="sm" variant="outline" onClick={() => setStatus("arrived")}>Arrived on scene</Button>
            <Button size="sm" variant="outline" onClick={() => setStatus("patient_collected")}>Patient collected</Button>
            <Button size="sm" variant="outline" onClick={() => setStatus("at_hospital")}>At hospital</Button>
            <Button size="sm" onClick={() => setStatus("completed")}>Complete</Button>
          </div>
          <Button size="sm" variant="destructive" className="gap-1.5" onClick={release}>
            <AlertTriangle className="h-4 w-4" /> Unable to continue
          </Button>
        </div>
      )}

      <IncidentVoiceNoteRecorder incidentId={id!} providerId={providerId} />
      <IncidentPhotos incidentId={id!} readOnly />
      <IncidentTimeline incidentId={id!} />
    </div>
  );
}
