import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

interface Driver {
  id: string;
  name: string;
  role: string;
  licenseExpiry: string;
  score: number;
  incidents: number;
  status: "active" | "inactive" | "suspended";
}

const MOCK_DRIVERS: Driver[] = [
  {
    id: "1",
    name: "John Smith",
    role: "Paramedic",
    licenseExpiry: "2027-03-15",
    score: 92,
    incidents: 0,
    status: "active",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    role: "EMT",
    licenseExpiry: "2026-08-20",
    score: 85,
    incidents: 1,
    status: "active",
  },
  {
    id: "3",
    name: "Mike Brown",
    role: "Driver",
    licenseExpiry: "2026-12-01",
    score: 78,
    incidents: 2,
    status: "active",
  },
  {
    id: "4",
    name: "Lisa Davis",
    role: "Paramedic",
    licenseExpiry: "2025-09-30",
    score: 65,
    incidents: 4,
    status: "suspended",
  },
];

export default function DriverManagementScreen() {
  const [drivers] = useState<Driver[]>(MOCK_DRIVERS);
  const [filter, setFilter] = useState<"all" | "active" | "suspended">("all");

  const filteredDrivers = filter === "all" ? drivers : drivers.filter((d) => d.status === filter);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Personnel</p>
          <h1 className="text-3xl font-extrabold mt-2">Driver & Crew Management</h1>
          <p className="text-sm text-muted-foreground mt-2">Manage staff, licenses, and performance</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Driver
        </Button>
      </header>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "active", "suspended"].map((f) => (
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Staff</p>
          <p className="text-2xl font-bold mt-2">{drivers.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{drivers.filter((d) => d.status === "active").length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Avg Score</p>
          <p className={`text-2xl font-bold mt-2 ${getScoreColor(Math.round(drivers.reduce((s, d) => s + d.score, 0) / drivers.length))}`}>
            {Math.round(drivers.reduce((s, d) => s + d.score, 0) / drivers.length)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Licenses Expiring</p>
          <p className="text-2xl font-bold text-orange-600 mt-2">
            {drivers.filter((d) => new Date(d.licenseExpiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).length}
          </p>
        </div>
      </div>

      {/* Drivers List */}
      <div className="space-y-3">
        {filteredDrivers.map((driver) => (
          <div key={driver.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg">{driver.name}</h3>
                <p className="text-xs text-muted-foreground">{driver.role}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  driver.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {driver.status === "active" ? "Active" : "Suspended"}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Performance Score</p>
                <p className={`text-lg font-bold mt-1 ${getScoreColor(driver.score)}`}>{driver.score}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Incidents</p>
                <p className={`text-lg font-bold mt-1 ${driver.incidents > 2 ? "text-red-600" : "text-green-600"}`}>
                  {driver.incidents}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">License Expiry</p>
                <p className="font-semibold text-sm mt-1">{driver.licenseExpiry}</p>
              </div>
              <div className="text-right">
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
