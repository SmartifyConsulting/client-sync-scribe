import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useLiveProviderLocation } from "../../../hooks/useLiveProviderLocation";
import { ActiveMissionGoogleMap } from "../../../components/ActiveMissionGoogleMap";
import { HospitalPicker } from "../../../components/HospitalPicker";
import { EtaCountdown } from "../../../components/EtaCountdown";
import { AmbulanceSimulator } from "../../../components/AmbulanceSimulator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Siren, Navigation as NavIcon, AlertTriangle, Home, ListChecks, HeartHandshake } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/userMessage";
import { MissionStatusStepper } from "../../../components/MissionStatusStepper";

type Inc = any;

export default function NavigationScreen() {
  const { t } = useTranslation();
  const { id: paramId } = useParams<{ id: string }>();
  const { providerId } = useProviderAccess();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(paramId ?? null);
  const [incident, setIncident] = useState<Inc | null>(null);
  const [crewLoc, setCrewLoc] = useState<{ lat: number; lng: number } | null>(null);

  // Auto-select current active mission if not in URL
  useEffect(() => {
    if (paramId) { setActiveId(paramId); return; }
    if (!providerId) return;
    supabase.from("holarchelp_incidents" as any)
      .select("id").eq("assigned_provider_id", providerId)
      .in("status", ["assigned","en_route","arrived","patient_collected","en_route_to_hospital","at_hospital"])
      .order("accepted_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setActiveId(((data as any)?.id) ?? null));
  }, [paramId, providerId]);

  const isAssigned = incident?.assigned_provider_id === providerId;
  const isLive = incident && !["completed","cancelled"].includes(incident.status);
  useLiveProviderLocation(activeId, providerId, !!isAssigned && !!isLive);

  useEffect(() => {
    if (!activeId) { setIncident(null); return; }
    supabase.from("holarchelp_incidents" as any).select("*").eq("id", activeId).maybeSingle()
      .then(({ data }) => setIncident(data));
    const ch = supabase.channel(`amb-nav-${activeId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "holarchelp_incidents", filter: `id=eq.${activeId}` },
        (p) => setIncident((prev: any) => ({ ...(prev ?? {}), ...(p.new as any) })))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId]);

  // Track crew GPS for hospital picker origin
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setCrewLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      undefined, { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Course-deviation: poll latest incident_events for a route_deviation in the last 60s
  const [deviationActive, setDeviationActive] = useState(false);
  useEffect(() => {
    if (!activeId || incident?.status !== "en_route_to_hospital") { setDeviationActive(false); return; }
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase
        .from("holarchelp_incident_events" as any)
        .select("created_at")
        .eq("incident_id", activeId)
        .eq("event_type", "route_deviation")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      const t = (data as any)?.created_at ? new Date((data as any).created_at).getTime() : 0;
      setDeviationActive(t > 0 && Date.now() - t < 60_000);
    };
    check();
    const id = window.setInterval(check, 10_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [activeId, incident?.status]);

  const setStatus = async (status: string) => {
    if (!activeId) return;
    const { error } = await supabase.rpc("holarchelp_set_incident_status" as any, {
      _incident_id: activeId, _status: status, _payload: {},
    });
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    toast.success(t("navigationScreen.status", { status: status.replace(/_/g," ") }));
    if (status === "completed") navigate("/provider/ambulance");
  };

  if (!activeId) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <NavIcon className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-semibold">{t("navigationScreen.noActiveMission")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("navigationScreen.acceptToStart")}</p>
        <Button asChild className="mt-4"><Link to="/provider/ambulance/incoming">{t("navigationScreen.openIncomingSos")}</Link></Button>
      </div>
    );
  }

  if (!incident) return <div className="text-sm text-muted-foreground">{t("navigationScreen.loadingMission")}</div>;

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold mt-1 flex items-center gap-2">
            <NavIcon className="h-5 w-5 text-primary" />
            {t("navigationScreen.mission")} #{(incident.incident_number ?? activeId.slice(0,8))}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t("navigationScreen.helper", "Your current mission — turn-by-turn route, status and destination hospital.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-sos/40 bg-sos/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-sos">
            <Siren className="mr-1 inline h-3 w-3" /> {(incident.status ?? "").replace(/_/g," ")}
          </span>
          {incident.eta_minutes != null && (
            <span className="rounded-full border bg-card px-2 py-1 text-xs font-bold uppercase tracking-wider">
              {t("navigationScreen.eta")} <EtaCountdown etaMinutes={incident.eta_minutes} lastUpdate={incident.last_eta_update} />
            </span>
          )}
        </div>
      </header>

      <AmbulanceSimulator incidentId={activeId} />


      <div className="grid gap-3 xl:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-2xl border bg-card">
          <ActiveMissionGoogleMap incidentId={activeId} height={520} />
        </div>

        <aside className="space-y-3">
          <MissionStatusStepper
            currentStatus={incident.status}
            treatedOnScene={incident.status === "treated_on_scene"}
          />

          {/* Course-deviation banner — set by the auto-advance trigger via incident_events */}
          {deviationActive && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800">
              <p className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-3.5 w-3.5" /> Off planned route to hospital
              </p>
              <p className="mt-0.5">The vehicle is moving away from the selected destination hospital. Verify the route or reassign.</p>
            </div>
          )}

          {/* Treated on scene — cancel transport (only meaningful at scene / with patient) */}
          {isAssigned && ["arrived","patient_collected","en_route_to_hospital"].includes(incident.status) && (
            <Button
              variant="outline"
              className="h-11 w-full border-amber-500/50 text-amber-700 hover:bg-amber-500/10 text-xs font-bold"
              onClick={async () => {
                if (!confirm("Mark this patient as treated on scene and cancel transport?")) return;
                const { error } = await supabase.rpc("holarchelp_cancel_transport" as any, {
                  _incident_id: activeId, _reason: "Patient treated at the scene; transport not required",
                });
                if (error) return toastError(error, "We couldn't cancel transport. Please try again.");
                toast.success("Marked as treated on scene");
                navigate("/provider/ambulance");
              }}
            >
              <HeartHandshake className="mr-1.5 h-4 w-4" /> Treated on scene — cancel transport
            </Button>
          )}

          {/* Post-hospital dispatcher choice (only after the vehicle is unloaded at hospital) */}
          {isAssigned && incident.status === "at_hospital" && (
            <div className="rounded-2xl border bg-card p-3">
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">After handover</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <Button size="sm" variant="outline" className="h-10 text-xs font-bold"
                  onClick={() => setStatus("completed")}>
                  <Home className="mr-1 h-3.5 w-3.5" /> Return to base
                </Button>
                <Button size="sm" className="h-10 text-xs font-bold"
                  onClick={async () => { await setStatus("completed"); navigate("/provider/ambulance/dashboard"); }}>
                  <ListChecks className="mr-1 h-3.5 w-3.5" /> Next incident
                </Button>
              </div>
            </div>
          )}

          <HospitalPicker
            incidentId={activeId}
            selectedId={incident.destination_hospital_id ?? null}
            originLat={crewLoc?.lat ?? incident.provider_latitude ?? incident.latitude}
            originLng={crewLoc?.lng ?? incident.provider_longitude ?? incident.longitude}
          />

          <Link to={`/provider/ambulance/incident/${activeId}`}
                className="block rounded-2xl border bg-card p-3 text-center text-xs font-semibold hover:bg-muted">
            {t("navigationScreen.fullConsole")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
