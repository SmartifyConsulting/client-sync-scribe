import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTION_FRAME_CLASS, SECTION_ITEM_CLASS } from "@/components/ui/section-accordion";

interface QueuedDispatch {
  id: string;
  incident_id: string;
  status: "waiting" | "active" | "delayed" | "completed";
  priority: "critical" | "high" | "medium" | "low";
  created_at: string;
  ambulance?: string;
  wait_time_minutes: number;
  location: string;
}

const QUEUE_DATA: QueuedDispatch[] = [
  {
    id: "d_001",
    incident_id: "INC-2024-001",
    status: "active",
    priority: "critical",
    created_at: "14:32",
    ambulance: "AMB-001",
    wait_time_minutes: 8,
    location: "Main Street, Downtown",
  },
  {
    id: "d_002",
    incident_id: "INC-2024-002",
    status: "waiting",
    priority: "high",
    created_at: "14:35",
    wait_time_minutes: 5,
    location: "City Centre Hospital",
  },
  {
    id: "d_003",
    incident_id: "INC-2024-003",
    status: "waiting",
    priority: "high",
    created_at: "14:38",
    wait_time_minutes: 2,
    location: "North Business District",
  },
  {
    id: "d_004",
    incident_id: "INC-2024-004",
    status: "delayed",
    priority: "medium",
    created_at: "14:42",
    wait_time_minutes: 0,
    location: "Residential Area - North",
  },
  {
    id: "d_005",
    incident_id: "INC-2024-005",
    status: "completed",
    priority: "medium",
    created_at: "14:15",
    ambulance: "AMB-002",
    wait_time_minutes: 28,
    location: "Shopping Centre",
  },
];

const STATUS_COLORS = {
  waiting: "bg-yellow-100 text-yellow-800",
  active: "bg-blue-100 text-blue-800",
  delayed: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
};

const PRIORITY_COLORS = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-600 text-white",
  medium: "bg-yellow-600 text-white",
  low: "bg-blue-600 text-white",
};

export default function DispatchQueueScreen() {
  const { t } = useTranslation();
  const { providerId } = useProviderAccess();
  const [filter, setFilter] = useState<"all" | "waiting" | "active" | "delayed" | "completed">("all");

  const filteredData = filter === "all" ? QUEUE_DATA : QUEUE_DATA.filter((d) => d.status === filter);

  const stats = {
    waiting: QUEUE_DATA.filter((d) => d.status === "waiting").length,
    active: QUEUE_DATA.filter((d) => d.status === "active").length,
    delayed: QUEUE_DATA.filter((d) => d.status === "delayed").length,
    completed: QUEUE_DATA.filter((d) => d.status === "completed").length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "delayed":
        return <AlertCircle className="h-4 w-4" />;
      case "active":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <header>
            <h1 className="text-3xl font-bold text-foreground">Dispatch Queue</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Monitor all dispatches: waiting, active, delayed, and completed
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-primary bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Waiting
          </p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.waiting}</p>
        </div>
        <div className="rounded-xl border border-primary bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Active
          </p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-primary bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Delayed
          </p>
          <p className="text-3xl font-bold text-red-600 mt-1">{stats.delayed}</p>
        </div>
        <div className="rounded-xl border border-primary bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Completed
          </p>
          <p className="text-3xl font-bold text-green-600 mt-1">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto">
        {["all", "waiting", "active", "delayed", "completed"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f as any)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Queue List */}
      <div className={SECTION_FRAME_CLASS}>
        {filteredData.map((dispatch) => (
          <div
            key={dispatch.id}
            className={cn(SECTION_ITEM_CLASS, "p-4 hover:bg-muted/50 transition-colors")}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-bold",
                    PRIORITY_COLORS[dispatch.priority]
                  )}>
                    {dispatch.priority.toUpperCase()}
                  </span>
                  <span
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold flex items-center gap-1",
                      STATUS_COLORS[dispatch.status]
                    )}
                  >
                    {getStatusIcon(dispatch.status)}
                    {dispatch.status.replace("_", " ").toUpperCase()}
                  </span>
                  {dispatch.ambulance && (
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-primary text-white">
                      {dispatch.ambulance}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold">{dispatch.incident_id}</h3>
                <p className="text-xs text-muted-foreground mt-1">{dispatch.location}</p>

                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Created: {dispatch.created_at}</span>
                  <span>
                    Waiting: {dispatch.wait_time_minutes}{" "}
                    {dispatch.wait_time_minutes === 1 ? "minute" : "minutes"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  View
                </Button>
                {dispatch.status === "waiting" && (
                  <Button size="sm">Quick Assign</Button>
                )}
                {dispatch.status === "delayed" && (
                  <Button size="sm" variant="destructive">
                    Escalate
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="rounded-xl border border-neutral-400 bg-muted p-8 text-center">
          <p className="text-muted-foreground">No {filter !== "all" ? filter : ""} dispatches</p>
        </div>
      )}
    </div>
  );
}
