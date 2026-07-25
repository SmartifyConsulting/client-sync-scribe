import { useState } from "react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { Clock, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AfterHoursEvent {
  id: string;
  ambulance_code: string;
  event_type: "start" | "movement" | "extended_hours";
  started_at: string;
  ended_at?: string;
  location: string;
  authorized_shift_end: string;
  severity: "low" | "medium" | "high";
  description: string;
  unauthorized_minutes: number;
}

const HOURS_DATA: AfterHoursEvent[] = [
  {
    id: "ah_001",
    ambulance_code: "AMB-003",
    event_type: "start",
    started_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    location: "Depot",
    authorized_shift_end: "22:00",
    severity: "critical" as any,
    description: "Vehicle started outside operating hours (22:45 - unscheduled start)",
    unauthorized_minutes: 45,
  },
  {
    id: "ah_002",
    ambulance_code: "AMB-001",
    event_type: "extended_hours",
    started_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    ended_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    location: "Service Area - North",
    authorized_shift_end: "18:00",
    severity: "medium",
    description: "Extended operation beyond scheduled shift (18:00-19:30)",
    unauthorized_minutes: 90,
  },
  {
    id: "ah_003",
    ambulance_code: "AMB-002",
    event_type: "movement",
    started_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    location: "Residential Area",
    authorized_shift_end: "20:00",
    severity: "high",
    description: "Unauthorized vehicle movement at 21:15 (no active shift)",
    unauthorized_minutes: 75,
  },
];

const SEVERITY_COLORS: Record<string, string> = {
  low: "border-primary/40/40 bg-primary/10 text-primary",
  medium: "border-warning/40/40 bg-warning/10 text-warning",
  high: "border-destructive/40 bg-destructive/10 text-destructive",
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
};

export default function AfterHoursScreen() {
  const { providerId } = useProviderAccess();
  const [loading] = useState(false);

  const criticalCount = HOURS_DATA.filter((e) => (e.severity as any) === "critical").length;
  const highCount = HOURS_DATA.filter((e) => e.severity === "high").length;

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Vehicle Abuse Prevention
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">After-Hours Vehicle Use</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track vehicles that are used outside scheduled operating hours.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Critical Events
          </p>
          <p className="mt-1 text-2xl font-bold text-destructive">{criticalCount}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            High Risk
          </p>
          <p className="mt-1 text-2xl font-bold text-warning">{highCount}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Events
          </p>
          <p className="mt-1 text-2xl font-bold">{HOURS_DATA.length}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : HOURS_DATA.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            <Clock className="mx-auto mb-2 h-5 w-5 opacity-50" />
            No after-hours events detected.
          </div>
        ) : (
          <div className="divide-y">
            {HOURS_DATA.map((event) => (
              <div
                key={event.id}
                className={cn(
                  "flex items-start justify-between gap-4 p-4 hover:bg-muted/40",
                  SEVERITY_COLORS[event.severity]
                )}
              >
                <div className="flex items-start gap-3 flex-1">
                  <AlertTriangle className="h-4 w-4 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{event.ambulance_code}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-bold uppercase ${SEVERITY_COLORS[event.severity]}`}>
                        {event.event_type === "start" ? "Unauthorized Start" :
                         event.event_type === "extended_hours" ? "Extended Hours" :
                         "Unauthorized Movement"}
                      </span>
                    </div>
                    <p className="text-xs mt-1">{event.description}</p>
                    <div className="grid grid-cols-3 gap-4 mt-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Time</p>
                        <p className="font-semibold">{new Date(event.started_at).toLocaleTimeString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p className="font-semibold">{event.location}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-semibold">{event.unauthorized_minutes} min</p>
                      </div>
                    </div>
                    <p className="text-xs mt-2 opacity-60">
                      {new Date(event.started_at).toLocaleDateString()} • Authorized shift end: {event.authorized_shift_end}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="whitespace-nowrap">
                  Investigate
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
