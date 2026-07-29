import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProviderAccess } from "../../../components/ProviderGate";
import {
  useHospitalAdminStats,
  useWardOptions,
  type ActivityEvent,
  type ErIncidentLite,
} from "../../../hooks/useHospitalAdminStats";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  Ambulance,
  BedDouble,
  CheckCircle2,
  ClipboardCheck,
  LogOut,
  Pill,
  RefreshCw,
  Siren,
  Timer,
  UserCog,
  Users,
} from "lucide-react";

const ALL = "all";

const triageTone = {
  critical: "border-destructive/50 bg-destructive/10 text-destructive",
  urgent: "border-warning/50 bg-warning/10 text-warning",
  routine: "border-success/50 bg-success/10 text-success",
} as const;

const activityIcon = {
  admission: BedDouble,
  discharge: LogOut,
  prescription: Pill,
  shift: UserCog,
  incident: Ambulance,
} as const satisfies Record<ActivityEvent["kind"], typeof BedDouble>;

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

function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} seconds ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function relativeSeconds(ts: number) {
  return Math.max(0, Math.round((Date.now() - ts) / 1000));
}


function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: typeof BedDouble;
  label: string;
  value: string;
  sub: string;
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
    <div className="rounded-2xl border bg-card px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className={cn("mt-1 text-3xl font-extrabold tabular-nums", toneClass)}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{sub}</p>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof BedDouble;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">{title}</h2>
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

function barTone(pct: number) {
  if (pct > 85) return "bg-destructive";
  if (pct >= 70) return "bg-warning";
  return "bg-success";
}

export default function HospitalAdminDashboard() {
  const { providerId } = useProviderAccess();
  const wardOptions = useWardOptions(providerId);
  const [ward, setWard] = useState<string>(ALL);
  const stats = useHospitalAdminStats(providerId, ward === ALL ? null : ward);
  const [, tick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { beds, er, discharge, staff, wards, pendingScripts, criticalLast24h } = stats;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Hospital administration
          </p>
          <h1 className="text-2xl font-extrabold leading-tight">Admin Dashboard</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Last updated: {relativeSeconds(stats.lastUpdated)} seconds ago
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={ward} onValueChange={setWard}>
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
        <KpiCard
          icon={BedDouble}
          label="Bed occupancy"
          value={`${beds.pct}%`}
          sub={`${beds.occupied}/${beds.total} beds`}
          tone={beds.pct > 85 ? "danger" : beds.pct >= 70 ? "warning" : "default"}
        />
        <KpiCard
          icon={Timer}
          label="ER wait time"
          value={`${er.avgWaitMinutes} min`}
          sub={`${er.count} patient${er.count === 1 ? "" : "s"} waiting`}
          tone={er.avgWaitMinutes > 30 ? "warning" : "default"}
        />
        <KpiCard
          icon={ClipboardCheck}
          label="Ready for discharge"
          value={`${discharge.total}`}
          sub={`${discharge.total} patient${discharge.total === 1 ? "" : "s"} awaiting paperwork`}
          tone={discharge.overdue ? "warning" : "default"}
        />
        <KpiCard
          icon={Users}
          label="Staff on duty"
          value={`${staff.onDuty}/${staff.rostered}`}
          sub={`${staff.sickLeave} sick leave`}
          tone={staff.sickLeave > 2 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Panel icon={BedDouble} title="Bed status by ward">
          <div className="space-y-3 p-4">
            {wards.map((w) => {
              const pct = w.beds ? Math.min(100, Math.round((w.occupied / w.beds) * 100)) : 0;
              return (
                <div key={w.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">{w.name}</span>
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                      {w.occupied}/{w.beds} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", barTone(pct))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {!wards.length && (
              <p className="py-6 text-center text-xs text-muted-foreground">No wards configured yet.</p>
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
        <Panel icon={Siren} title="ER queue">
          <div className="divide-y">
            {stats.erQueue.slice(0, 4).map((i) => {
              const level = triageLevel(i);
              return (
                <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {i.incident_number ?? `#${i.id.slice(0, 8)}`}
                    </p>
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
          <div className="border-t px-4 py-2.5">
            <Button asChild variant="outline" size="sm" className="w-full rounded-xl">
              <Link to="/provider/hospital">View full queue</Link>
            </Button>
          </div>
        </Panel>

        <Panel icon={Activity} title="Recent activity">
          <ol className="divide-y">
            {stats.activity.slice(0, 5).map((e) => {
              const Icon = activityIcon[e.kind];
              return (
                <li key={e.id} className="flex items-start gap-3 px-4 py-2.5">
                  <span className="mt-0.5 rounded-lg bg-muted p-1.5">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">{timeAgo(e.at)}</span>
                </li>
              );
            })}
            {!stats.activity.length && (
              <li className="py-6 text-center text-xs text-muted-foreground">No activity recorded yet.</li>
            )}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

