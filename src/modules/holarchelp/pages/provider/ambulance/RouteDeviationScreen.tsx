import { useState } from "react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteDeviation {
  id: string;
  ambulance_code: string;
  incident_id: string;
  authorized_distance_km: number;
  actual_distance_km: number;
  deviation_percent: number;
  deviation_km: number;
  occurred_at: string;
  from: string;
  to: string;
  severity: "low" | "medium" | "high";
}

const DEVIATION_DATA: RouteDeviation[] = [
  {
    id: "dev_001",
    ambulance_code: "AMB-001",
    incident_id: "inc_2024_001",
    authorized_distance_km: 15.2,
    actual_distance_km: 22.8,
    deviation_percent: 50,
    deviation_km: 7.6,
    occurred_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    from: "Main Depot",
    to: "Central Hospital",
    severity: "high",
  },
  {
    id: "dev_002",
    ambulance_code: "AMB-003",
    incident_id: "inc_2024_002",
    authorized_distance_km: 8.5,
    actual_distance_km: 9.2,
    deviation_percent: 8,
    deviation_km: 0.7,
    occurred_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    from: "North Depot",
    to: "City Medical",
    severity: "low",
  },
];

const SEVERITY_COLORS: Record<string, string> = {
  low: "border-primary/40/40 bg-primary/10 text-primary",
  medium: "border-warning/40/40 bg-warning/10 text-warning",
  high: "border-destructive/40 bg-destructive/10 text-destructive",
};

export default function RouteDeviationScreen() {
  const { providerId } = useProviderAccess();
  const [loading] = useState(false);

  const getDeviationIcon = (severity: string) => {
    return <AlertTriangle className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Vehicle Abuse Prevention
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Route Deviation</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor when ambulances deviate from authorized dispatch routes.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            High Deviation
          </p>
          <p className="mt-1 text-2xl font-bold text-destructive">
            {DEVIATION_DATA.filter((d) => d.severity === "high").length}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Medium Deviation
          </p>
          <p className="mt-1 text-2xl font-bold text-warning">
            {DEVIATION_DATA.filter((d) => d.severity === "medium").length}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Events
          </p>
          <p className="mt-1 text-2xl font-bold">{DEVIATION_DATA.length}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : DEVIATION_DATA.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            <MapPin className="mx-auto mb-2 h-5 w-5 opacity-50" />
            No route deviations detected.
          </div>
        ) : (
          <div className="divide-y">
            {DEVIATION_DATA.map((deviation) => (
              <div
                key={deviation.id}
                className={cn(
                  "flex items-start justify-between gap-4 p-4 hover:bg-muted/40",
                  SEVERITY_COLORS[deviation.severity]
                )}
              >
                <div className="flex items-start gap-3 flex-1">
                  {getDeviationIcon(deviation.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{deviation.ambulance_code}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-bold uppercase ${SEVERITY_COLORS[deviation.severity]}`}>
                        {deviation.deviation_percent}% Deviation
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs mt-2">
                      <span>{deviation.from}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{deviation.to}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Authorized</p>
                        <p className="font-semibold">{deviation.authorized_distance_km} km</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Actual</p>
                        <p className="font-semibold">{deviation.actual_distance_km} km</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Extra Distance</p>
                        <p className="font-semibold">{deviation.deviation_km} km</p>
                      </div>
                    </div>
                    <p className="text-xs mt-2 opacity-60">
                      Incident #{deviation.incident_id} • {new Date(deviation.occurred_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="whitespace-nowrap">
                  Review
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
