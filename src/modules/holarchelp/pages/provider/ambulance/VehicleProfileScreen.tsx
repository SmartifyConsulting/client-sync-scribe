import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wrench, AlertCircle, CheckCircle2, Clock, Fuel } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Vehicle {
  id: string;
  code: string;
  registration: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  type: string;
  engine: string;
  seats: string;
  color: string;
  status: "available" | "assigned" | "out_of_service";
  location: string;
  mileage: number;
  engineHours: number;
  fuelType: string;
  fuelCapacity: number;
  fuelLevel: number;
  lastGpsCheck: string;
  lastService: string;
  nextService: string;
  lastInspection: string;
  insuranceExpiry: string;
  motExpiry: string;
  equipment: { name: string; available: boolean }[];
}

const MOCK_VEHICLES: Record<string, Vehicle> = {
  "AMB-001": {
    id: "1",
    code: "AMB-001",
    registration: "REG-2023-001",
    vin: "WVWZZZ3CZ9E123456",
    make: "Mercedes-Benz",
    model: "Sprinter",
    year: 2023,
    type: "Type-A Ambulance",
    engine: "3.0L Diesel",
    seats: "3 + 2 Stretchers",
    color: "White",
    status: "available",
    location: "Central Depot",
    mileage: 45230,
    engineHours: 1847,
    fuelType: "Diesel",
    fuelCapacity: 80,
    fuelLevel: 75,
    lastGpsCheck: "2026-06-27 14:32",
    lastService: "2026-06-15",
    nextService: "2026-09-15",
    lastInspection: "2026-06-10",
    insuranceExpiry: "2026-12-31",
    motExpiry: "2026-11-30",
    equipment: [
      { name: "Defibrillator (AED)", available: true },
      { name: "Oxygen System (2 cylinders)", available: true },
      { name: "Stretcher & Securing System", available: true },
      { name: "First Aid Kit", available: true },
      { name: "Communication Equipment", available: true },
    ],
  },
};

const STATUS_CONFIG = {
  available: { icon: "âœ“", label: "AVAILABLE", color: "text-success", bg: "bg-success/10", badge: "bg-success/10 text-success" },
  assigned: { icon: "ðŸš‘", label: "IN-SERVICE", color: "text-warning", bg: "bg-warning/10", badge: "bg-warning/10 text-warning" },
  out_of_service: { icon: "âš™", label: "MAINTENANCE", color: "text-muted-foreground", bg: "bg-muted", badge: "bg-muted text-muted-foreground" },
};

export default function VehicleProfileScreen() {
  const { id = "AMB-001" } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const vehicle = MOCK_VEHICLES[id] || MOCK_VEHICLES["AMB-001"];
  const config = STATUS_CONFIG[vehicle.status];

  const calculateDaysUntil = (date: string) => {
    const target = new Date(date);
    const today = new Date();
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const insuranceDays = calculateDaysUntil(vehicle.insuranceExpiry);
  const motDays = calculateDaysUntil(vehicle.motExpiry);
  const serviceDays = calculateDaysUntil(vehicle.nextService);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/provider/ambulance/fleet")} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Fleet
        </Button>
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Ambulance Operations</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-2">{vehicle.code}</h1>
          <p className="text-sm text-muted-foreground mt-1">{vehicle.make} {vehicle.model}</p>
          <p className="text-sm text-muted-foreground">{vehicle.type} â€¢ {vehicle.location}</p>
        </div>
        <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${config.badge}`}>
          {config.icon} {config.label}
        </div>
      </div>

      {/* Vehicle Information */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-bold text-lg">Vehicle Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Registration</p>
            <p className="font-semibold">{vehicle.registration}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">VIN</p>
            <p className="font-semibold text-sm">{vehicle.vin}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Year</p>
            <p className="font-semibold">{vehicle.year}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Make/Model</p>
            <p className="font-semibold">{vehicle.make} {vehicle.model}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Engine</p>
            <p className="font-semibold">{vehicle.engine}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Seats</p>
            <p className="font-semibold">{vehicle.seats}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Color</p>
            <p className="font-semibold">{vehicle.color}</p>
          </div>
        </div>
      </div>

      {/* Operational Status */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-bold text-lg">Operational Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Mileage</p>
            <p className="font-semibold">{vehicle.mileage.toLocaleString()} km</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Engine Hours</p>
            <p className="font-semibold">{vehicle.engineHours.toLocaleString()} hrs</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fuel Type</p>
            <p className="font-semibold">{vehicle.fuelType}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tank Capacity</p>
            <p className="font-semibold">{vehicle.fuelCapacity}L</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fuel Level</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success" style={{ width: `${vehicle.fuelLevel}%` }} />
              </div>
              <p className="font-semibold text-sm">{vehicle.fuelLevel}%</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last GPS Check</p>
            <p className="font-semibold text-sm">{vehicle.lastGpsCheck}</p>
          </div>
        </div>
      </div>

      {/* Service & Maintenance */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-bold text-lg">Service & Maintenance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm text-muted-foreground">Last Service</p>
                <p className="font-semibold">{vehicle.lastService}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
            </div>
          </div>
          <div className={`rounded-lg ${serviceDays < 0 ? "bg-destructive/10" : serviceDays < 30 ? "bg-warning/10" : "bg-success/10"} p-3`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm text-muted-foreground">Next Service</p>
                <p className="font-semibold">{vehicle.nextService}</p>
                <p className={`text-sm mt-1 ${serviceDays < 0 ? "text-destructive" : serviceDays < 30 ? "text-warning" : "text-success"}`}>
                  {serviceDays < 0 ? "OVERDUE" : `${serviceDays} days`}
                </p>
              </div>
              <Clock className={`h-5 w-5 flex-shrink-0 ${serviceDays < 0 ? "text-destructive" : serviceDays < 30 ? "text-warning" : "text-success"}`} />
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">Last Inspection</p>
            <p className="font-semibold">{vehicle.lastInspection}</p>
          </div>
          <div className={`rounded-lg ${insuranceDays < 30 ? "bg-warning/10" : "bg-success/10"} p-3`}>
            <p className="text-sm text-muted-foreground">Insurance Expiry</p>
            <p className="font-semibold">{vehicle.insuranceExpiry}</p>
            <p className={`text-sm mt-1 ${insuranceDays < 30 ? "text-warning" : "text-success"}`}>{insuranceDays} days</p>
          </div>
          <div className={`rounded-lg ${motDays < 30 ? "bg-warning/10" : "bg-success/10"} p-3`}>
            <p className="text-sm text-muted-foreground">MOT Expiry</p>
            <p className="font-semibold">{vehicle.motExpiry}</p>
            <p className={`text-sm mt-1 ${motDays < 30 ? "text-warning" : "text-success"}`}>{motDays} days</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full">
          <Wrench className="h-4 w-4 mr-2" />
          Schedule Service
        </Button>
      </div>

      {/* Equipment */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-bold text-lg">Equipment & Configuration</h2>
        <div className="space-y-2">
          {vehicle.equipment.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50">
              <span className="text-sm font-medium">{item.name}</span>
              {item.available ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="w-full">
          View Equipment Details
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Button variant="default">Assign Vehicle</Button>
        <Button variant="outline">Edit</Button>
        <Button variant="outline">View History</Button>
        <Button variant="outline" className="text-destructive">Delete</Button>
      </div>
    </div>
  );
}

