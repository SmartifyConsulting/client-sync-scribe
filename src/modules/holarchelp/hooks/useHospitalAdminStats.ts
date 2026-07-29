import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminWard = {
  id: string;
  name: string;
  ward_type: string;
  bed_capacity: number;
  beds: number;
  occupied: number;
};

export type AdmissionLite = {
  id: string;
  ward_id: string | null;
  patient_id: string | null;
  patient_name: string;
  status: string;
  admitted_at: string;
  created_at: string;
  reason: string | null;
};

export type ShiftLite = {
  id: string;
  ward_id: string | null;
  staff_name: string;
  staff_role: string;
  status: string;
  clocked_in_at: string | null;
  clocked_out_at: string | null;
  starts_at: string;
  ends_at: string;
};

export type ErIncidentLite = {
  id: string;
  incident_number: string | null;
  status: string;
  severity: string | null;
  triage_priority: string | null;
  created_at: string;
};

export type ActivityEvent = {
  id: string;
  kind: "admission" | "discharge" | "prescription" | "shift" | "incident";
  title: string;
  detail: string;
  at: string;
  ward_id: string | null;
};

export type HospitalAdminStats = {
  wards: AdminWard[];
  admissions: AdmissionLite[];
  shifts: ShiftLite[];
  erQueue: ErIncidentLite[];
  activity: ActivityEvent[];
  pendingScripts: number;
  criticalLast24h: number;
  beds: { total: number; occupied: number; pct: number };
  er: { count: number; avgWaitMinutes: number };
  discharge: { total: number; overdue: number };
  staff: { onDuty: number; rostered: number; sickLeave: number };
  loading: boolean;
  lastUpdated: number;
  refresh: () => void;
};


const ER_OPEN_STATUSES = [
  "pending",
  "assigned",
  "en_route",
  "arrived",
  "patient_collected",
  "en_route_to_hospital",
];

