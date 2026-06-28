import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, AlertTriangle, MapPin, Zap } from "lucide-react";

export default function RealTimeMonitoringScreen() {
  const [activeTab, setActiveTab] = useState<"tracking" | "safety">("tracking");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Monitoring</p>
        <h1 className="text-3xl font-extrabold mt-2">Real-Time Operations</h1>
        <p className="text-sm text-muted-foreground mt-2">Live fleet tracking and safety monitoring</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["tracking", "safety"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-all ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "tracking" && "📍 Live Tracking"}
            {tab === "safety" && "🛡️ Safety Alerts"}
          </button>
        ))}
      </div>

      {/* Live Tracking Tab */}
      {activeTab === "tracking" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Vehicles Online</p>
              <p className="text-2xl font-bold mt-2">6/6</p>
              <p className="text-xs text-success">All GPS connected</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Avg Speed</p>
              <p className="text-2xl font-bold mt-2">42 km/h</p>
              <p className="text-xs text-muted-foreground">Within limits</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Fuel Status</p>
              <p className="text-2xl font-bold mt-2">72%</p>
              <p className="text-xs text-success">Good levels</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { vehicle: "AMB-001", location: "Main Street", speed: "35 km/h", fuel: "78%", status: "moving" },
              { vehicle: "AMB-002", location: "Highway 101", speed: "68 km/h", fuel: "62%", status: "moving" },
              { vehicle: "AMB-003", location: "Workshop", speed: "0 km/h", fuel: "45%", status: "stopped" },
            ].map((item) => (
              <div key={item.vehicle} className={`rounded-lg border-2 p-4 ${
                item.status === "moving" ? "bg-primary/10 border-blue-200" : "bg-muted border-border"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold">{item.vehicle}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {item.location}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs font-semibold ${
                    item.status === "moving" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {item.status === "moving" ? "🚑 MOVING" : "⊛ STOPPED"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Speed</p>
                    <p className="font-semibold">{item.speed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fuel</p>
                    <p className="font-semibold">{item.fuel}</p>
                  </div>
                  <div className="text-right">
                    <Button variant="outline" size="sm">Track</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Alerts Tab */}
      {activeTab === "safety" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Critical Alerts</p>
              <p className="text-2xl font-bold mt-2 text-destructive">2</p>
              <p className="text-xs">Immediate action</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Safety Events</p>
              <p className="text-2xl font-bold mt-2 text-warning">5</p>
              <p className="text-xs">This week</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Fleet Score</p>
              <p className="text-2xl font-bold mt-2 text-success">92/100</p>
              <p className="text-xs">Excellent safety</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { vehicle: "AMB-002", event: "Speeding on Highway 101", severity: "HIGH", time: "2 min ago", action: "Coach Driver" },
              { vehicle: "AMB-001", event: "Harsh braking detected", severity: "MEDIUM", time: "15 min ago", action: "Review" },
              { vehicle: "AMB-003", event: "After-hours movement", severity: "HIGH", time: "1 hour ago", action: "Investigate" },
            ].map((item) => (
              <div key={`${item.vehicle}-${item.event}`} className={`rounded-lg border-l-4 bg-card p-4 ${
                item.severity === "HIGH" ? "border-l-red-600 bg-destructive/10" : "border-l-orange-600 bg-warning/10"
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold">{item.vehicle}</h3>
                    <p className="text-sm mt-1">{item.event}</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs font-semibold ${
                    item.severity === "HIGH" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                  }`}>
                    {item.severity === "HIGH" ? "🔴 CRITICAL" : "🟠 ALERT"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                  <Button variant="outline" size="sm">{item.action}</Button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-bold mb-3">Safety Event Types Monitored</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {[
                "🚨 Speeding events",
                "⚡ Harsh acceleration/braking",
                "🛑 After-hours vehicle use",
                "📍 Geofence breaches",
                "⛔ Route deviations",
                "⏱️ Unauthorized stops",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
