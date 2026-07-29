import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type IncidentLite = {
  id: string;
  incident_number: string | null;
  status: string;
  severity: string | null;
  created_at: string;
  accepted_at: string | null;
  en_route_at: string | null;
  arrived_at: string | null;
  patient_collected_at: string | null;
  at_hospital_at: string | null;
  completed_at: string | null;
  assigned_provider_id: string | null;
  assigned_ambulance_id: string | null;
  destination_hospital_id: string | null;
};

export type VehicleLite = {
  id: string;
  vehicle_code: string | null;
  registration_number: string | null;
  status: string;
  crew: string[];
  lastPingAt: string | null;
  incidentId: string | null;
};

export type HospitalLite = {
  id: string;
  name: string;
  inbound: number;
  erBedsAvailable: number | null;
  erStatus: string | null;
  acceptingPatients: boolean | null;
};

export type ErActivityEvent = {
  id: string;
  kind: "received" | "accepted" | "en_route" | "collected" | "handover" | "completed";
  title: string;
  detail: string;
  at: string;
};

export type ErOpsStats = {
  incidents: IncidentLite[];
  vehicles: VehicleLite[];
  hospitals: HospitalLite[];
  activity: ErActivityEvent[];
  active: { count: number; unassigned: number };
  response: { avgMinutes: number; sample: number };
  fleet: { available: number; total: number; pct: number };
  crew: { onShift: number; vehiclesWithoutCrew: number };
  loading: boolean;
  lastUpdated: number;
  refresh: () => void;
};

const OPEN_STATUSES = ["open", "reopened", "pending"];
const ACTIVE_STATUSES = [
  "assigned",
  "en_route",
  "arrived",
  "patient_collected",
  "en_route_to_hospital",
  "at_hospital",
];

const AVAILABLE_VEHICLE_STATUSES = ["available", "idle", "on_standby", "active"];

