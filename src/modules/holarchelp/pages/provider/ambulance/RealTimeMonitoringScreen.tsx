import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, MapPin, AlertTriangle, Radar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AmbulanceSimulator } from "../../../components/AmbulanceSimulator";

export default function RealTimeMonitoringScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"tracking" | "safety">("tracking");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t("realTimeMonitoring.eyebrow", "Operations")}
        </p>
        <h1 className="text-2xl font-extrabold mt-1 flex items-center gap-2">
          <Radar className="h-5 w-5 text-primary" />
          {t("nav.realTimeMonitoring")}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t("realTimeMonitoring.description", "All vehicles, live — GPS positions, speed and safety events across the fleet.")}
        </p>
      </div>

      <AmbulanceSimulator />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="tracking" className="text-xs">
            {t("realTimeMonitoring.tabs.tracking", "Live Tracking")}
          </TabsTrigger>
          <TabsTrigger value="safety" className="text-xs">
            {t("realTimeMonitoring.tabs.safety", "Safety Alerts")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard label="Vehicles Online" value="6 / 6" hint="All GPS connected" tone="success" />
            <StatCard label="Avg Speed" value="42 km/h" hint="Within limits" tone="muted" />
            <StatCard label="Fuel Status" value="72%" hint="Good levels" tone="success" />
          </div>

          <div className="space-y-2">
            {[
              { vehicle: "AMB-001", location: "Main Street", speed: "35 km/h", fuel: "78%", status: "moving" },
              { vehicle: "AMB-002", location: "Highway 101", speed: "68 km/h", fuel: "62%", status: "moving" },
              { vehicle: "AMB-003", location: "Workshop", speed: "0 km/h", fuel: "45%", status: "stopped" },
            ].map((item) => (
              <div
                key={item.vehicle}
                className="rounded-2xl border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-sm">{item.vehicle}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {item.location}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      item.status === "moving"
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs items-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Speed</p>
                    <p className="font-semibold">{item.speed}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Fuel</p>
                    <p className="font-semibold">{item.fuel}</p>
                  </div>
                  <div className="text-right">
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      Track
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="safety" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard label="Critical Alerts" value="2" hint="Immediate action" tone="destructive" />
            <StatCard label="Safety Events" value="5" hint="This week" tone="warning" />
            <StatCard label="Fleet Score" value="92 / 100" hint="Excellent safety" tone="success" />
          </div>

          <div className="space-y-2">
            {[
              { vehicle: "AMB-002", event: "Speeding on Highway 101", severity: "HIGH", time: "2 min ago", action: "Coach Driver" },
              { vehicle: "AMB-001", event: "Harsh braking detected", severity: "MEDIUM", time: "15 min ago", action: "Review" },
              { vehicle: "AMB-003", event: "After-hours movement", severity: "HIGH", time: "1 hour ago", action: "Investigate" },
            ].map((item) => (
              <div
                key={`${item.vehicle}-${item.event}`}
                className={`rounded-2xl border-l-4 border border-border bg-card p-3 ${
                  item.severity === "HIGH" ? "border-l-destructive" : "border-l-warning"
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <h3 className="font-bold text-sm flex items-center gap-1.5">
                      <AlertTriangle
                        className={`h-3.5 w-3.5 ${
                          item.severity === "HIGH" ? "text-destructive" : "text-warning"
                        }`}
                      />
                      {item.vehicle}
                    </h3>
                    <p className="text-xs mt-0.5">{item.event}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      item.severity === "HIGH"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {item.severity}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">{item.time}</p>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    {item.action}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-3">
            <h3 className="font-bold text-sm mb-2">Safety Event Types Monitored</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {[
                "Speeding events",
                "Harsh acceleration / braking",
                "After-hours vehicle use",
                "Geofence breaches",
                "Route deviations",
                "Unauthorized stops",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "success" | "muted" | "destructive" | "warning";
}) {
  const toneClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-extrabold mt-1 ${toneClass}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
