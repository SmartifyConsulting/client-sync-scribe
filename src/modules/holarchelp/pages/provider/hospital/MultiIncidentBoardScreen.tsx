import { useState } from "react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Activity, MapPin } from "lucide-react";

interface Incident {
  id: string;
  location: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "new" | "assigned" | "en_route" | "on_scene" | "transporting";
  ambulances: string[];
  time_elapsed: number;
  patient_count: number;
}

const INCIDENTS: Incident[] = [
  {
    id: "INC-2024-001",
    location: "Main Street, Downtown",
    priority: "critical",
    status: "en_route",
    ambulances: ["AMB-001", "AMB-002"],
    time_elapsed: 8,
    patient_count: 1,
  },
  {
    id: "INC-2024-002",
    location: "City Centre Hospital",
    priority: "high",
    status: "assigned",
    ambulances: ["AMB-003"],
    time_elapsed: 5,
    patient_count: 2,
  },
  {
    id: "INC-2024-003",
    location: "North Business District",
    priority: "high",
    status: "new",
    ambulances: [],
    time_elapsed: 2,
    patient_count: 1,
  },
  {
    id: "INC-2024-004",
    location: "Shopping Centre",
    priority: "medium",
    status: "on_scene",
    ambulances: ["AMB-004"],
    time_elapsed: 12,
    patient_count: 3,
  },
];

const PRIORITY_COLORS = {
  critical: "bg-red-100 border-red-300",
  high: "bg-orange-100 border-orange-300",
  medium: "bg-yellow-100 border-yellow-300",
  low: "bg-blue-100 border-blue-300",
};

const PRIORITY_TEXT = {
  critical: "text-red-900",
  high: "text-orange-900",
  medium: "text-yellow-900",
  low: "text-blue-900",
};

const STATUS_LABELS = {
  new: "🆕 New",
  assigned: "✓ Assigned",
  en_route: "🚑 En Route",
  on_scene: "📍 On Scene",
  transporting: "🏥 Transporting",
};

export default function MultiIncidentBoardScreen() {
  const { providerId } = useProviderAccess();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const criticalCount = INCIDENTS.filter((i) => i.priority === "critical").length;
  const unassignedCount = INCIDENTS.filter((i) => i.status === "new").length;

  if (viewMode === "grid") {
    return (
      <div className="space-y-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Multi-Incident Board</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Overview of all active incidents and their dispatch status
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewMode("list")}
          >
            Switch to List
          </Button>
        </header>

        {/* Alert Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border-l-4 border-l-red-600 bg-red-50 p-4">
            <p className="text-xs font-semibold text-red-900">CRITICAL INCIDENTS</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{criticalCount}</p>
          </div>
          <div className="rounded-xl border-l-4 border-l-yellow-600 bg-yellow-50 p-4">
            <p className="text-xs font-semibold text-yellow-900">UNASSIGNED</p>
            <p className="text-3xl font-bold text-yellow-600 mt-1">{unassignedCount}</p>
          </div>
        </div>

        {/* Incident Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INCIDENTS.map((incident) => (
            <div
              key={incident.id}
              className={`rounded-xl border-2 p-4 ${PRIORITY_COLORS[incident.priority]}`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className={`text-lg font-bold ${PRIORITY_TEXT[incident.priority]}`}>
                  {incident.id}
                </h3>
                <span className="text-xs font-bold px-2 py-1 bg-white rounded">
                  {STATUS_LABELS[incident.status]}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{incident.location}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-current border-opacity-20">
                  <div>
                    <p className="text-xs opacity-70">Patients</p>
                    <p className="font-bold">{incident.patient_count}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-70">Elapsed</p>
                    <p className="font-bold">{incident.time_elapsed}m</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-70">Ambulances</p>
                    <p className="font-bold">{incident.ambulances.length}</p>
                  </div>
                </div>

                {incident.ambulances.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1">
                    {incident.ambulances.map((amb) => (
                      <span
                        key={amb}
                        className="text-xs bg-white bg-opacity-60 px-2 py-1 rounded"
                      >
                        {amb}
                      </span>
                    ))}
                  </div>
                )}

                {incident.status === "new" && (
                  <Button size="sm" className="w-full mt-2">
                    Dispatch Ambulance
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
            <h1 className="text-3xl font-bold text-foreground">Multi-Incident Board</h1>
        </div>
        <Button size="sm" variant="outline" onClick={() => setViewMode("grid")}>
          Switch to Grid
        </Button>
      </header>

      <div className="space-y-2">
        {INCIDENTS.map((incident) => (
          <div
            key={incident.id}
            className={`rounded-xl border-2 p-4 ${PRIORITY_COLORS[incident.priority]}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-bold">{incident.id}</h3>
                <p className="text-sm">{incident.location}</p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-semibold">{STATUS_LABELS[incident.status]}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ambulances</p>
                  <p className="font-semibold">{incident.ambulances.length}</p>
                </div>
                <Button size="sm" variant="outline">
                  Manage
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
