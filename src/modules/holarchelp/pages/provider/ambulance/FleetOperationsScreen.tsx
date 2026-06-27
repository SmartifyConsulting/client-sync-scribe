import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wrench, TrendingUp, Calendar, AlertCircle } from "lucide-react";

export default function FleetOperationsScreen() {
  const [activeTab, setActiveTab] = useState<"vehicles" | "availability" | "maintenance" | "utilisation">("vehicles");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Operations</p>
        <h1 className="text-3xl font-extrabold mt-2">Fleet Operations</h1>
        <p className="text-sm text-muted-foreground mt-2">6 vehicles • 3 available • 2 in-service • 1 maintenance</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["vehicles", "availability", "maintenance", "utilisation"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-all ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "vehicles" && "🚑 Vehicles"}
            {tab === "availability" && "📅 Availability"}
            {tab === "maintenance" && "🔧 Maintenance"}
            {tab === "utilisation" && "📊 Utilisation"}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "vehicles" && (
        <div className="space-y-3">
          {[
            { code: "AMB-001", make: "Mercedes-Benz Sprinter", status: "✓ AVAILABLE", mileage: "45,230 km" },
            { code: "AMB-002", make: "Mercedes-Benz Sprinter", status: "🚑 IN-SERVICE", mileage: "52,150 km" },
            { code: "AMB-003", make: "Volkswagen Transporter", status: "⚙ MAINTENANCE", mileage: "38,900 km" },
          ].map((vehicle) => (
            <div key={vehicle.code} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{vehicle.code}</h3>
                  <p className="text-xs text-muted-foreground">{vehicle.make}</p>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-semibold ${
                  vehicle.status.includes("AVAILABLE") ? "bg-green-100 text-green-800" :
                  vehicle.status.includes("IN-SERVICE") ? "bg-orange-100 text-orange-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {vehicle.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Mileage</p>
                  <p className="font-semibold">{vehicle.mileage}</p>
                </div>
                <div className="text-right">
                  <Button variant="outline" size="sm">View Profile</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "availability" && (
        <div className="space-y-3">
          {[
            { code: "AMB-001", available: "Now", reason: "Ready to deploy" },
            { code: "AMB-002", available: "In 2 hours", reason: "Crew change & cleaning" },
            { code: "AMB-003", available: "In 6 hours", reason: "Scheduled maintenance" },
          ].map((item) => (
            <div key={item.code} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{item.code}</p>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                </div>
                <span className="text-lg font-bold text-primary">{item.available}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "maintenance" && (
        <div className="space-y-3">
          {[
            { vehicle: "AMB-001", service: "Oil Change", status: "Pending", due: "2026-06-30", cost: "$150" },
            { vehicle: "AMB-002", service: "Filter Replacement", status: "In Progress", due: "2026-06-28", cost: "$200" },
            { vehicle: "AMB-003", service: "Brake Service", status: "Overdue", due: "2026-06-20", cost: "$500" },
          ].map((item) => (
            <div key={`${item.vehicle}-${item.service}`} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold">{item.vehicle}</p>
                  <p className="text-sm text-muted-foreground">{item.service}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  item.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                  item.status === "In Progress" ? "bg-blue-100 text-blue-800" :
                  "bg-red-100 text-red-800"
                }`}>
                  {item.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Due</p>
                  <p className="font-semibold">{item.due}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="font-semibold">{item.cost}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "utilisation" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Average Utilisation</p>
              <p className="text-2xl font-bold mt-2">76.4%</p>
              <p className="text-xs text-green-600 mt-1">↑ 5% vs last month</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total Trips</p>
              <p className="text-2xl font-bold mt-2">3,675</p>
              <p className="text-xs text-green-600 mt-1">↑ 12% vs last month</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total Mileage</p>
              <p className="text-2xl font-bold mt-2">13,520</p>
              <p className="text-xs text-gray-600 mt-1">km this month</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Operating Cost</p>
              <p className="text-2xl font-bold mt-2">$4,250</p>
              <p className="text-xs text-gray-600 mt-1">per vehicle/month</p>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-bold mb-3">Fleet Efficiency Metrics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fuel Consumption</span>
                <span className="font-semibold">6.8 L/100km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost per km</span>
                <span className="font-semibold">$0.31</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Downtime (Maintenance)</span>
                <span className="font-semibold">2.3%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
