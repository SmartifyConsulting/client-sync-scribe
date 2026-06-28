import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, Zap } from "lucide-react";

interface AvailabilitySlot {
  vehicleCode: string;
  type: string;
  availableFrom: string;
  duration: number;
  reason: string;
  status: "available" | "soon";
}

const MOCK_AVAILABILITY: AvailabilitySlot[] = [
  {
    vehicleCode: "AMB-001",
    type: "Type-A",
    availableFrom: "2026-06-27 16:00",
    duration: 240,
    reason: "Crew shift change",
    status: "available",
  },
  {
    vehicleCode: "AMB-002",
    type: "Type-A",
    availableFrom: "2026-06-27 20:00",
    duration: 480,
    reason: "Scheduled maintenance",
    status: "soon",
  },
  {
    vehicleCode: "AMB-003",
    type: "Type-B",
    availableFrom: "2026-06-28 08:00",
    duration: 1440,
    reason: "Service completion",
    status: "soon",
  },
];

export default function VehicleAvailabilityScreen() {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Fleet Operations</p>
        <h1 className="text-3xl font-extrabold mt-2">Vehicle Availability</h1>
        <p className="text-sm text-muted-foreground mt-2">View upcoming availability and schedule assignments</p>
      </header>

      {/* Availability Timeline */}
      <div className="space-y-3">
        {MOCK_AVAILABILITY.map((slot) => (
          <div
            key={slot.vehicleCode}
            onClick={() => setSelectedVehicle(slot.vehicleCode)}
            className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${
              selectedVehicle === slot.vehicleCode ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg">{slot.vehicleCode}</h3>
                <p className="text-xs text-muted-foreground">{slot.type} Ambulance</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  slot.status === "available"
                    ? "bg-success/10 text-success"
                    : "bg-warning/10 text-warning"
                }`}
              >
                {slot.status === "available" ? "Available Now" : "Available Soon"}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Available From</p>
                <p className="font-semibold text-sm mt-1">{slot.availableFrom}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-semibold text-sm mt-1">{slot.duration} minutes</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reason</p>
                <p className="font-semibold text-sm mt-1">{slot.reason}</p>
              </div>
            </div>

            {selectedVehicle === slot.vehicleCode && (
              <div className="mt-4 pt-4 border-t space-y-2">
                <Button className="w-full">Assign This Vehicle</Button>
                <Button variant="outline" className="w-full">
                  View Details
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-4 text-center">
          <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Available Now</p>
          <p className="text-2xl font-bold mt-1">3</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <Clock className="h-6 w-6 text-warning mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Available Soon</p>
          <p className="text-2xl font-bold mt-1">2</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">In Service</p>
          <p className="text-2xl font-bold mt-1">7</p>
        </div>
      </div>
    </div>
  );
}
