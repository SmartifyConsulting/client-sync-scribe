import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SosLiveMap } from "../../components/SosLiveMap";
import { IncidentTimeline } from "../../components/IncidentTimeline";
import { IncidentPhotos } from "../../components/IncidentPhotos";
import { EtaCountdown } from "../../components/EtaCountdown";
import { EmergencyPatientContext } from "../../components/EmergencyPatientContext";
import { TriageControls } from "../../components/TriageControls";
import { AdmittedPatientChart } from "../../components/AdmittedPatientChart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/userMessage";

const ADMISSION_STEPS = [
  { v: "incoming", labelKey: "admissionStatus.incoming" },
  { v: "awaiting_arrival", labelKey: "admissionStatus.awaiting_arrival" },
  { v: "arrived", labelKey: "admissionStatus.arrived" },
  { v: "in_triage", labelKey: "admissionStatus.in_triage" },
  { v: "admitted", labelKey: "status.admitted" },
  { v: "escalated", labelKey: "admissionStatus.escalated" },
];

const statusLabel = (status: string | null | undefined, t: (key: string, options?: any) => string) =>
  t(`transportStatus.${status ?? ""}`, { defaultValue: (status ?? "").replace(/_/g, " ") });

export default function HospitalIncidentConsole() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<any | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [crew, setCrew] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    supabase.from("holarchelp_incidents" as any).select("*").eq("id", id).maybeSingle()
      .then(async ({ data }) => {
        setIncident(data);
        const ambId = (data as any)?.assigned_provider_id;
        if (ambId) {
          const { data: amb } = await supabase.from("holarchelp_ambulance_providers" as any)
            .select("company_name, contact_phone").eq("id", ambId).maybeSingle();
          setCrew([(amb as any)?.company_name, (amb as any)?.contact_phone].filter(Boolean).join(" · "));
        }
      });
    supabase.from("holarchelp_locations" as any).select("latitude, longitude, recorded_at")
      .eq("incident_id", id).order("recorded_at", { ascending: false }).limit(200)
      .then(({ data }) => setLocations((data as any) ?? []));

    const ch = supabase.channel(`hosp-inc-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "holarchelp_locations", filter: `incident_id=eq.${id}` },
        (p) => setLocations((prev) => [p.new as any, ...prev].slice(0, 200)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "holarchelp_incidents", filter: `id=eq.${id}` },
        (p) => setIncident((prev: any) => ({ ...(prev ?? {}), ...(p.new as any) })))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const setAdmissionStatus = async (next: string) => {
    if (!id) return;
    const patch: any = { hospital_admission_status: next };
    if (next === "admitted") patch.admitted_at = new Date().toISOString();
    if (next === "escalated") patch.escalated_at = new Date().toISOString();
    if (next === "in_triage" && !incident?.triage_assigned_at) patch.triage_assigned_at = new Date().toISOString();
    const { error } = await supabase.from("holarchelp_incidents" as any).update(patch).eq("id", id);
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    await supabase.from("holarchelp_incident_events" as any).insert({
      incident_id: id, event_type: `admission_${next}`, payload: {},
    } as any);
    toast.success(`${t("admissions.admission")}: ${t(`admissionStatus.${next}`, { defaultValue: next.replace(/_/g," ") })}`);
  };

  if (!incident) return <div className="text-muted-foreground">{t("common.loading")}</div>;

  const mapPoints: import("../../components/LiveMap").LiveMapPoint[] = [];
  if (locations[0]) mapPoints.push({ kind: "patient", latitude: locations[0].latitude, longitude: locations[0].longitude });
  if (incident.provider_latitude && incident.provider_longitude) {
    mapPoints.push({ kind: "ambulance", latitude: incident.provider_latitude, longitude: incident.provider_longitude });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate("/provider/hospital")} className="text-xs text-muted-foreground hover:text-foreground">{t("hospitalConsole.backToQueue")}</button>
          <h1 className="mt-1 text-xl font-extrabold">{t("hospitalConsole.title")}</h1>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {statusLabel(incident.status, t).toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("hospitalConsole.erEta")} value={<EtaCountdown etaMinutes={incident.eta_minutes} lastUpdate={incident.last_eta_update} />} />
        <Stat label={t("hospitalConsole.transport")} value={statusLabel(incident.status, t)} />
        <Stat label={t("admissions.admission")} value={t(`admissionStatus.${incident.hospital_admission_status ?? "incoming"}`)} />
        <Stat label={t("nav.triage")} value={incident.triage_priority ?? "—"} />
      </div>

      {crew && (
        <div className="rounded-xl border bg-muted/30 p-2.5 text-xs">
          <span className="font-semibold">{t("common.crew")}:</span> {crew}
        </div>
      )}

      {incident.pre_arrival_notes && (
        <div className="rounded-2xl border-2 border-warning/30 bg-warning/10 p-3 dark:bg-warning/10">
          <p className="text-sm font-bold uppercase tracking-wider text-warning dark:text-warning">{t("hospitalConsole.preArrivalFromCrew")}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{incident.pre_arrival_notes}</p>
        </div>
      )}

      {incident.hospital_admission_status === "admitted" ? (
        <AdmittedPatientChart incidentId={id!} />
      ) : (
        // Pre-admission workflow — map / admission stepper / triage assessment /
        // timeline. Once the patient is admitted to a ward these are replaced by
        // the bedside chart above; kept here (not deleted) in case this incident
        // needs re-triaging or the admission status is reverted.
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <SosLiveMap incidentId={id!} mode="hospital" height={320} />
            <div className="rounded-2xl border bg-card p-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("hospitalConsole.admissionStepper")}</p>
              <div className="flex flex-wrap gap-1.5">
                {ADMISSION_STEPS.map((s) => (
                  <Button key={s.v} size="sm"
                          variant={incident.hospital_admission_status === s.v ? "default" : "outline"}
                          onClick={() => setAdmissionStatus(s.v)}>
                    {t(s.labelKey)}
                  </Button>
                ))}
              </div>
            </div>
            <TriageControls incidentId={id!} current={{
              triage_priority: incident.triage_priority,
              triage_bay: incident.triage_bay,
              triage_nurse: incident.triage_nurse,
            }} />
          </div>
          <div className="space-y-3">
            <EmergencyPatientContext incidentId={id!} />
            <IncidentPhotos incidentId={id!} readOnly />
            <IncidentTimeline incidentId={id!} />
          </div>
        </div>
      )}
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-2xl border bg-card p-2.5">
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-base font-extrabold">{value}</p>
  </div>
);
