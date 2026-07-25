import { useState } from "react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnlinkedTrip {
  id: string;
  ambulance_code: string;
  started_at: string;
  ended_at: string;
  start_location: string;
  end_location: string;
  distance_km: number;
  duration_minutes: number;
  severity: "low" | "medium" | "high";
  reason: string;
}

const TRIPS_DATA: UnlinkedTrip[] = [
  {
    id: "trip_001",
    ambulance_code: "AMB-001",
    started_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    ended_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    start_location: "Private Residence Area",
    end_location: "Shopping Center",
    distance_km: 12.5,
    duration_minutes: 28,
    severity: "high",
    reason: "No active incident, dispatch, or authorized purpose",
  },
  {
    id: "trip_002",
    ambulance_code: "AMB-003",
    started_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    ended_at: new Date(Date.now() - 4.8 * 60 * 60 * 1000).toISOString(),
    start_location: "Depot",
    end_location: "Fast Food Restaurant",
    distance_km: 4.2,
    duration_minutes: 15,
    severity: "medium",
    reason: "Brief unauthorized movement - personal use suspected",
  },
  {
    id: "trip_003",
    ambulance_code: "AMB-002",
    started_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    ended_at: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(),
    start_location: "Residential Area",
    end_location: "Residential Area",
    distance_km: 0.8,
    duration_minutes: 22,
    severity: "low",
    reason: "Engine idling - vehicle stationary with engine running",
  },
];

const SEVERITY_COLORS: Record<string, string> = {
  low: "border-primary/40/40 bg-primary/10 text-primary",
  medium: "border-warning/40/40 bg-warning/10 text-warning",
  high: "border-destructive/40 bg-destructive/10 text-destructive",
};

export default function UnlinkedTripsScreen() {
  const { providerId } = useProviderAccess();
  const [loading] = useState(false);

  const totalDistance = TRIPS_DATA.reduce((sum, t) => sum + t.distance_km, 0);
  const highRiskCount = TRIPS_DATA.filter((t) => t.severity === "high").length;

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Vehicle Abuse Prevention
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Unlinked Trips</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Detect vehicle movements without an authorized incident, dispatch, or approved purpose.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            High Risk Trips
          </p>
          <p className="mt-1 text-2xl font-bold text-destructive">{highRiskCount}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Unauthorized Distance
          </p>
          <p className="mt-1 text-2xl font-bold">{totalDistance.toFixed(1)} km</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Total Trips
          </p>
          <p className="mt-1 text-2xl font-bold">{TRIPS_DATA.length}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/40/20">
          <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm text-primary">
            Every ambulance trip must be linked to a dispatch, maintenance job, fuel stop, or other authorized purpose.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : TRIPS_DATA.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <MapPin className="mx-auto mb-2 h-5 w-5 opacity-50" />
            No unlinked trips detected.
          </div>
        ) : (
          <div className="divide-y">
            {TRIPS_DATA.map((trip) => (
              <div
                key={trip.id}
                className={cn(
                  "flex items-start justify-between gap-4 p-4 hover:bg-muted/40",
                  SEVERITY_COLORS[trip.severity]
                )}
              >
                <div className="flex items-start gap-3 flex-1">
                  <AlertCircle className="h-4 w-4 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{trip.ambulance_code}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-sm font-bold uppercase ${SEVERITY_COLORS[trip.severity]}`}>
                        Unlinked Trip
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm mt-2">
                      <MapPin className="h-3 w-3" />
                      <span>{trip.start_location}</span>
                      <span>â†’</span>
                      <span>{trip.end_location}</span>
                    </div>
                    <p className="text-sm mt-2">{trip.reason}</p>
                    <div className="grid grid-cols-4 gap-3 mt-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Distance</p>
                        <p className="font-semibold">{trip.distance_km} km</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-semibold">{trip.duration_minutes} min</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Started</p>
                        <p className="font-semibold">{new Date(trip.started_at).toLocaleTimeString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date</p>
                        <p className="font-semibold">{new Date(trip.started_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="whitespace-nowrap">
                  Authorize
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

