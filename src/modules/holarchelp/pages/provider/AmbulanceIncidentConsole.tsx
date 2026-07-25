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
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/userMessage";

type Loc = { latitude: number; longitude: number; recorded_at: string };

const STEPS = [
  { v: "en_route", labelKey: "status.enRoute" },
  { v: "arrived", labelKey: "incidentConsole.onScene" },
  { v: "patient_collected", labelKey: "status.patientCollected" },
  { v: "en_route_to_hospital", labelKey: "status.enRouteToHospital" },
  { v: "at_hospital", labelKey: "status.atHospital" },
  { v: "completed", labelKey: "incidentConsole.complete" },
];

const statusLabel = (status: string | null | undefined, t: (key: string, options?: any) => string) =>
  t(`transportStatus.${status ?? ""}`, { defaultValue: (status ?? "").replace(/_/g, " ") });

export default function AmbulanceIncidentConsole() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { providerId } = useProviderAccess();
  const [incident, setIncident] = useState<any | null>(null);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [eta, setEta] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, []);

  const isAssignedParamedic = !!meId && incident?.assigned_paramedic_user_id === meId;
  const isAssignedProvider = incident?.assigned_provider_id === providerId; // legacy fallback
  const isLive = incident && !["completed","cancelled"].includes(incident.status);

  useLiveProviderLocation(id ?? null, providerId, (isAssignedParamedic || isAssignedProvider) && !!isLive);

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
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    toast.success(`${t("common.status")}: ${statusLabel(status, t)}`);
  };

  const setEtaMinutes = async () => {
    if (!eta || !id) return;
    const { error } = await supabase.from("holarchelp_incidents" as any)
      .update({ eta_minutes: Number(eta), last_eta_update: new Date().toISOString() } as any).eq("id", id);
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    await supabase.from("holarchelp_incident_events" as any).insert({
      incident_id: id, provider_id: providerId, event_type: "eta_set", payload: { eta_minutes: Number(eta) },
    } as any);
    toast.success(t("incidentConsole.etaShared"));
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    const { error } = await supabase.from("holarchelp_incidents" as any)
      .update({ pre_arrival_notes: notes } as any).eq("id", id);
    setSavingNotes(false);
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    await supabase.from("holarchelp_incident_events" as any).insert({
      incident_id: id, provider_id: providerId, event_type: "pre_arrival_notes_updated", payload: { length: notes.length },
    } as any);
    toast.success(t("incidentConsole.notesSaved"));
  };

  const release = async () => {
    if (!id) return;
    const reason = window.prompt(t("incidentConsole.unableReason")) || "unable_to_continue";
    const { error } = await supabase.rpc("holarchelp_release_incident" as any, { _incident_id: id, _reason: reason });
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    supabase.functions.invoke("dispatch-sos", { body: { incident_id: id, exclude_provider_ids: [providerId] } });
    toast.success(t("incidentConsole.released"));
    navigate("/provider/ambulance");
  };

  if (!incident) return <div className="text-muted-foreground">{t("incidentConsole.loading")}</div>;

  const mapPoints: import("../../components/LiveMap").LiveMapPoint[] = [];
  if (locations[0]) mapPoints.push({ kind: "patient", latitude: locations[0].latitude, longitude: locations[0].longitude });
  if (incident.provider_latitude && incident.provider_longitude) {
    mapPoints.push({ kind: "ambulance", latitude: incident.provider_latitude, longitude: incident.provider_longitude });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate("/provider/ambulance")} className="text-sm text-muted-foreground hover:text-foreground">{t("incidentConsole.backToDispatch")}</button>
          <h1 className="mt-1 text-xl font-extrabold">{t("incidentConsole.title")}</h1>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${isLive ? "bg-sos/10 text-sos" : "bg-secondary text-primary"}`}>
          {statusLabel(incident.status, t).toUpperCase()}
        </span>
      </div>

      {!isAssignedParamedic && !isAssignedProvider && incident.assigned_provider_id && (
        <div className="rounded-2xl border-2 border-warning/40/40 bg-warning/10 p-3 text-sm">
          <p className="font-semibold text-warning">{t("incidentConsole.locked")}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <SosLiveMap incidentId={id!} mode="ambulance" height={320} />


          {(isAssignedParamedic || isAssignedProvider) && (
            <>
              <div className="rounded-2xl border bg-card p-3 space-y-3">
                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("incidentConsole.statusStepper")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {STEPS.map((s) => (
                    <Button key={s.v}
                            size="sm"
                            variant={incident.status === s.v ? "default" : "outline"}
                            onClick={() => setStatus(s.v)}>
                      {t(s.labelKey)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-3 space-y-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="eta" className="text-sm">{t("incidentConsole.etaToHospital")}</Label>
                  <div className="flex gap-2">
                    <Input id="eta" type="number" value={eta} onChange={(e) => setEta(e.target.value)} className="rounded-xl" />
                    <Button size="sm" onClick={setEtaMinutes}>{t("incidentConsole.share")}</Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("incidentConsole.countdown")}: <EtaCountdown etaMinutes={incident.eta_minutes} lastUpdate={incident.last_eta_update} />
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
                <Label className="text-sm">{t("incidentConsole.preArrivalNotes")}</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[80px] rounded-xl" placeholder={t("incidentConsole.notesPlaceholder")} />
                <Button size="sm" variant="outline" onClick={saveNotes} disabled={savingNotes}>{t("incidentConsole.saveNotes")}</Button>
              </div>

              <Button size="sm" variant="destructive" className="gap-1.5" onClick={release}>
                <AlertTriangle className="h-4 w-4" /> {t("incidentConsole.unableContinue")}
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

