import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useErOpsStats, type ErActivityEvent, type IncidentLite } from "../../../hooks/useErOpsStats";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Ambulance,
  Building2,
  CheckCircle2,
  Clock,
  Hospital,
  Radio,
  RefreshCw,
  Siren,
  Timer,
  Truck,
  Users,
} from "lucide-react";

const ALL = "all";

const sevTone: Record<string, string> = {
  critical: "border-destructive/50 bg-destructive/10 text-destructive",
  high: "border-warning/50 bg-warning/10 text-warning",
  medium: "border-warning/40 bg-warning/5 text-warning",
  low: "border-success/50 bg-success/10 text-success",
};

const activityIcon: Record<ErActivityEvent["kind"], typeof Siren> = {
  received: Siren,
  accepted: CheckCircle2,
  en_route: Ambulance,
  collected: Users,
  handover: Hospital,
  completed: CheckCircle2,
};

function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} seconds ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return `${Math.floor(h / 24)} day${Math.floor(h / 24) === 1 ? "" : "s"} ago`;
}

function shortAgo(iso: string | null) {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function vehicleTone(status: string, busy: boolean) {
  const s = (status || "").toLowerCase();
  if (busy || s === "dispatched" || s === "on_call") return "border-warning/50 bg-warning/10 text-warning";
  if (s === "offline" || s === "maintenance" || s === "out_of_service")
    return "border-destructive/50 bg-destructive/10 text-destructive";
  return "border-success/50 bg-success/10 text-success";
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: typeof Siren;
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
  action,
}: {
  icon: typeof Siren;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">{title}</h2>
        <span className="ml-auto">{action}</span>
      </header>
      {children}
    </section>
  );
}

export default function ErOpsDashboard() {
  const { providerId } = useProviderAccess();
  const stats = useErOpsStats(providerId);
  const [vehicle, setVehicle] = useState<string>(ALL);
  const [, tick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { active, response, fleet, crew } = stats;
  const vehicles = vehicle === ALL ? stats.vehicles : stats.vehicles.filter((v) => v.id === vehicle);
  const incidents: IncidentLite[] =
    vehicle === ALL
      ? stats.incidents
      : stats.incidents.filter((i) => i.assigned_ambulance_id === vehicle || !i.assigned_provider_id);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Emergency response
          </p>
          <h1 className="text-2xl font-extrabold leading-tight">Ops Dashboard</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Last updated: {Math.max(0, Math.round((Date.now() - stats.lastUpdated) / 1000))} seconds ago
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={vehicle} onValueChange={setVehicle}>
            <SelectTrigger className="h-9 w-52 rounded-xl">
              <SelectValue placeholder="All vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All vehicles</SelectItem>
              {stats.vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.vehicle_code || v.registration_number || v.id.slice(0, 8)}
                </SelectItem>
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
          icon={Siren}
          label="Active incidents"
          value={`${active.count}`}
          sub={`${active.unassigned} unassigned in queue`}
          tone={active.unassigned > 0 ? "danger" : active.count > 0 ? "warning" : "default"}
        />
        <KpiCard
          icon={Timer}
          label="Avg response time"
          value={`${response.avgMinutes} min`}
          sub={`${response.sample} arrival${response.sample === 1 ? "" : "s"} in last 24h`}
          tone={response.avgMinutes > 20 ? "warning" : "default"}
        />
        <KpiCard
          icon={Truck}
          label="Fleet availability"
          value={`${fleet.pct}%`}
          sub={`${fleet.available}/${fleet.total} vehicles available`}
          tone={fleet.pct < 25 ? "danger" : fleet.pct < 50 ? "warning" : "default"}
        />
        <KpiCard
          icon={Users}
          label="Crew on shift"
          value={`${crew.onShift}`}
          sub={`${crew.vehiclesWithoutCrew} vehicle${crew.vehiclesWithoutCrew === 1 ? "" : "s"} without crew`}
          tone={crew.onShift === 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          icon={Radio}
          title="Live incident board"
          action={
            <Button asChild variant="ghost" size="sm" className="h-7 rounded-lg text-xs">
              <Link to="/provider/ambulance">Open dispatch</Link>
            </Button>
          }
        >
          <div className="divide-y">
            {incidents.map((i) => {
              const unassigned = !i.assigned_provider_id;
              const veh = stats.vehicles.find((v) => v.id === i.assigned_ambulance_id);
              return (
                <Link
                  key={i.id}
                  to={`/provider/ambulance/incident/${i.id}`}
                  className={cn(
                    "flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50",
                    unassigned && "bg-destructive/5",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {i.incident_number ?? `#${i.id.slice(0, 8)}`}
                      {unassigned && (
                        <span className="ml-2 text-[11px] font-bold uppercase text-destructive">Unassigned</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {i.status.replace(/_/g, " ")}
                      {veh ? ` · ${veh.vehicle_code || veh.registration_number}` : ""}
                      {veh?.crew.length ? ` · ${veh.crew.join(", ")}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase",
                        sevTone[(i.severity ?? "").toLowerCase()] ?? "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {i.severity ?? "n/a"}
                    </span>
                    <span className="w-10 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                      {shortAgo(i.created_at)}
                    </span>
                  </div>
                </Link>
              );
            })}
            {!incidents.length && (
              <p className="py-6 text-center text-xs text-muted-foreground">No open or active incidents.</p>
            )}
          </div>
        </Panel>

        <Panel icon={Truck} title="Fleet status">
          <div className="divide-y">
            {vehicles.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {v.vehicle_code || v.registration_number || v.id.slice(0, 8)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {v.crew.length ? v.crew.join(", ") : "No crew assigned"} · ping {shortAgo(v.lastPingAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase",
                    vehicleTone(v.status, !!v.incidentId),
                  )}
                >
                  {v.incidentId ? "dispatched" : (v.status || "unknown").replace(/_/g, " ")}
                </span>
              </div>
            ))}
            {!vehicles.length && (
              <p className="py-6 text-center text-xs text-muted-foreground">No vehicles registered yet.</p>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel icon={Building2} title="Destination hospitals">
          <div className="divide-y">
            {stats.hospitals.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{h.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.erBedsAvailable != null ? `${h.erBedsAvailable} ER beds free` : "ER capacity unknown"}
                    {h.erStatus ? ` · ${h.erStatus.replace(/_/g, " ")}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {h.acceptingPatients === false && (
                    <span className="rounded-full border border-destructive/50 bg-destructive/10 px-2 py-0.5 text-[11px] font-bold uppercase text-destructive">
                      Closed
                    </span>
                  )}
                  <span className="rounded-full border bg-muted px-2 py-0.5 text-[11px] font-bold tabular-nums">
                    {h.inbound} inbound
                  </span>
                </div>
              </div>
            ))}
            {!stats.hospitals.length && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No approved destination hospitals yet.
              </p>
            )}
          </div>
        </Panel>

        <Panel icon={Clock} title="Recent activity">
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
              <li className="py-6 text-center text-xs text-muted-foreground">No dispatch activity yet.</li>
            )}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
