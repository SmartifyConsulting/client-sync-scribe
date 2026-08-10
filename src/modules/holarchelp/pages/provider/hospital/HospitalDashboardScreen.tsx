import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useHospitalWards } from "../../../hooks/useHospitalWards";
import { useHospitalInpatients } from "../../../hooks/useHospitalInpatients";
import { useHospitalShifts } from "../../../hooks/useHospitalShifts";
import { usePatientActivityLog } from "../../../hooks/usePatientActivityLog";
import { useHospitalAdminStats, useWardOptions, type ErIncidentLite } from "../../../hooks/useHospitalAdminStats";
import { ActivityTimeline } from "../../../components/ActivityTimeline";
import { wardBarColor } from "../../../lib/hospitalWards";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity,
  AlertTriangle,
  Ambulance,
  BedDouble,
  CheckCircle2,
  ClipboardCheck,
  Pill,
  RefreshCw,
  Siren,
  Timer,
  UserCog,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Vehicle = { id: string; vehicle_code: string | null; registration_number: string | null; status: string | null };

const ALL = "all";

const VEHICLE_TONE: Record<string, string> = {
  available: "border-success/40 bg-success/10 text-success",
  assigned: "border-warning/40 bg-warning/15 text-warning",
  dispatched: "border-warning/40 bg-warning/15 text-warning",
  maintenance: "border-destructive/40 bg-destructive/10 text-destructive",
  offline: "border-border bg-muted text-muted-foreground",
};

const triageTone = {
  critical: "border-destructive/50 bg-destructive/10 text-destructive",
  urgent: "border-warning/50 bg-warning/10 text-warning",
  routine: "border-success/50 bg-success/10 text-success",
} as const;

function triageLevel(i: ErIncidentLite): keyof typeof triageTone {
  const v = (i.triage_priority || i.severity || "").toLowerCase();
  if (v === "critical" || v === "immediate" || v === "red") return "critical";
  if (v === "high" || v === "urgent" || v === "amber" || v === "orange") return "urgent";
  return "routine";
}

function waitedFor(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon?: typeof BedDouble;
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : "text-foreground";
  return (
    <div className="rounded-2xl border-2 border-primary bg-card px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <p className={cn("mt-1 text-3xl font-extrabold tabular-nums", toneClass)}>
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
    <section className="overflow-hidden rounded-2xl border-2 border-primary bg-card">
      <header className="flex items-center justify-between gap-2 bg-primary px-4 py-2.5">
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-white" />
          <h2 className="text-sm font-bold text-white">{title}</h2>
        </span>
        {action}
      </header>
      {children}
    </section>
  );
}

function AlertCard({
  tone,
  icon: Icon,
  title,
  body,
}: {
  tone: "danger" | "warning" | "info" | "success";
  icon: typeof AlertTriangle;
  title: string;
  body: string;
}) {
  const map = {
    danger: "border-destructive/40 bg-destructive/10 text-destructive",
    warning: "border-warning/40 bg-warning/10 text-warning",
    info: "border-primary/30 bg-primary/10 text-primary",
    success: "border-success/40 bg-success/10 text-success",
  } as const;
  return (
    <div className={cn("rounded-xl border px-3 py-2.5", map[tone])}>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{body}</p>
    </div>
  );
}

