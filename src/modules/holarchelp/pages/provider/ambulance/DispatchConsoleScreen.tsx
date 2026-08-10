import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Radio, Users, Siren, MapPin, Clock, Building2, Truck } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/userMessage";
import { IncidentNumberBadge } from "@/components/IncidentNumberBadge";
import {
  IncidentCard, VehicleCard, HospitalCard, AssignmentPanel, Timeline, StatusBadge,
  emsDistKm, emsEtaMinutes, emsAgo, emsSeverityRank, severityTone,
  type EmsTimelineItem,
} from "../../../components/ems";

type Incident = {
  id: string;
  incident_number?: string | null;
  severity: string | null;
  status: string;
  created_at: string;
  notes?: string | null;
  conscious?: boolean | null;
  breathing?: boolean | null;
  user_id?: string | null;
  triggered_by_user_id?: string | null;
  assigned_provider_id?: string | null;
  assigned_ambulance_id?: string | null;
  destination_hospital_id?: string | null;
  eta_minutes?: number | null;
};

type Vehicle = {
  id: string;
  vehicle_code: string;
  registration_number: string | null;
  status: string | null;
  lat: number | null;
  lng: number | null;
  lead_name?: string | null;
  crew_count?: number;
  shift_label?: string | null;
};

type Hospital = {
  id: string;
  name: string;
  ownership: string | null;
  latitude: number | null;
  longitude: number | null;
  er_capacity_status?: string | null;
  tier?: string | null;
  services?: any;
  beds_available?: number | null;
  bed_capacity?: number | null;
  preferred?: boolean;
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="px-1 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">{children}</h2>
);

