import { useState } from "react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { MapPin, Users, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Hospital {
  id: string;
  name: string;
  distance_km: number;
  eta_minutes: number;
  specialty: string[];
  capacity: {
    trauma: number;
    cardiac: number;
    medical: number;
  };
  current_wait: number;
  contact: string;
  address: string;
}

const HOSPITALS: Hospital[] = [
  {
    id: "h_001",
    name: "Central Hospital",
    distance_km: 3.2,
    eta_minutes: 10,
    specialty: ["Trauma", "Cardiac", "General"],
    capacity: { trauma: 8, cardiac: 5, medical: 12 },
    current_wait: 45,
    contact: "+27 11 234 5678",
    address: "123 Main Street, Downtown",
  },
  {
    id: "h_002",
    name: "City Medical Centre",
    distance_km: 4.1,
    eta_minutes: 12,
    specialty: ["Cardiac", "General", "Pediatric"],
    capacity: { trauma: 3, cardiac: 8, medical: 15 },
    current_wait: 60,
    contact: "+27 11 345 6789",
    address: "456 Park Ave, City Centre",
  },
  {
    id: "h_003",
    name: "North General Hospital",
    distance_km: 5.5,
    eta_minutes: 16,
    specialty: ["General", "Trauma"],
    capacity: { trauma: 6, cardiac: 2, medical: 10 },
    current_wait: 20,
    contact: "+27 11 456 7890",
    address: "789 North Rd, North District",
  },
];

export default function HospitalSelectionScreen() {
  const { providerId } = useProviderAccess();
  const [selectedHospital, setSelectedHospital] = useState<string | null>(HOSPITALS[0].id);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Dispatch Management
        </p>
        <h1 className="text-3xl font-extrabold">Select Hospital Destination</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the most appropriate hospital for the patient
        </p>
      </header>

      <div className="grid gap-4 max-w-2xl">
        {HOSPITALS.map((hospital) => (
          <div
            key={hospital.id}
            onClick={() => setSelectedHospital(hospital.id)}
            className={`rounded-2xl border-2 p-6 cursor-pointer transition-all ${
              selectedHospital === hospital.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-primary">{hospital.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {hospital.address}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-orange-600">{hospital.eta_minutes} min ETA</p>
                <p className="text-xs text-muted-foreground">{hospital.distance_km} km away</p>
              </div>
            </div>

            {/* Specialties */}
            <div className="mb-4 flex flex-wrap gap-2">
              {hospital.specialty.map((spec) => (
                <span
                  key={spec}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold"
                >
                  {spec}
                </span>
              ))}
            </div>

            {/* Capacity */}
            <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-muted rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Trauma Beds</p>
                <p className="font-bold text-sm">{hospital.capacity.trauma}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cardiac Beds</p>
                <p className="font-bold text-sm">{hospital.capacity.cardiac}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Medical Beds</p>
                <p className="font-bold text-sm">{hospital.capacity.medical}</p>
              </div>
            </div>

            {/* Wait Time */}
            <div
              className={cn(
                "rounded-lg p-3 flex items-center gap-2",
                hospital.current_wait > 45
                  ? "bg-orange-50 border border-orange-200"
                  : "bg-green-50 border border-green-200"
              )}
            >
              <AlertCircle
                className={cn(
                  "h-4 w-4",
                  hospital.current_wait > 45 ? "text-orange-600" : "text-green-600"
                )}
              />
              <p className="text-sm font-semibold">
                Current wait: {hospital.current_wait} minutes
              </p>
            </div>

            {/* Contact */}
            <div className="mt-3 text-xs text-muted-foreground">
              <p>Direct: {hospital.contact}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {selectedHospital && (
        <div className="rounded-2xl border bg-card p-6 max-w-2xl">
          <h3 className="text-sm font-bold mb-3">SELECTED DESTINATION</h3>
          <p className="text-lg font-bold">
            {HOSPITALS.find((h) => h.id === selectedHospital)?.name}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            ETA:{" "}
            {HOSPITALS.find((h) => h.id === selectedHospital)?.eta_minutes} minutes
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 max-w-2xl">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => window.history.back()}
        >
          Back
        </Button>
        <Button className="flex-1" onClick={() => alert("Hospital selected!")}>
          Confirm Selection
        </Button>
      </div>
    </div>
  );
}