/** Live operational stats for the ER (ambulance provider) ops dashboard. */
export function useErOpsStats(providerId: string | null, refreshMs = 10_000): ErOpsStats {
  const [incidents, setIncidents] = useState<IncidentLite[]>([]);
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [hospitals, setHospitals] = useState<HospitalLite[]>([]);
  const [activity, setActivity] = useState<ErActivityEvent[]>([]);
  const [crewOnShift, setCrewOnShift] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const busy = useRef(false);
  const responseRef = useRef<number[]>([]);


  const load = useCallback(async () => {
    if (!providerId || busy.current) return;
    busy.current = true;
    const dayAgo = new Date(Date.now() - 864e5).toISOString();

    const cols =
      "id, incident_number, status, severity, created_at, accepted_at, en_route_at, arrived_at, patient_collected_at, at_hospital_at, completed_at, assigned_provider_id, assigned_ambulance_id, destination_hospital_id";

    const [mineRes, openRes, recentRes, vehRes, shiftRes, affRes] = await Promise.all([
      supabase
        .from("holarchelp_incidents")
        .select(cols)
        .eq("assigned_provider_id", providerId)
        .in("status", ACTIVE_STATUSES)
        .order("created_at", { ascending: true })
        .limit(40),
      supabase
        .from("holarchelp_incidents")
        .select(cols)
        .is("assigned_provider_id", null)
        .in("status", OPEN_STATUSES)
        .order("created_at", { ascending: true })
        .limit(20),
      supabase
        .from("holarchelp_incidents")
        .select(cols)
        .eq("assigned_provider_id", providerId)
        .gte("created_at", dayAgo)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("ambulances")
        .select("id, vehicle_code, registration_number, status")
        .eq("provider_id", providerId)
        .order("vehicle_code"),
      supabase
        .from("paramedic_shifts")
        .select("id, user_id, ambulance_id, status, started_at, ended_at, current_incident_id")
        .eq("provider_id", providerId)
        .is("ended_at", null),
      supabase
        .from("ambulance_hospital_affiliations")
        .select("id, hospital_id, hospital_name_snapshot, status")
        .eq("ambulance_provider_id", providerId)
        .eq("status", "approved"),
    ]);

    const mine = (mineRes.data ?? []) as IncidentLite[];
    const open = (openRes.data ?? []) as IncidentLite[];
    const recent = (recentRes.data ?? []) as IncidentLite[];
    const merged = new Map<string, IncidentLite>();
    for (const i of [...open, ...mine]) merged.set(i.id, i);
    const board = Array.from(merged.values());
    setIncidents(board);

    const shifts = (shiftRes.data ?? []) as {
      id: string;
      user_id: string;
      ambulance_id: string | null;
      status: string;
      current_incident_id: string | null;
    }[];
    setCrewOnShift(shifts.length);

    // Crew names for paramedics currently on shift
    const userIds = Array.from(new Set(shifts.map((s) => s.user_id).filter(Boolean)));
    const nameByUser = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      for (const p of ((profs ?? []) as { id: string; full_name: string | null }[])) {
        nameByUser.set(p.id, p.full_name || "Crew member");
      }
    }

    const vehRows = (vehRes.data ?? []) as {
      id: string;
      vehicle_code: string | null;
      registration_number: string | null;
      status: string;
    }[];

    const pingByVehicle = new Map<string, string>();
    if (vehRows.length) {
      const { data: pings } = await supabase
        .from("holarchelp_telematics_pings")
        .select("vehicle_id, recorded_at")
        .eq("provider_id", providerId)
        .order("recorded_at", { ascending: false })
        .limit(200);
      for (const p of ((pings ?? []) as { vehicle_id: string | null; recorded_at: string }[])) {
        if (p.vehicle_id && !pingByVehicle.has(p.vehicle_id)) pingByVehicle.set(p.vehicle_id, p.recorded_at);
      }
    }

    const incidentByVehicle = new Map<string, string>();
    for (const i of mine) if (i.assigned_ambulance_id) incidentByVehicle.set(i.assigned_ambulance_id, i.id);

    setVehicles(
      vehRows.map((v) => ({
        ...v,
        crew: shifts.filter((s) => s.ambulance_id === v.id).map((s) => nameByUser.get(s.user_id) ?? "Crew"),
        lastPingAt: pingByVehicle.get(v.id) ?? null,
        incidentId: incidentByVehicle.get(v.id) ?? null,
      })),
    );

    // Destination hospitals with inbound counts
    const affs = (affRes.data ?? []) as {
      id: string;
      hospital_id: string;
      hospital_name_snapshot: string | null;
    }[];
    const inbound = new Map<string, number>();
    for (const i of mine) {
      if (!i.destination_hospital_id) continue;
      inbound.set(i.destination_hospital_id, (inbound.get(i.destination_hospital_id) ?? 0) + 1);
    }
    if (affs.length) {
      const { data: hosp } = await supabase
        .from("holarchelp_hospitals")
        .select("id, name, er_beds_available, er_capacity_status, accepting_patients")
        .in("id", affs.map((a) => a.hospital_id));
      const byId = new Map(
        ((hosp ?? []) as {
          id: string;
          name: string;
          er_beds_available: number | null;
          er_capacity_status: string | null;
          accepting_patients: boolean | null;
        }[]).map((h) => [h.id, h] as const),
      );
      setHospitals(
        affs.map((a) => {
          const h = byId.get(a.hospital_id);
          return {
            id: a.hospital_id,
            name: h?.name || a.hospital_name_snapshot || "Hospital",
            inbound: inbound.get(a.hospital_id) ?? 0,
            erBedsAvailable: h?.er_beds_available ?? null,
            erStatus: h?.er_capacity_status ?? null,
            acceptingPatients: h?.accepting_patients ?? null,
          };
        }),
      );
    } else {
      setHospitals([]);
    }

    // Recent dispatch activity
    const events: ErActivityEvent[] = [];
    const label = (i: IncidentLite) => i.incident_number ?? `#${i.id.slice(0, 8)}`;
    for (const i of recent) {
      const sev = i.severity ?? "unknown";
      if (i.created_at)
        events.push({ id: `${i.id}-r`, kind: "received", title: `SOS received — ${label(i)}`, detail: sev, at: i.created_at });
      if (i.accepted_at)
        events.push({ id: `${i.id}-a`, kind: "accepted", title: `Accepted — ${label(i)}`, detail: "Crew assigned", at: i.accepted_at });
      if (i.en_route_at)
        events.push({ id: `${i.id}-e`, kind: "en_route", title: `En route — ${label(i)}`, detail: "Responding to scene", at: i.en_route_at });
      if (i.patient_collected_at)
        events.push({ id: `${i.id}-c`, kind: "collected", title: `Patient collected — ${label(i)}`, detail: "Transporting", at: i.patient_collected_at });
      if (i.at_hospital_at)
        events.push({ id: `${i.id}-h`, kind: "handover", title: `Handover at hospital — ${label(i)}`, detail: "Patient delivered", at: i.at_hospital_at });
      if (i.completed_at)
        events.push({ id: `${i.id}-x`, kind: "completed", title: `Incident closed — ${label(i)}`, detail: "Completed", at: i.completed_at });
    }
    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    setActivity(events);

    // Response time (creation → arrival) over the last 24h
    const durations = recent
      .filter((i) => i.arrived_at)
      .map((i) => (new Date(i.arrived_at as string).getTime() - new Date(i.created_at).getTime()) / 60000)
      .filter((m) => m >= 0 && m < 24 * 60);
    responseRef.current = durations;

    setLoading(false);
    setLastUpdated(Date.now());
    busy.current = false;
  }, [providerId]);

  const responseRef = useRef<number[]>([]);

  useEffect(() => {
    load();
    if (!providerId) return;
    const id = window.setInterval(load, refreshMs);
    return () => window.clearInterval(id);
  }, [providerId, load, refreshMs]);

  const activeIncidents = incidents.filter((i) => ACTIVE_STATUSES.includes(i.status));
  const unassigned = incidents.filter((i) => !i.assigned_provider_id).length;

  const availableVehicles = vehicles.filter((v) =>
    AVAILABLE_VEHICLE_STATUSES.includes((v.status || "").toLowerCase()) && !v.incidentId,
  ).length;

  const durations = responseRef.current;
  const avgMinutes = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  return {
    incidents,
    vehicles,
    hospitals,
    activity,
    active: { count: activeIncidents.length, unassigned },
    response: { avgMinutes, sample: durations.length },
    fleet: {
      available: availableVehicles,
      total: vehicles.length,
      pct: vehicles.length ? Math.round((availableVehicles / vehicles.length) * 100) : 0,
    },
    crew: {
      onShift: crewOnShift,
      vehiclesWithoutCrew: vehicles.filter((v) => v.crew.length === 0).length,
    },
    loading,
    lastUpdated,
    refresh: load,
  };
}
