import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Radio, Siren, Truck, MapPin, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { IncidentNumberBadge } from "@/components/IncidentNumberBadge";
import { toastError } from "@/lib/userMessage";

type Incident = {
  id: string;
  incident_number?: string | null;
  severity: string | null;
  status: string;
  created_at: string;
  notes?: string | null;
  incident_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  assigned_provider_id?: string | null;
  assigned_ambulance_id?: string | null;
};

type Vehicle = {
  id: string;
  vehicle_code: string;
  registration_number: string | null;
  status: string | null;
  lead_name?: string | null;
  shift_id?: string | null;
};

type Hospital = {
  id: string;
  name: string;
  ownership: string | null;
  latitude: number | null;
  longitude: number | null;
  er_capacity_status?: string | null;
  distance_km?: number | null;
};

const distKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const sevOrder: Record<string, number> = { critical: 0, high: 1, moderate: 2 };

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
};

export default function DispatcherConsoleScreen() {
  const { providerId } = useProviderAccess();
  const [onDuty, setOnDuty] = useState(false);
  const [togglingDuty, setTogglingDuty] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentLocs, setIncidentLocs] = useState<Record<string, { lat: number; lng: number }>>({});
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [destByIncident, setDestByIncident] = useState<Record<string, string | null>>({});
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [dragIncidentId, setDragIncidentId] = useState<string | null>(null);
  const [dragOverVehicleId, setDragOverVehicleId] = useState<string | null>(null);
  const [settingHospital, setSettingHospital] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    if (!providerId) return;
    const [{ data: prov }, { data: offers }, { data: assigned }, { data: vehs }, { data: shifts }, { data: hosps }] = await Promise.all([
      supabase.from("holarchelp_ambulance_providers" as any).select("dispatcher_on_duty").eq("id", providerId).maybeSingle(),
      supabase
        .from("holarchelp_incident_offers" as any)
        .select("incident_id, holarchelp_incidents!inner(id, incident_number, severity, status, created_at, notes, incident_type, assigned_provider_id, assigned_ambulance_id, destination_hospital_id)")
        .eq("provider_id", providerId)
        .eq("response", "pending"),
      supabase
        .from("holarchelp_incidents" as any)
        .select("id, incident_number, severity, status, created_at, notes, incident_type, assigned_provider_id, assigned_ambulance_id, destination_hospital_id")
        .eq("assigned_provider_id", providerId)
        .in("status", ["assigned","en_route","arrived","patient_collected","en_route_to_hospital","at_hospital"]),
      supabase
        .from("ambulances" as any)
        .select("id, vehicle_code, registration_number, status")
        .eq("provider_id", providerId)
        .neq("status", "out_of_service")
        .order("vehicle_code"),
      supabase
        .from("paramedic_shifts" as any)
        .select("id, ambulance_id, user_id, status, profiles:user_id(full_name)")
        .eq("provider_id", providerId)
        .is("ended_at", null),
      supabase
        .from("holarchelp_hospitals" as any)
        .select("id, name, ownership, latitude, longitude, er_capacity_status, status, subscription_status, accepting_patients")
        .eq("status", "approved")
        .eq("accepting_patients", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null),
    ]);

    setOnDuty(!!(prov as any)?.dispatcher_on_duty);

    const openIncs = ((offers as any[]) ?? [])
      .map((o) => o.holarchelp_incidents)
      .filter((i: any) => i && ["open", "reopened"].includes(i.status)) as Incident[];
    const assignedIncs = (((assigned as any) ?? []) as Incident[]);
    const merged = new Map<string, Incident>();
    [...openIncs, ...assignedIncs].forEach((i) => merged.set(i.id, i));
    const list = [...merged.values()].sort((a, b) => (sevOrder[a.severity ?? ""] ?? 9) - (sevOrder[b.severity ?? ""] ?? 9));
    setIncidents(list);
    setDestByIncident(
      Object.fromEntries(list.map((i: any) => [i.id, i.destination_hospital_id ?? null])),
    );

    // Fetch latest location per incident (for hospital distance sort)
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
        if (l.latitude != null && l.longitude != null)
          map[l.incident_id] = { lat: l.latitude, lng: l.longitude };
      });
      setIncidentLocs(map);
    } else {
      setIncidentLocs({});
    }

    const shiftMap = new Map<string, any>();
    ((shifts as any[]) ?? []).forEach((s) => {
      if (s.ambulance_id) shiftMap.set(s.ambulance_id, s);
    });
    setVehicles(
      (((vehs as any[]) ?? []) as any[]).map((v) => {
        const s = shiftMap.get(v.id);
        return {
          id: v.id,
          vehicle_code: v.vehicle_code,
          registration_number: v.registration_number,
          status: v.status,
          lead_name: s?.profiles?.full_name ?? null,
          shift_id: s?.id ?? null,
        };
      }),
    );

    setHospitals(
      (((hosps as any[]) ?? []) as Hospital[]).map((h) => ({
        id: h.id, name: h.name, ownership: h.ownership,
        latitude: h.latitude, longitude: h.longitude,
        er_capacity_status: (h as any).er_capacity_status,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    if (!providerId) return;
    const ch = supabase.channel(`dispatch-${providerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incident_offers" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "ambulances", filter: `provider_id=eq.${providerId}` }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "paramedic_shifts", filter: `provider_id=eq.${providerId}` }, loadAll)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "holarchelp_ambulance_providers", filter: `id=eq.${providerId}` }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_hospitals" }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const setDestination = async (incidentId: string, hospitalId: string) => {
    setSettingHospital(hospitalId);
    const { error } = await supabase.rpc("holarchelp_set_destination_hospital" as any, {
      _incident_id: incidentId, _hospital_id: hospitalId,
    });
    if (error) toastError(error, "We couldn't set that destination hospital.");
    else { toast.success("Destination hospital set."); loadAll(); }
    setSettingHospital(null);
  };

  const toggleDuty = async (next: boolean) => {
    if (!providerId) return;
    setTogglingDuty(true);
    const { error } = await supabase.rpc("holarchelp_set_dispatcher_on_duty" as any, {
      _provider_id: providerId, _on: next,
    });
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
      setSelectedIncidentId((cur) => (cur === incidentId ? null : cur));
      loadAll();
    }
    setAssigning(false);
  };

  const selected = incidents.find((i) => i.id === selectedIncidentId) ?? null;
  const available = vehicles.filter((v) => (v.status ?? "available").toLowerCase() === "available");
  const busy = vehicles.filter((v) => (v.status ?? "").toLowerCase() === "assigned");

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Emergency Response Dispatch</p>
          <h1 className="text-2xl font-extrabold mt-1 flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" /> Dispatcher Console
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Drag an SOS onto an available vehicle to dispatch — or select an incident and tap Assign.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold">I am on duty</span>
          <Switch checked={onDuty} disabled={togglingDuty} onCheckedChange={toggleDuty} />
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_1.1fr_1.2fr]">
        {/* Incidents */}
        <section className="rounded-xl border bg-card p-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 py-1">Open SOS · {incidents.length}</h2>
          {incidents.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No SOS offered to your fleet.</p>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {incidents.map((i) => {
                const isMine = i.assigned_provider_id === providerId;
                const hasVehicle = !!i.assigned_ambulance_id;
                const draggable = !hasVehicle; // both unassigned offers and assigned-but-no-vehicle are draggable
                return (
                  <button
                    key={i.id}
                    draggable={draggable}
                    onDragStart={(e) => {
                      if (!draggable) return;
                      setDragIncidentId(i.id);
                      e.dataTransfer.setData("text/plain", i.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => { setDragIncidentId(null); setDragOverVehicleId(null); }}
                    onClick={() => setSelectedIncidentId(i.id)}
                    className={`w-full text-left rounded-lg border p-2 transition ${
                      draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                    } ${selectedIncidentId === i.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"} ${
                      dragIncidentId === i.id ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <IncidentNumberBadge number={i.incident_number ?? `INC-${i.id.slice(0, 8)}`} size="sm" showCopy={false} label="Ref" />
                      <span className={`text-xs font-bold uppercase ${
                        i.severity === "critical" ? "text-destructive" : i.severity === "high" ? "text-warning" : "text-muted-foreground"
                      }`}>
                        <Siren className="inline h-3 w-3 mr-0.5" />{i.severity ?? "high"}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 truncate">{i.incident_type ?? "Emergency"}</p>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {ago(i.created_at)} ago
                      </p>
                      {isMine && (
                        <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-xs font-bold uppercase text-primary">
                          {hasVehicle ? "Rolling" : "Assigned · needs vehicle"}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Available vehicles */}
        <section className="rounded-xl border bg-card p-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 py-1">
            Available vehicles · {available.length}
          </h2>
          {available.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No vehicles available in your fleet.</p>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {available.map((v) => {
                const isOver = dragOverVehicleId === v.id;
                return (
                  <div
                    key={v.id}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverVehicleId(v.id); }}
                    onDragLeave={() => setDragOverVehicleId((id) => (id === v.id ? null : id))}
                    onDrop={(e) => {
                      e.preventDefault();
                      const incId = e.dataTransfer.getData("text/plain") || dragIncidentId;
                      setDragOverVehicleId(null);
                      setDragIncidentId(null);
                      if (incId) assignVehicle(incId, v.id);
                    }}
                    className={`rounded-lg border p-2 transition ${
                      isOver ? "border-primary border-dashed bg-primary/10 ring-2 ring-primary/40" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5 text-primary" />
                        {v.vehicle_code}
                      </span>
                      <span className="text-xs uppercase font-bold text-success">Available</span>
                    </div>
                    {v.registration_number && <p className="text-xs text-muted-foreground mt-0.5">{v.registration_number}</p>}
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Lead: {v.lead_name ?? <span className="italic">no shift open</span>}
                    </p>
                    {isOver ? (
                      <p className="mt-2 text-center text-sm font-bold uppercase tracking-wider text-primary">
                        Drop to dispatch
                      </p>
                    ) : (
                      <Button
                        size="sm"
                        className="mt-2 w-full h-8 text-xs"
                        disabled={!selectedIncidentId || assigning}
                        onClick={() => selectedIncidentId && assignVehicle(selectedIncidentId, v.id)}
                      >
                        Assign to selected SOS
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {busy.length > 0 && (
            <>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 py-1 mt-2">On a call · {busy.length}</h2>
              <div className="space-y-1 opacity-60">
                {busy.map((v) => (
                  <div key={v.id} className="rounded-lg border px-2 py-1.5 text-sm">
                    <span className="font-bold">{v.vehicle_code}</span>
                    {v.lead_name ? <> · {v.lead_name}</> : null}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Details */}
        <section className="rounded-xl border bg-card p-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Selected incident</h2>
          {!selected ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">Pick an SOS on the left, then drag it onto a vehicle or tap Assign.</p>
          ) : (
            <div className="mt-2 space-y-2">
              <IncidentNumberBadge number={selected.incident_number ?? `INC-${selected.id.slice(0, 8)}`} size="md" label="Reference #" />
              <p className="text-sm">{selected.incident_type ?? "Emergency"} · <span className="uppercase font-bold">{selected.severity}</span></p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Triggered {ago(selected.created_at)} ago
              </p>
              {incidentLocs[selected.id] && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {incidentLocs[selected.id].lat.toFixed(4)}, {incidentLocs[selected.id].lng.toFixed(4)}
                </p>
              )}
              {selected.notes && (
                <p className="rounded-lg border bg-muted/30 p-2 text-xs italic">"{selected.notes}"</p>
              )}
              <p className="text-sm text-muted-foreground pt-2 border-t">
                Drag this card onto a vehicle, or tap "Assign to selected SOS".
              </p>
            </div>
          )}
        </section>

        {/* Destination hospitals */}
        <section className="rounded-xl border bg-card p-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 py-1 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Destination hospitals · {hospitals.length}
          </h2>
          {hospitals.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No approved hospitals available.</p>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {(() => {
                const originLoc = selected ? incidentLocs[selected.id] : null;
                const withDist = hospitals.map((h) => ({
                  ...h,
                  distance_km: originLoc && h.latitude != null && h.longitude != null
                    ? distKm(originLoc, { lat: h.latitude, lng: h.longitude })
                    : null,
                }));
                withDist.sort((a, b) => {
                  if (a.distance_km != null && b.distance_km != null) return a.distance_km - b.distance_km;
                  if (a.distance_km != null) return -1;
                  if (b.distance_km != null) return 1;
                  return a.name.localeCompare(b.name);
                });
                const currentDest = selected ? destByIncident[selected.id] : null;
                return withDist.map((h) => {
                  const isCurrent = currentDest === h.id;
                  return (
                    <div
                      key={h.id}
                      className={`rounded-lg border p-2 transition ${
                        isCurrent ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{h.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="uppercase">{h.ownership ?? "private"}</span>
                            {h.distance_km != null && <> · {h.distance_km.toFixed(1)} km</>}
                          </p>
                        </div>
                        {h.er_capacity_status && (
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold uppercase ${
                            h.er_capacity_status === "green" ? "bg-success/10 text-success"
                            : h.er_capacity_status === "amber" ? "bg-warning/10 text-warning"
                            : "bg-destructive/10 text-destructive"
                          }`}>
                            {h.er_capacity_status}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={isCurrent ? "outline" : "default"}
                        className="mt-2 w-full h-7 text-sm"
                        disabled={!selected || !!settingHospital || (isCurrent)}
                        onClick={() => selected && setDestination(selected.id, h.id)}
                      >
                        {isCurrent ? "Current destination" : selected ? "Set destination" : "Select an SOS first"}
                      </Button>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