/** Live operational stats for the hospital admin dashboard (auto-refreshing). */
export function useHospitalAdminStats(
  hospitalId: string | null,
  wardId: string | null = null,
  refreshMs = 10_000,
): HospitalAdminStats {
  const [wardRows, setWardRows] = useState<AdminWard[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionLite[]>([]);
  const [shifts, setShifts] = useState<ShiftLite[]>([]);
  const [erQueue, setErQueue] = useState<ErIncidentLite[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  const [pendingScripts, setPendingScripts] = useState(0);
  const [criticalLast24h, setCriticalLast24h] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (!hospitalId || busy.current) return;
    busy.current = true;
    const dayAgo = new Date(Date.now() - 864e5).toISOString();
    const twoHoursAgo = new Date(Date.now() - 2 * 3600e3).toISOString();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [wardRes, admRes, shiftRes, erRes, critRes, dischargedRes, recentIncRes] = await Promise.all([
      supabase
        .from("hospital_wards")
        .select("id, name, ward_type, bed_capacity")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("hospital_inpatient_admissions")
        .select("id, ward_id, patient_id, patient_name, status, admitted_at, created_at, reason")
        .eq("hospital_id", hospitalId)
        .is("discharged_at", null)
        .order("admitted_at", { ascending: false }),
      supabase
        .from("hospital_staff_shifts")
        .select("id, ward_id, staff_name, staff_role, status, clocked_in_at, clocked_out_at, starts_at, ends_at")
        .eq("hospital_id", hospitalId)
        .gte("ends_at", todayStart.toISOString())
        .lte("starts_at", new Date(todayStart.getTime() + 864e5).toISOString()),
      supabase
        .from("holarchelp_incidents")
        .select("id, incident_number, status, severity, triage_priority, created_at")
        .eq("destination_hospital_id", hospitalId)
        .in("status", ER_OPEN_STATUSES)
        .order("created_at", { ascending: true }),
      supabase
        .from("holarchelp_incidents")
        .select("id", { count: "exact", head: true })
        .eq("destination_hospital_id", hospitalId)
        .eq("severity", "critical")
        .gte("created_at", dayAgo),
      supabase
        .from("hospital_inpatient_admissions")
        .select("id, ward_id, patient_name, discharged_at")
        .eq("hospital_id", hospitalId)
        .not("discharged_at", "is", null)
        .order("discharged_at", { ascending: false })
        .limit(5),
      supabase
        .from("holarchelp_incidents")
        .select("id, incident_number, severity, status, created_at")
        .eq("destination_hospital_id", hospitalId)
        .gte("created_at", dayAgo)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);


    const wards = (wardRes.data ?? []) as Omit<AdminWard, "beds" | "occupied">[];
    const wardIds = wards.map((w) => w.id);

    const bedCounts = new Map<string, number>();
    if (wardIds.length) {
      const { data: bedRows } = await supabase
        .from("hospital_beds")
        .select("ward_id")
        .in("ward_id", wardIds);
      for (const b of ((bedRows ?? []) as { ward_id: string }[])) {
        bedCounts.set(b.ward_id, (bedCounts.get(b.ward_id) ?? 0) + 1);
      }
    }

    const adm = (admRes.data ?? []) as AdmissionLite[];
    const occupancy = new Map<string, number>();
    for (const a of adm) {
      if (a.status !== "admitted" || !a.ward_id) continue;
      occupancy.set(a.ward_id, (occupancy.get(a.ward_id) ?? 0) + 1);
    }

    setWardRows(
      wards.map((w) => ({
        ...w,
        beds: bedCounts.get(w.id) || w.bed_capacity || 0,
        occupied: occupancy.get(w.id) ?? 0,
      })),
    );
    setAdmissions(adm);
    setShifts((shiftRes.data ?? []) as ShiftLite[]);
    setErQueue((erRes.data ?? []) as ErIncidentLite[]);
    setCriticalLast24h(critRes.count ?? 0);

    // Pharmacy queue: scripts raised in the last 2 hours for currently-admitted patients.
    const patientIds = Array.from(new Set(adm.map((a) => a.patient_id).filter(Boolean))) as string[];
    if (patientIds.length) {
      const { count } = await supabase
        .from("prescriptions")
        .select("id", { count: "exact", head: true })
        .in("patient_id", patientIds)
        .eq("status", "active")
        .gte("created_at", twoHoursAgo);
      setPendingScripts(count ?? 0);
    } else {
      setPendingScripts(0);
    }

    setLoading(false);
    setLastUpdated(Date.now());
    busy.current = false;
  }, [hospitalId]);

  useEffect(() => {
    load();
    if (!hospitalId) return;
    const id = window.setInterval(load, refreshMs);
    return () => window.clearInterval(id);
  }, [hospitalId, load, refreshMs]);

  const wards = wardId ? wardRows.filter((w) => w.id === wardId) : wardRows;
  const scopedAdmissions = wardId ? admissions.filter((a) => a.ward_id === wardId) : admissions;
  const scopedShifts = wardId ? shifts.filter((s) => s.ward_id === wardId) : shifts;

  const bedsTotal = wards.reduce((n, w) => n + w.beds, 0);
  const bedsOccupied = wards.reduce((n, w) => n + w.occupied, 0);

  const dischargePending = scopedAdmissions.filter((a) => a.status === "discharge_pending");
  const sixHoursAgo = Date.now() - 6 * 3600e3;

  const onDuty = scopedShifts.filter((s) => !!s.clocked_in_at && !s.clocked_out_at).length;
  const sickLeave = scopedShifts.filter((s) => s.status === "sick_leave").length;

  const waitMinutes = erQueue.map((i) => (Date.now() - new Date(i.created_at).getTime()) / 60000);
  const avgWait = waitMinutes.length
    ? Math.round(waitMinutes.reduce((a, b) => a + b, 0) / waitMinutes.length)
    : 0;

  return {
    wards,
    admissions: scopedAdmissions,
    shifts: scopedShifts,
    erQueue,
    pendingScripts,
    criticalLast24h,
    beds: {
      total: bedsTotal,
      occupied: bedsOccupied,
      pct: bedsTotal ? Math.round((bedsOccupied / bedsTotal) * 100) : 0,
    },
    er: { count: erQueue.length, avgWaitMinutes: avgWait },
    discharge: {
      total: dischargePending.length,
      overdue: dischargePending.filter((a) => new Date(a.created_at).getTime() < sixHoursAgo).length,
    },
    staff: { onDuty, rostered: scopedShifts.length, sickLeave },
    loading,
    lastUpdated,
    refresh: load,
  };
}

/** All wards for the hospital (unfiltered) — used to build the ward filter. */
export function useWardOptions(hospitalId: string | null) {
  const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!hospitalId) return;
    let active = true;
    supabase
      .from("hospital_wards")
      .select("id, name")
      .eq("hospital_id", hospitalId)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        if (active) setOptions((data ?? []) as { id: string; name: string }[]);
      });
    return () => { active = false; };
  }, [hospitalId]);
  return options;
}