export default function HospitalDashboardScreen() {
  const { providerId } = useProviderAccess();
  const { wards } = useHospitalWards(providerId);
  const { inpatients } = useHospitalInpatients(providerId);
  const { onShiftNow } = useHospitalShifts(providerId);
  const { logs } = usePatientActivityLog({ hospitalId: providerId, limit: 40 });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const wardOptions = useWardOptions(providerId);
  const [wardFilter, setWardFilter] = useState<string>(ALL);
  const stats = useHospitalAdminStats(providerId, wardFilter === ALL ? null : wardFilter);

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
  const availableVehicles = vehicles.filter((v) => (v.status ?? "") === "available").length;
  const { beds, er, discharge, staff, pendingScripts, criticalLast24h } = stats;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hospital operations</p>
          <h1 className="text-2xl font-extrabold">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={wardFilter} onValueChange={setWardFilter}>
            <SelectTrigger className="h-9 w-52 rounded-xl">
              <SelectValue placeholder="All wards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All wards</SelectItem>
              {wardOptions.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={stats.refresh}>
            <RefreshCw className={cn("h-4 w-4", stats.loading && "animate-spin")} />
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BedDouble}
          label="Bed occupancy"
          value={`${beds.pct}%`}
          sub={`${beds.occupied}/${beds.total}`}
          tone={beds.pct > 85 ? "danger" : beds.pct >= 70 ? "warning" : "default"}
        />
        <StatCard
          icon={Timer}
          label="ER wait time"
          value={`${er.avgWaitMinutes} min`}
          sub={`${er.count} waiting`}
          tone={er.avgWaitMinutes > 30 ? "warning" : "default"}
        />
        <StatCard
          icon={ClipboardCheck}
          label="Ready for discharge"
          value={discharge.total}
          sub={discharge.overdue ? `${discharge.overdue} overdue` : undefined}
          tone={discharge.overdue ? "warning" : "default"}
        />
        <StatCard
          icon={Users}
          label="Staff on duty"
          value={`${staff.onDuty}/${staff.rostered}`}
          sub={`${staff.sickLeave} sick`}
          tone={staff.sickLeave > 2 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BedDouble} label="Admitted patients" value={admitted.length} />
        <StatCard icon={Ambulance} label="Ambulances available" value={availableVehicles} sub={`of ${vehicles.length}`} />
        <StatCard icon={Users} label="Staff on shift now" value={onShiftNow.length} />
        <StatCard
          icon={AlertTriangle}
          label="Critical incidents (24h)"
          value={criticalLast24h}
          tone={criticalLast24h ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          icon={BedDouble}
          title="Ward occupancy"
          action={<Link to="/provider/hospital/ward-board?tab=wards" className="text-xs font-semibold text-white hover:underline">Manage wards</Link>}
        >
          <div className="space-y-3 p-4">
            {wards.map((ward, i) => {
              const pct = ward.bed_capacity ? Math.min(100, (ward.occupied / ward.bed_capacity) * 100) : 0;
              return (
                <div key={ward.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">{ward.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {ward.occupied} / {ward.bed_capacity} · {Math.round(pct)}%
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
                No wards yet — <Link to="/provider/hospital/ward-board?tab=wards" className="font-semibold text-primary hover:underline">add your first ward</Link>.
              </p>
            )}
          </div>
        </Panel>

        <Panel icon={AlertTriangle} title="Active alerts & issues">
          <div className="space-y-2.5 p-4">
            {discharge.overdue > 0 ? (
              <AlertCard
                tone="danger"
                icon={AlertTriangle}
                title="High priority"
                body={`${discharge.overdue} discharge${discharge.overdue === 1 ? "" : "s"} pending for over 6 hours — beds are blocked.`}
              />
            ) : (
              <AlertCard
                tone="success"
                icon={CheckCircle2}
                title="Discharge flow"
                body="No discharges have been waiting longer than 6 hours."
              />
            )}

            {staff.sickLeave > 2 ? (
              <AlertCard
                tone="warning"
                icon={UserCog}
                title="Staffing"
                body={`${staff.sickLeave} staff on sick leave today — above the normal threshold of 2.`}
              />
            ) : (
              <AlertCard
                tone="info"
                icon={UserCog}
                title="Staffing"
                body={`${staff.onDuty} of ${staff.rostered} rostered staff clocked in · ${staff.sickLeave} sick leave.`}
              />
            )}

            <AlertCard
              tone={pendingScripts > 0 ? "warning" : "info"}
              icon={Pill}
              title="Pharmacy"
              body={
                pendingScripts > 0
                  ? `${pendingScripts} script${pendingScripts === 1 ? "" : "s"} raised in the last 2 hours still awaiting dispensing.`
                  : "No scripts outstanding in the last 2 hours."
              }
            />

            {criticalLast24h === 0 ? (
              <AlertCard
                tone="success"
                icon={CheckCircle2}
                title="Good news"
                body="No critical incidents recorded in the last 24 hours."
              />
            ) : (
              <AlertCard
                tone="danger"
                icon={AlertTriangle}
                title="Critical incidents"
                body={`${criticalLast24h} critical incident${criticalLast24h === 1 ? "" : "s"} routed here in the last 24 hours.`}
              />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel
          icon={Siren}
          title="ER queue"
          action={<Link to="/provider/hospital" className="text-xs font-semibold text-white hover:underline">View full queue</Link>}
        >
          <div className="divide-y">
            {stats.erQueue.slice(0, 5).map((i) => {
              const level = triageLevel(i);
              return (
                <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{i.incident_number ?? `#${i.id.slice(0, 8)}`}</p>
                    <p className="text-xs text-muted-foreground">{i.status.replace(/_/g, " ")}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase", triageTone[level])}>
                      {level}
                    </span>
                    <span className="w-14 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                      {waitedFor(i.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
            {!stats.erQueue.length && (
              <p className="py-6 text-center text-xs text-muted-foreground">No patients waiting in ER.</p>
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
        action={<Link to="/provider/hospital/admissions" className="text-xs font-semibold text-white hover:underline">View admissions</Link>}
      >
        <ActivityTimeline logs={logs} compact grouped emptyLabel="No patient touchpoints logged yet" />
      </Panel>

      <Panel
        icon={Users}
        title="On shift now"
        action={<Link to="/provider/hospital/shifts" className="text-xs font-semibold text-white hover:underline">Shift schedule</Link>}
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
