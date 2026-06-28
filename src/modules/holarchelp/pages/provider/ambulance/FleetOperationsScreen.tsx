import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface Vehicle {
  code: string;
  make: string;
  status: "available" | "in-service" | "maintenance";
  mileage: number;
  lastService: string;
  nextService: string;
  serviceType: string;
  maintenanceStatus: "scheduled" | "in-progress" | "overdue";
  maintenanceDate: string;
  daysOverdue?: number;
  trips: number;
  utilization: number;
  avgDistance: number;
}

const VEHICLES: Vehicle[] = [
  {
    code: "AMB-001",
    make: "Mercedes-Benz Sprinter",
    status: "available",
    mileage: 45230,
    lastService: "2026-06-25",
    nextService: "2026-07-15",
    serviceType: "Oil Change",
    maintenanceStatus: "scheduled",
    maintenanceDate: "2026-07-15",
    trips: 312,
    utilization: 78,
    avgDistance: 28.5,
  },
  {
    code: "AMB-002",
    make: "Mercedes-Benz Sprinter",
    status: "in-service",
    mileage: 52150,
    lastService: "2026-06-20",
    nextService: "2026-08-10",
    serviceType: "Filter Replacement",
    maintenanceStatus: "overdue",
    maintenanceDate: "2026-06-20",
    daysOverdue: 8,
    trips: 289,
    utilization: 91,
    avgDistance: 32.1,
  },
  {
    code: "AMB-003",
    make: "Volkswagen Transporter",
    status: "maintenance",
    mileage: 38900,
    lastService: "2026-06-28",
    nextService: "2026-07-30",
    serviceType: "Brake Service",
    maintenanceStatus: "in-progress",
    maintenanceDate: "2026-06-30",
    trips: 245,
    utilization: 64,
    avgDistance: 25.8,
  },
];

export default function FleetOperationsScreen() {
  const [searchCode, setSearchCode] = useState("");

  const filteredVehicles = useMemo(
    () =>
      VEHICLES.filter((v) =>
        searchCode ? v.code.toLowerCase().includes(searchCode.toLowerCase()) : true
      ),
    [searchCode]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return { badge: "bg-green-100 text-green-800", icon: "✓" };
      case "in-service":
        return { badge: "bg-amber-100 text-amber-800", icon: "🚑" };
      case "maintenance":
        return { badge: "bg-gray-100 text-gray-800", icon: "⚙" };
      default:
        return { badge: "bg-gray-100 text-gray-800", icon: "•" };
    }
  };

  const getMaintenanceStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-amber-100 text-amber-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getMaintenanceLabel = (status: string, date: string, daysOverdue?: number) => {
    if (status === "scheduled") return `SCHEDULED - ${date.split("-").slice(1).join("/")}`;
    if (status === "in-progress") return `IN PROGRESS - Est. ${date.split("-").slice(1).join("/")}`;
    if (status === "overdue") return `OVERDUE - ${daysOverdue} DAYS`;
    return status.toUpperCase();
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Operations</p>
        <h1 className="text-3xl font-extrabold mt-2">Fleet Operations</h1>
        <p className="text-sm text-muted-foreground mt-2">6 vehicles • 3 available • 2 in-service • 1 maintenance</p>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Vehicles</p>
          <p className="text-2xl font-bold mt-2">6</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Utilization Rate</p>
          <p className="text-2xl font-bold mt-2">76.4%</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Mileage</p>
          <p className="text-2xl font-bold mt-2">13.5k km</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Cost/Vehicle</p>
          <p className="text-2xl font-bold mt-2">$4.2k/mo</p>
        </div>
      </div>

      {/* Vehicles Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">🚑 Vehicles</h2>

        {filteredVehicles.map((vehicle) => {
          const statusColor = getStatusColor(vehicle.status);
          const maintenanceColor = getMaintenanceStatusColor(vehicle.maintenanceStatus);

          return (
            <div key={vehicle.code} className="rounded-lg border bg-card p-4 space-y-3">
              {/* Header Row */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg">{vehicle.code} — {vehicle.make}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mileage: {vehicle.mileage.toLocaleString()} km · Last Service: {vehicle.lastService}
                  </p>
                </div>
                <span className={`px-3 py-1.5 rounded text-xs font-semibold ${statusColor.badge}`}>
                  {statusColor.icon} {vehicle.status.toUpperCase().replace("-", " ")}
                </span>
              </div>

              {/* Maintenance Status */}
              <div>
                <span className={`inline-block px-3 py-1.5 rounded text-xs font-semibold ${maintenanceColor}`}>
                  {getMaintenanceLabel(vehicle.maintenanceStatus, vehicle.maintenanceDate, vehicle.daysOverdue)}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t" />

              {/* Vehicle Utilization */}
              <div className="bg-gray-50 dark:bg-gray-900/30 rounded p-3 space-y-2">
                <p className="text-sm font-semibold">Vehicle Utilization</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Trips This Month</p>
                    <p className="font-semibold mt-1">{vehicle.trips}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Utilization</p>
                    <p className="font-semibold mt-1">{vehicle.utilization}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Distance/Trip</p>
                    <p className="font-semibold mt-1">{vehicle.avgDistance} km</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Profile
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Edit
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fleet Efficiency Metrics */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="font-bold">Fleet Efficiency Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
          <div className="flex justify-between">
            <span className="text-muted-foreground">Average Trips per Month</span>
            <span className="font-semibold">3,675</span>
          </div>
        </div>
      </div>
    </div>
  );
}
