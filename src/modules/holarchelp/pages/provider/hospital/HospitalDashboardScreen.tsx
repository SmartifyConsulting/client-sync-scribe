import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useHospitalWards } from "../../../hooks/useHospitalWards";
import { useHospitalInpatients } from "../../../hooks/useHospitalInpatients";
import { useHospitalShifts } from "../../../hooks/useHospitalShifts";
import { usePatientActivityLog } from "../../../hooks/usePatientActivityLog";
import { ActivityTimeline } from "../../../components/ActivityTimeline";
import { wardBarColor } from "../../../lib/hospitalWards";
import { Activity, Ambulance, BedDouble, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Vehicle = { id: string; vehicle_code: string | null; registration_number: string | null; status: string | null };

const VEHICLE_TONE: Record<string, string> = {
  available: "border-success/40 bg-success/10 text-success",
  assigned: "border-warning/40 bg-warning/15 text-warning",
  dispatched: "border-warning/40 bg-warning/15 text-warning",
  maintenance: "border-destructive/40 bg-destructive/10 text-destructive",
  offline: "border-border bg-muted text-muted-foreground",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums text-foreground">
        {value}
        {sub ? <span className="ml-1.5 text-sm font-semibold text-muted-foreground">{sub}</span> : null}
      </p>
    </div>
  );
}

function Panel({ icon: Icon, title, children, action }: {
  icon: typeof BedDouble; title: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">{title}</h2>
        </span>
        {action}
      </header>
      {children}
    </section>
  );
}

export default function HospitalDashboardScreen() {
  const { providerId } = useProviderAccess();
  const { wards, totals } = useHospitalWards(providerId);
  const { inpatients } = useHospitalInpatients(providerId);
  const { onShiftNow } = useHospitalShifts(providerId);
  const { logs } = usePatientActivityLog({ hospitalId: providerId, limit: 12 });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (!providerId) return;
    let active = true;
    (async () => {
      const { data: affiliations } = await supabase
        .from("ambulance_hospital_affiliations")
        .select("ambulance_provider_id")
        .eq("hospital_id", providerId);
      const providerIds = ((affiliations ?? []) as { ambulance_provider_id: string }[])
        .map((a) => a.ambulance_provider_id)
        .filter(Boolean);
      if (!providerIds.length) { if (active) setVehicles([]); return; }
      const { data } = await supabase
        .from("ambulances")
        .select("id, vehicle_code, registration_number, status")
        .in("provider_id", providerIds)
        .order("vehicle_code");
      if (active) setVehicles((data ?? []) as Vehicle[]);
    })();
    return () => { active = false; };
  }, [providerId]);

  const admitted = inpatients.filter((a) => a.status === "admitted");
  const occupancyPct = totals.capacity ? Math.round((totals.occupied / totals.capacity) * 100) : 0;
  const availableVehicles = vehicles.filter((v) => (v.status ?? "") === "available").length;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hospital operations</p>
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bed occupancy" value={`${occupancyPct}%`} />
        <StatCard label="Admitted patients" value={admitted.length} />
        <StatCard label="Ambulances available" value={availableVehicles} sub={`of ${vehicles.length}`} />
        <StatCard label="Staff on shift now" value={onShiftNow.length} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          icon={BedDouble}
          title="Ward occupancy"
          action={<Link to="/provider/hospital/wards" className="text-xs font-semibold text-primary hover:underline">Manage wards</Link>}
        >
          <div className="space-y-3 p-4">
            {wards.map((ward, i) => {
              const pct = ward.bed_capacity ? Math.min(100, (ward.occupied / ward.bed_capacity) * 100) : 0;
              return (
                <div key={ward.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">{ward.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {ward.occupied} / {ward.bed_capacity}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full transition-all", wardBarColor(i))} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {!wards.length && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No wards yet — <Link to="/provider/hospital/wards" className="font-semibold text-primary hover:underline">add your first ward</Link>.
              </p>
            )}
          </div>
        </Panel>

        <Panel icon={Ambulance} title="Ambulance status">
          <ul className="divide-y">
            {vehicles.map((v) => {
              const status = v.status ?? "offline";
              return (
                <li key={v.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm font-semibold">{v.vehicle_code || v.registration_number || "Vehicle"}</span>
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold capitalize", VEHICLE_TONE[status] ?? VEHICLE_TONE.offline)}>
                    {status.replace(/_/g, " ")}
                  </span>
                </li>
              );
            })}
            {!vehicles.length && (
              <li className="px-4 py-6 text-center text-xs text-muted-foreground">No affiliated vehicles</li>
            )}
          </ul>
        </Panel>
      </div>

      <Panel
        icon={Activity}
        title="Recent patient activity"
        action={<Link to="/provider/hospital/admissions" className="text-xs font-semibold text-primary hover:underline">View admissions</Link>}
      >
        <ActivityTimeline logs={logs} compact emptyLabel="No patient touchpoints logged yet" />
      </Panel>

      <Panel
        icon={Users}
        title="On shift now"
        action={<Link to="/provider/hospital/shifts" className="text-xs font-semibold text-primary hover:underline">Shift schedule</Link>}
      >
        <ul className="divide-y">
          {onShiftNow.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="font-semibold">{s.staff_name}</span>
              <span className="text-xs capitalize text-muted-foreground">
                {s.staff_role} · {s.shift_type.replace(/_/g, "-")} · {wards.find((w) => w.id === s.ward_id)?.name ?? "Unassigned"}
              </span>
            </li>
          ))}
          {!onShiftNow.length && (
            <li className="px-4 py-6 text-center text-xs text-muted-foreground">Nobody is clocked in right now</li>
          )}
        </ul>
      </Panel>
    </div>
  );
}
