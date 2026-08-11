import { useState } from "react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Clock, Loader2, CheckCircle2 } from "lucide-react";

interface Ambulance {
  id: string;
  code: string;
  distance_km: number;
  eta_minutes: number;
  crew: string;
  status: "available" | "en_route" | "on_scene" | "busy";
  location: string;
  vehicle_type: string;
}

const RECOMMENDED_AMBULANCES: Ambulance[] = [
  {
    id: "amb_001",
    code: "AMB-001",
    distance_km: 2.3,
    eta_minutes: 7,
    crew: "John Smith & Sarah Jones",
    status: "available",
    location: "Downtown Station",
    vehicle_type: "Advanced Life Support",
  },
  {
    id: "amb_002",
    code: "AMB-002",
    distance_km: 3.1,
    eta_minutes: 9,
    crew: "Mike Johnson & Emma Wilson",
    status: "available",
    location: "North Station",
    vehicle_type: "Advanced Life Support",
  },
  {
    id: "amb_003",
    code: "AMB-003",
    distance_km: 4.5,
    eta_minutes: 13,
    crew: "David Brown & Lisa Martinez",
    status: "available",
    location: "South Station",
    vehicle_type: "Basic Life Support",
  },
];

export default function NearestAmbulanceScreen() {
  const { providerId } = useProviderAccess();
  const [selectedAmbulance, setSelectedAmbulance] = useState<string | null>(
    RECOMMENDED_AMBULANCES[0].id
  );
  const [loading, setLoading] = useState(false);

  const handleSelect = (ambulanceId: string) => {
    setSelectedAmbulance(ambulanceId);
  };

  const handleDispatch = () => {
    if (!selectedAmbulance) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      window.location.href = `/provider/hospital/incident/create/dispatch-assignment?ambulance=${selectedAmbulance}`;
    }, 500);
  };

  return (
    <div className="space-y-6">
      <header>
            <h1 className="text-3xl font-bold text-foreground">Recommended Ambulances</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Select the nearest available ambulance for dispatch
        </p>
      </header>

      <div className="grid gap-4 max-w-2xl">
        {RECOMMENDED_AMBULANCES.map((ambulance) => (
          <div
            key={ambulance.id}
            onClick={() => handleSelect(ambulance.id)}
            className={`rounded-xl border-2 p-5 cursor-pointer transition-all ${
              selectedAmbulance === ambulance.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-primary">{ambulance.code}</h3>
                <p className="text-sm text-muted-foreground">{ambulance.vehicle_type}</p>
              </div>
              {selectedAmbulance === ambulance.id && (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-orange-600" />
                <span className="font-medium">{ambulance.distance_km} km away</span>
                <span className="text-muted-foreground">• {ambulance.location}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium">ETA: {ambulance.eta_minutes} mins</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-green-600" />
                <span className="font-medium">{ambulance.crew}</span>
              </div>

              <div className="pt-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    ambulance.status === "available"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {ambulance.status === "available" ? "✓ Available" : "En Route"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="rounded-xl border border-primary bg-card p-5 max-w-2xl">
        <h3 className="text-sm font-bold mb-3">DISPATCH SUMMARY</h3>
        {selectedAmbulance && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Selected Vehicle:</span>
              <span className="font-semibold">
                {RECOMMENDED_AMBULANCES.find((a) => a.id === selectedAmbulance)?.code}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated ETA:</span>
              <span className="font-semibold">
                {RECOMMENDED_AMBULANCES.find((a) => a.id === selectedAmbulance)
                  ?.eta_minutes}{" "}
                minutes
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Crew:</span>
              <span className="font-semibold">
                {RECOMMENDED_AMBULANCES.find((a) => a.id === selectedAmbulance)?.crew}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 max-w-2xl">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => window.history.back()}
        >
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={handleDispatch}
          disabled={loading || !selectedAmbulance}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Dispatch Ambulance"
          )}
        </Button>
      </div>
    </div>
  );
}
