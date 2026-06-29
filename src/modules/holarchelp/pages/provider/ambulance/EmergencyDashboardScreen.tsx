import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, MapPin } from "lucide-react";

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
  {
    id: "1",
    code: "INC-2024-100",
    type: "self-created",
    severity: "critical",
    status: "active",
    title: "Cardiac Emergency",
    location: "Main Street Downtown",
    time: "14:32",
  },
  {
    id: "2",
    code: "INC-2024-050",
    type: "from-hospital",
    severity: "high",
    status: "new",
    title: "Trauma/Accident",
    location: "Downtown Medical Center",
    time: "14:25",
    hospital: "Central Hospital",
  },
  {
    id: "3",
    code: "INC-2024-049",
    type: "from-hospital",
    severity: "medium",
    status: "active",
    title: "Medical Emergency",
    location: "North Business District",
    time: "14:18",
    hospital: "North General Hospital",
  },
  {
    id: "4",
    code: "INC-2024-048",
    type: "self-created",
    severity: "high",
    status: "completed",
    title: "Respiratory Distress",
    location: "City Medical Centre",
    time: "13:45",
  },
];

const SEVERITY_COLORS = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-warning text-warning-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-primary text-primary-foreground",
};

const STATUS_CONFIG = {
  new: { icon: "🔔", label: "NEW", color: "text-destructive", bg: "bg-destructive/10" },
  active: { icon: "🚑", label: "ACTIVE", color: "text-success", bg: "bg-success/10" },
  completed: { icon: "✓", label: "COMPLETED", color: "text-muted-foreground", bg: "bg-muted" },
};

export default function EmergencyDashboardScreen() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"new" | "active" | "completed">("new");
  const filteredIncidents = MOCK_INCIDENTS.filter((i) => i.status === filter);

  const stats = {
    new: MOCK_INCIDENTS.filter((i) => i.status === "new").length,
    active: MOCK_INCIDENTS.filter((i) => i.status === "active").length,
    critical: MOCK_INCIDENTS.filter((i) => i.severity === "critical").length,
  };

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="flex gap-3">
        <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-sm font-semibold">
          🚨 ACTIVE MISSION #5505050
        </div>
        <div className="rounded-lg bg-primary/10 text-primary px-4 py-2 text-sm font-semibold">
          ✓ ON SHIFT (08:00 - 20:00)
        </div>
      </div>

      {/* Header */}
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Emergency Response</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-2">Emergency Operations</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {stats.new} new • {stats.active} active • {stats.critical} critical
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">New Requests</p>
          <p className="text-2xl font-bold mt-2 text-destructive">{stats.new}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active Operations</p>
          <p className="text-2xl font-bold mt-2 text-success">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Critical Incidents</p>
          <p className="text-2xl font-bold mt-2 text-warning">{stats.critical}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["new", "active", "completed"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f === "new" ? "🔔 New Requests" : f === "active" ? "🚑 Active" : "✓ Completed"}
          </Button>
        ))}
      </div>

      {/* Incident List */}
      <div className="space-y-3">
        {filteredIncidents.map((incident) => {
          const config = STATUS_CONFIG[incident.status];
          return (
            <div key={incident.id} className={`rounded-xl border border-border p-4 ${config.bg}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-3 py-1 rounded text-sm font-bold text-white ${SEVERITY_COLORS[incident.severity]}`}>
                      {incident.severity.toUpperCase()}
                    </span>
                    <h3 className="font-bold text-lg">{incident.code}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{incident.title}</p>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-semibold font-bold ${config.color}`}>
                  {config.icon} {config.label}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-semibold text-sm mt-1 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {incident.location}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Received</p>
                  <p className="font-semibold text-sm mt-1">{incident.time}</p>
                </div>
                {incident.hospital && (
                  <div>
                    <p className="text-xs text-muted-foreground">From Hospital</p>
                    <p className="font-semibold text-sm mt-1">🏥 {incident.hospital}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-3 border-t">
                {incident.status === "new" && (
                  <>
                    <Button className="flex-1 bg-success hover:bg-success" size="sm">
                      Accept & Dispatch
                    </Button>
                    <Button variant="outline" className="flex-1 text-destructive" size="sm">
                      Decline
                    </Button>
                  </>
                )}
                {incident.status === "active" && (
                  <>
                    <Button variant="outline" size="sm" className="flex-1">
                      Track Live
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Update Status
                    </Button>
                  </>
                )}
                {incident.status === "completed" && (
                  <Button variant="outline" size="sm" className="w-full">
                    View Report
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