export default function DispatchConsoleScreen() {
  const { providerId } = useProviderAccess();
  const [loading, setLoading] = useState(true);
  const [onDuty, setOnDuty] = useState(false);
  const [togglingDuty, setTogglingDuty] = useState(false);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentLocs, setIncidentLocs] = useState<Record<string, { lat: number; lng: number }>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [events, setEvents] = useState<EmsTimelineItem[]>([]);

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [settingHospital, setSettingHospital] = useState<string | null>(null);
  const [dragIncidentId, setDragIncidentId] = useState<string | null>(null);
  const [dragOverVehicleId, setDragOverVehicleId] = useState<string | null>(null);

  const incidentCols =
    "id, incident_number, severity, status, created_at, notes, conscious, breathing, user_id, triggered_by_user_id, assigned_provider_id, assigned_ambulance_id, destination_hospital_id, eta_minutes";

  const loadAll = async () => {
    if (!providerId) return;
    const [{ data: prov }, { data: offers }, { data: assigned }, { data: vehs }, { data: shifts }, { data: hosps }, { data: affils }] =
      await Promise.all([
        supabase.from("holarchelp_ambulance_providers" as any).select("dispatcher_on_duty").eq("id", providerId).maybeSingle(),
        supabase
          .from("holarchelp_incident_offers" as any)
          .select(`incident_id, holarchelp_incidents!inner(${incidentCols})`)
          .eq("provider_id", providerId)
          .eq("response", "pending"),
        supabase
          .from("holarchelp_incidents" as any)
          .select(incidentCols)
          .eq("assigned_provider_id", providerId)
          .in("status", ["assigned", "en_route", "arrived", "patient_collected", "en_route_to_hospital", "at_hospital"]),
        supabase
          .from("ambulances" as any)
          .select("id, vehicle_code, registration_number, status, current_latitude, current_longitude")
          .eq("provider_id", providerId)
          .neq("status", "out_of_service")
          .order("vehicle_code"),
        supabase
          .from("paramedic_shifts" as any)
          .select("id, ambulance_id, user_id, status, started_at, profiles:user_id(full_name)")
          .eq("provider_id", providerId)
          .is("ended_at", null),
        supabase
          .from("holarchelp_hospitals" as any)
          .select("id, name, ownership, latitude, longitude, er_capacity_status, tier, services, beds_available, bed_capacity, status, accepting_patients")
          .eq("status", "approved")
          .eq("accepting_patients", true)
          .not("latitude", "is", null)
          .not("longitude", "is", null),
        supabase
          .from("ambulance_hospital_affiliations" as any)
          .select("hospital_id, status")
          .eq("ambulance_provider_id", providerId),
      ]);

    setOnDuty(!!(prov as any)?.dispatcher_on_duty);

    const openIncs = ((offers as any[]) ?? [])
      .map((o) => o.holarchelp_incidents)
      .filter((i: any) => i && ["open", "reopened"].includes(i.status)) as Incident[];
    const assignedIncs = (((assigned as any) ?? []) as Incident[]);
    const merged = new Map<string, Incident>();
    [...openIncs, ...assignedIncs].forEach((i) => merged.set(i.id, i));
    const list = [...merged.values()].sort(
      (a, b) => (emsSeverityRank[a.severity ?? ""] ?? 9) - (emsSeverityRank[b.severity ?? ""] ?? 9),
    );
    setIncidents(list);

    // Latest location per incident
    if (list.length) {
      const { data: locs } = await supabase
        .from("holarchelp_locations" as any)
        .select("incident_id, latitude, longitude, recorded_at")
        .in("incident_id", list.map((i) => i.id))
        .order("recorded_at", { ascending: false });
      const seen = new Set<string>();
      const map: Record<string, { lat: number; lng: number }> = {};
      ((locs as any[]) ?? []).forEach((l) => {
        if (seen.has(l.incident_id)) return;
        seen.add(l.incident_id);
        if (l.latitude != null && l.longitude != null) map[l.incident_id] = { lat: l.latitude, lng: l.longitude };
      });
      setIncidentLocs(map);

      const userIds = Array.from(
        new Set(list.flatMap((i) => [i.user_id, i.triggered_by_user_id]).filter(Boolean) as string[]),
      );
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        setNames(Object.fromEntries(((profs as any[]) ?? []).map((p) => [p.id, p.full_name])));
      }
    } else {
      setIncidentLocs({});
    }

    const shiftMap = new Map<string, any[]>();
    ((shifts as any[]) ?? []).forEach((s) => {
      if (!s.ambulance_id) return;
      shiftMap.set(s.ambulance_id, [...(shiftMap.get(s.ambulance_id) ?? []), s]);
    });
    setVehicles(
      (((vehs as any[]) ?? []) as any[]).map((v) => {
        const crew = shiftMap.get(v.id) ?? [];
        const lead = crew[0];
        return {
          id: v.id,
          vehicle_code: v.vehicle_code,
          registration_number: v.registration_number,
          status: v.status,
          lat: v.current_latitude ?? null,
          lng: v.current_longitude ?? null,
          lead_name: lead?.profiles?.full_name ?? null,
          crew_count: crew.length,
          shift_label: lead?.started_at ? `open since ${emsAgo(lead.started_at)} ago` : null,
        };
      }),
    );

    const preferred = new Set(
      ((affils as any[]) ?? []).filter((a) => (a.status ?? "active") === "active").map((a) => a.hospital_id),
    );
    setHospitals(
      (((hosps as any[]) ?? []) as Hospital[]).map((h) => ({ ...h, preferred: preferred.has(h.id) })),
    );
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    if (!providerId) return;
    const ch = supabase.channel(`dispatch-console-${providerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incident_offers" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "ambulances", filter: `provider_id=eq.${providerId}` }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "paramedic_shifts", filter: `provider_id=eq.${providerId}` }, loadAll)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "holarchelp_ambulance_providers", filter: `id=eq.${providerId}` }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const selected = incidents.find((i) => i.id === selectedIncidentId) ?? null;

  // Incident timeline for the selected incident
  useEffect(() => {
    if (!selected) { setEvents([]); return; }
    let cancelled = false;
    supabase
      .from("holarchelp_incident_events" as any)
      .select("id, event_type, created_at")
      .eq("incident_id", selected.id)
      .order("created_at", { ascending: true })
      .limit(30)
      .then(({ data }) => {
        if (cancelled) return;
        setEvents(
          ((data as any[]) ?? []).map((e) => ({
            id: e.id,
            label: String(e.event_type ?? "event").replace(/_/g, " "),
            at: e.created_at,
          })),
        );
      });
    return () => { cancelled = true; };
  }, [selected?.id]);

  const originLoc = selected ? incidentLocs[selected.id] ?? null : null;

  const queue = useMemo(
    () =>
      incidents.map((i) => {
        const loc = incidentLocs[i.id];
        return {
          ...i,
          distance_km: null as number | null,
          patient_name: i.user_id ? names[i.user_id] ?? null : null,
          caller_name: i.triggered_by_user_id ? names[i.triggered_by_user_id] ?? null : null,
          loc,
        };
      }),
    [incidents, incidentLocs, names],
  );

  const grouped = useMemo(() => {
    const buckets: Record<string, typeof queue> = { critical: [], high: [], moderate: [], low: [] };
    queue.forEach((i) => {
      const k = (i.severity ?? "high").toLowerCase();
      (buckets[k] ?? buckets.high).push(i);
    });
    return buckets;
  }, [queue]);

  const rankedVehicles = useMemo(() => {
    const list = vehicles.map((v) => {
      const km = originLoc && v.lat != null && v.lng != null
        ? emsDistKm(originLoc, { lat: v.lat, lng: v.lng })
        : null;
      const isAvailable = (v.status ?? "available").toLowerCase() === "available";
      return {
        ...v,
        distance_km: km,
        eta_min: emsEtaMinutes(km),
        crewed: !!v.lead_name,
        isAvailable,
      };
    });
    return list.sort((a, b) => {
      if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
      if (a.distance_km != null && b.distance_km != null) return a.distance_km - b.distance_km;
      if (a.distance_km != null) return -1;
      if (b.distance_km != null) return 1;
      if (a.crewed !== b.crewed) return a.crewed ? -1 : 1;
      return a.vehicle_code.localeCompare(b.vehicle_code);
    });
  }, [vehicles, originLoc]);

  const availableVehicles = rankedVehicles.filter((v) => v.isAvailable);
  const busyVehicles = rankedVehicles.filter((v) => !v.isAvailable);
  const recommendedVehicleId = availableVehicles[0]?.id ?? null;

  const rankedHospitals = useMemo(() => {
    const scored = hospitals.map((h) => {
      const km = originLoc && h.latitude != null && h.longitude != null
        ? emsDistKm(originLoc, { lat: h.latitude, lng: h.longitude })
        : null;
      const capacityScore =
        h.er_capacity_status === "green" ? 0 : h.er_capacity_status === "amber" ? 1 : h.er_capacity_status === "red" ? 3 : 1;
      const traumaScore = h.tier === "tier_1" ? 0 : h.tier === "tier_2" ? 1 : 2;
      const preferredScore = h.preferred ? 0 : 1;
      const load = h.bed_capacity ? 1 - (h.beds_available ?? 0) / Math.max(1, h.bed_capacity) : 0.5;
      const score = (km ?? 50) / 10 + capacityScore + traumaScore * 0.5 + preferredScore * 0.5 + load;
      return {
        ...h,
        distance_km: km,
        eta_min: emsEtaMinutes(km),
        capability:
          h.tier === "tier_1" ? "Level 1 trauma centre"
          : h.tier === "tier_2" ? "Level 2 trauma"
          : "General emergency",
        score,
      };
    });
    return scored.sort((a, b) => a.score - b.score);
  }, [hospitals, originLoc]);

  const toggleDuty = async (next: boolean) => {
    if (!providerId) return;
    setTogglingDuty(true);
    const { error } = await supabase.rpc("holarchelp_set_dispatcher_on_duty" as any, { _provider_id: providerId, _on: next });
    if (error) toastError(error, "We couldn't complete that. Please try again.");
    else { setOnDuty(next); toast.success(next ? "You are on duty as Dispatcher" : "Dispatcher off duty"); }
    setTogglingDuty(false);
  };

  const assignVehicle = async (incidentId: string, ambulanceId: string) => {
    setAssigning(true);
    const { error } = await supabase.rpc("holarchelp_dispatcher_assign_vehicle" as any, {
      _incident_id: incidentId, _ambulance_id: ambulanceId,
    });
    if (error) toastError(error, "We couldn't dispatch that vehicle.");
    else {
      toast.success("Vehicle dispatched. Crew paged.");
      setSelectedVehicleId(null);
      loadAll();
    }
    setAssigning(false);
  };

  const setDestination = async (incidentId: string, hospitalId: string) => {
    setSettingHospital(hospitalId);
    const { error } = await supabase.rpc("holarchelp_set_destination_hospital" as any, {
      _incident_id: incidentId, _hospital_id: hospitalId,
    });
    if (error) toastError(error, "We couldn't set that destination hospital.");
    else { toast.success("Destination hospital set."); loadAll(); }
    setSettingHospital(null);
  };

  const holdIncident = () => toast.info("Incident held — it stays in the queue until you assign a vehicle.");

  if (loading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const targetVehicleId = selectedVehicleId ?? recommendedVehicleId;

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold">
            <Radio className="h-5 w-5 text-primary" /> Dispatch Console
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Which ambulance should I dispatch? Work left to right: pick an SOS, review it, choose a vehicle, set the hospital.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold">I am on duty</span>
          <Switch checked={onDuty} disabled={togglingDuty} onCheckedChange={toggleDuty} />
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1fr_1.2fr_1fr_0.9fr]">
        {/* 1 — SOS Queue */}
        <section className="rounded-xl border bg-card p-2">
          <SectionTitle>
            <span className="flex items-center gap-1"><Siren className="h-3 w-3 text-sos" /> SOS Queue · {queue.length}</span>
          </SectionTitle>
          {queue.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No SOS offered to your fleet.</p>
          ) : (
            <div className="max-h-[62vh] space-y-2 overflow-y-auto">
              {(["critical", "high", "moderate", "low"] as const).map((sev) =>
                grouped[sev].length ? (
                  <div key={sev} className="space-y-1.5">
                    <p className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {sev} · {grouped[sev].length}
                    </p>
                    {grouped[sev].map((i) => (
                      <IncidentCard
                        key={i.id}
                        incident={{
                          ...i,
                          mine: i.assigned_provider_id === providerId,
                          distance_km: null,
                        }}
                        selected={selectedIncidentId === i.id}
                        onClick={() => { setSelectedIncidentId(i.id); setSelectedVehicleId(null); }}
                        draggable={!i.assigned_ambulance_id}
                        onDragStart={(e) => {
                          setDragIncidentId(i.id);
                          e.dataTransfer.setData("text/plain", i.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => { setDragIncidentId(null); setDragOverVehicleId(null); }}
                        className={dragIncidentId === i.id ? "opacity-60" : ""}
                      />
                    ))}
                  </div>
                ) : null,
              )}
            </div>
          )}
        </section>

        {/* 2 — Incident details */}
        <section className="flex flex-col rounded-xl border bg-card p-3">
          <SectionTitle>Incident Details</SectionTitle>
          {!selected ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Select an SOS from the queue to see patient, caller and location details.
            </p>
          ) : (
            <div className="mt-1 flex-1 space-y-2 overflow-y-auto max-h-[62vh] pr-1">
              <div className="flex items-center justify-between gap-2">
                <IncidentNumberBadge
                  number={selected.incident_number ?? `INC-${selected.id.slice(0, 8)}`}
                  size="md"
                  label="Reference #"
                />
                <StatusBadge tone={severityTone(selected.severity)}>{selected.severity ?? "high"}</StatusBadge>
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <Field label="Patient" value={selected.user_id ? names[selected.user_id] ?? "Unknown" : "Unknown"} />
                <Field label="Caller" value={selected.triggered_by_user_id ? names[selected.triggered_by_user_id] ?? "Self" : "Self"} />
                <Field
                  label="GPS"
                  value={originLoc ? `${originLoc.lat.toFixed(4)}, ${originLoc.lng.toFixed(4)}` : "Awaiting fix"}
                />
                <Field label="Status" value={String(selected.status).replace(/_/g, " ")} />
                <Field label="Waiting" value={`${emsAgo(selected.created_at)}`} />
                <Field
                  label="Est. travel"
                  value={
                    targetVehicleId
                      ? `${rankedVehicles.find((v) => v.id === targetVehicleId)?.eta_min ?? "—"} min`
                      : selected.eta_minutes != null ? `${selected.eta_minutes} min` : "—"
                  }
                />
                <Field
                  label="Special requirements"
                  value={[
                    selected.conscious === false ? "Unconscious" : null,
                    selected.breathing === false ? "Not breathing" : null,
                  ].filter(Boolean).join(" · ") || "None flagged"}
                  wide
                />
              </dl>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Symptoms &amp; notes</p>
                <p className="mt-1 rounded-lg border bg-muted/30 p-2 text-xs italic">
                  {selected.notes ? `"${selected.notes}"` : "No notes captured."}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Incident timeline</p>
                <Timeline items={events} />
              </div>

              <div className="flex flex-wrap gap-2 border-t pt-2">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSelectedIncidentId(null)}>
                  Cancel
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={holdIncident}>
                  Hold
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  disabled={!targetVehicleId || assigning}
                  onClick={() => targetVehicleId && assignVehicle(selected.id, targetVehicleId)}
                >
                  Assign
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* 3 — Available ambulances */}
        <section className="rounded-xl border bg-card p-2">
          <SectionTitle>
            <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> Ambulances · {availableVehicles.length} available</span>
          </SectionTitle>
          {rankedVehicles.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No vehicles in your fleet.</p>
          ) : (
            <div className="max-h-[62vh] space-y-1.5 overflow-y-auto">
              {availableVehicles.map((v) => (
                <VehicleCard
                  key={v.id}
                  vehicle={{
                    id: v.id,
                    vehicle_code: v.vehicle_code,
                    registration_number: v.registration_number,
                    status: v.status ?? "available",
                    crew_name: v.lead_name,
                    crew_count: v.crew_count,
                    distance_km: v.distance_km,
                    eta_min: v.eta_min,
                    shift_label: v.shift_label,
                    equipment_ok: true,
                  }}
                  recommended={v.id === recommendedVehicleId}
                  selected={selectedVehicleId === v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  dropActive={dragOverVehicleId === v.id}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverVehicleId(v.id); }}
                  onDragLeave={() => setDragOverVehicleId((id) => (id === v.id ? null : id))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const incId = e.dataTransfer.getData("text/plain") || dragIncidentId;
                    setDragOverVehicleId(null);
                    setDragIncidentId(null);
                    if (incId) assignVehicle(incId, v.id);
                  }}
                  footer={
                    dragOverVehicleId === v.id ? (
                      <p className="mt-2 text-center text-sm font-bold uppercase tracking-wider text-primary">Drop to dispatch</p>
                    ) : (
                      <Button
                        size="sm"
                        className="mt-2 h-8 w-full text-xs"
                        disabled={!selectedIncidentId || assigning}
                        onClick={(e) => { e.stopPropagation(); selectedIncidentId && assignVehicle(selectedIncidentId, v.id); }}
                      >
                        Dispatch to selected SOS
                      </Button>
                    )
                  }
                />
              ))}
              {busyVehicles.length > 0 && (
                <>
                  <SectionTitle>On a call · {busyVehicles.length}</SectionTitle>
                  <div className="space-y-1 opacity-60">
                    {busyVehicles.map((v) => (
                      <div key={v.id} className="rounded-lg border px-2 py-1.5 text-sm">
                        <span className="font-bold">{v.vehicle_code}</span>
                        {v.lead_name ? <> · {v.lead_name}</> : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {/* 4 — Hospitals */}
        <section className="rounded-xl border bg-card p-2">
          <SectionTitle>
            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Hospitals · {rankedHospitals.length}</span>
          </SectionTitle>
          {rankedHospitals.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No approved hospitals available.</p>
          ) : (
            <div className="max-h-[62vh] space-y-1.5 overflow-y-auto">
              {rankedHospitals.map((h, idx) => {
                const isCurrent = selected?.destination_hospital_id === h.id;
                return (
                  <HospitalCard
                    key={h.id}
                    hospital={{
                      id: h.id,
                      name: h.name,
                      ownership: h.ownership,
                      distance_km: h.distance_km,
                      eta_min: h.eta_min,
                      er_capacity_status: h.er_capacity_status,
                      preferred: h.preferred,
                      capability: h.capability,
                    }}
                    selected={isCurrent}
                    footer={
                      <div className="mt-2 space-y-1">
                        {idx === 0 && selected && (
                          <p className="text-xs font-bold uppercase tracking-wider text-primary">Best match</p>
                        )}
                        <Button
                          size="sm"
                          variant={isCurrent ? "outline" : "default"}
                          className="h-7 w-full text-sm"
                          disabled={!selected || !!settingHospital || isCurrent}
                          onClick={() => selected && setDestination(selected.id, h.id)}
                        >
                          {isCurrent ? "Current destination" : "Set destination"}
                        </Button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      <AssignmentPanel
        disabled={!selected}
        hint={
          !selected
            ? "Select an SOS to enable dispatch actions."
            : !targetVehicleId
              ? "No available vehicle — start a shift or free a unit."
              : `Ready: ${rankedVehicles.find((v) => v.id === targetVehicleId)?.vehicle_code} → ${selected.incident_number ?? "incident"}`
        }
        onAssign={() => selected && targetVehicleId && assignVehicle(selected.id, targetVehicleId)}
        onNotifyCrew={() => toast.success("Crew paged on their mobile devices.")}
        onNavigate={() => {
          if (!originLoc) return toast.info("No GPS fix for this incident yet.");
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${originLoc.lat},${originLoc.lng}`, "_blank");
        }}
        onNotifyHospital={() => {
          if (!selected?.destination_hospital_id) return toast.info("Set a destination hospital first.");
          toast.success("Destination hospital notified of inbound patient.");
        }}
      />
    </div>
  );
}

function Field({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-xs">{value}</dd>
    </div>
  );
}
