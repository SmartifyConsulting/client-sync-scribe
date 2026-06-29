import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Siren,
  MapPin,
  Clock,
  Building2,
  Phone,
  Navigation as NavIcon,
  FileText,
  AlertTriangle,
} from "lucide-react";

interface Incident {
  id: string;
  code: string;
  type: "self-created" | "from-hospital";
  severity: "critical" | "high" | "medium" | "low";
  status: "new" | "active" | "completed";
  title: string;
  location: string;
  time: string;
  hospital?: string;
}

const MOCK_INCIDENTS: Incident[] = [
  { id: "1", code: "INC-2024-100", type: "self-created", severity: "critical", status: "active", title: "Cardiac Emergency", location: "Main Street Downtown", time: "14:32" },
  { id: "2", code: "INC-2024-050", type: "from-hospital", severity: "high", status: "new", title: "Trauma / Accident", location: "Downtown Medical Center", time: "14:25", hospital: "Central Hospital" },
  { id: "3", code: "INC-2024-049", type: "from-hospital", severity: "medium", status: "active", title: "Medical Emergency", location: "North Business District", time: "14:18", hospital: "North General Hospital" },
  { id: "4", code: "INC-2024-048", type: "self-created", severity: "high", status: "completed", title: "Respiratory Distress", location: "City Medical Centre", time: "13:45" },
];

const SEVERITY_STRIPE: Record<Incident["severity"], string> = {
  critical: "bg-destructive",
  high: "bg-warning",
  medium: "bg-warning/70",
  low: "bg-primary",
};

const SEVERITY_BADGE: Record<Incident["severity"], string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  high: "bg-warning/10 text-warning border-warning/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-primary/10 text-primary border-primary/30",
};

const STATUS_PILL: Record<Incident["status"], string> = {
  new: "bg-destructive/10 text-destructive",
  active: "bg-success/10 text-success",
  completed: "bg-muted text-muted-foreground",
};

export default function EmergencyDashboardScreen() {
  const [filter, setFilter] = useState<Incident["status"]>("new");
  const filtered = MOCK_INCIDENTS.filter((i) => i.status === filter);

  const stats = {
    new: MOCK_INCIDENTS.filter((i) => i.status === "new").length,
    active: MOCK_INCIDENTS.filter((i) => i.status === "active").length,
    critical: MOCK_INCIDENTS.filter((i) => i.severity === "critical").length,
  };

  return (
    <div className="space-y-3">
      {/* Header — matches Doctor/Patient profile style */}
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Emergency Response Dispatch
        </p>
        <h1 className="text-2xl font-extrabold mt-1 flex items-center gap-2">
          <Siren className="h-5 w-5 text-primary" />
          Emergency Operations
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Live incident queue, severity and dispatch actions.
        </p>
      </header>

      {/* Single compact stats row */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="New" value={stats.new} tone="destructive" />
        <StatCard label="Active" value={stats.active} tone="success" />
        <StatCard label="Critical" value={stats.critical} tone="warning" />
      </div>

      {/* Standard teal tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Incident["status"])} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="new" className="text-xs">New ({stats.new})</TabsTrigger>
          <TabsTrigger value="active" className="text-xs">Active ({stats.active})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Completed ({MOCK_INCIDENTS.filter((i) => i.status === "completed").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Incident cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">No {filter} incidents.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((incident) => (
            <article
              key={incident.id}
              className="relative rounded-xl border border-border bg-card overflow-hidden"
            >
              <span className={`absolute left-0 top-0 h-full w-1 ${SEVERITY_STRIPE[incident.severity]}`} aria-hidden />
              <div className="pl-3 p-2.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-foreground">{incident.code}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${SEVERITY_BADGE[incident.severity]}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                      {incident.title}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${STATUS_PILL[incident.status]}`}>
                    {incident.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{incident.location}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {incident.time}
                  </span>
                  {incident.hospital && (
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{incident.hospital}</span>
                    </span>
                  )}
                </div>

                <div className="flex gap-1.5 pt-1">
                  {incident.status === "new" && (
                    <>
                      <Button size="sm" className="h-7 text-xs flex-1">
                        <Phone className="mr-1 h-3 w-3" /> Accept &amp; Roll
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive">
                        Decline
                      </Button>
                    </>
                  )}
                  {incident.status === "active" && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs flex-1">
                        <NavIcon className="mr-1 h-3 w-3" /> Track
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs flex-1">
                        Update Status
                      </Button>
                    </>
                  )}
                  {incident.status === "completed" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs w-full">
                      <FileText className="mr-1 h-3 w-3" /> View Report
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "destructive" | "success" | "warning";
}) {
  const toneClass =
    tone === "destructive" ? "text-destructive"
    : tone === "success" ? "text-success"
    : "text-warning";
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-extrabold mt-0.5 tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
