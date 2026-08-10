import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, MapPin, Clock } from "lucide-react";

interface CrewMember {
  id: string;
  name: string;
  role: string;
  available: boolean;
}

interface Assignment {
  vehicleCode: string;
  crew: CrewMember[];
  route?: string;
  startTime?: string;
  duration?: number;
}

const MOCK_CREW: CrewMember[] = [
  { id: "1", name: "John Smith", role: "Paramedic", available: true },
  { id: "2", name: "Sarah Johnson", role: "EMT", available: true },
  { id: "3", name: "Mike Brown", role: "Driver", available: false },
  { id: "4", name: "Lisa Davis", role: "Paramedic", available: true },
  { id: "5", name: "David Wilson", role: "EMT", available: true },
];

export default function VehicleAssignmentScreen() {
  const [selectedVehicle, setSelectedVehicle] = useState("AMB-001");
  const [selectedCrew, setSelectedCrew] = useState<string[]>([]);
  const [assignment, setAssignment] = useState<Partial<Assignment>>({
    vehicleCode: "AMB-001",
    crew: [],
  });

  const toggleCrew = (crewId: string) => {
    setSelectedCrew((prev) =>
      prev.includes(crewId) ? prev.filter((id) => id !== crewId) : [...prev, crewId]
    );
  };

  const handleAssign = () => {
    const assignedCrew = MOCK_CREW.filter((c) => selectedCrew.includes(c.id));
    setAssignment({
      vehicleCode: selectedVehicle,
      crew: assignedCrew,
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fleet Operations</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-2">Vehicle Assignment</h1>
        <p className="text-sm text-muted-foreground mt-2">Assign vehicles to crew and routes</p>
      </header>

      {/* Vehicle Selection */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-bold text-lg">Select Vehicle</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {["AMB-001", "AMB-002", "AMB-003"].map((vehicle) => (
            <button
              key={vehicle}
              onClick={() => {
                setSelectedVehicle(vehicle);
                setSelectedCrew([]);
              }}
              className={`rounded-xl border p-4 transition-all text-left ${
                selectedVehicle === vehicle
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="font-bold text-lg">{vehicle}</p>
              <p className="text-xs text-muted-foreground">Type-A Ambulance</p>
            </button>
          ))}
        </div>
      </div>

      {/* Crew Selection */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Select Crew Members
        </h2>
        <div className="space-y-2">
          {MOCK_CREW.map((crew) => (
            <div
              key={crew.id}
              className={`rounded-xl border p-3 cursor-pointer transition-all ${
                selectedCrew.includes(crew.id)
                  ? "border-primary bg-primary/5"
                  : "border-border"
              } ${!crew.available ? "opacity-50" : ""}`}
              onClick={() => crew.available && toggleCrew(crew.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{crew.name}</p>
                  <p className="text-xs text-muted-foreground">{crew.role}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedCrew.includes(crew.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  }`}
                >
                  {selectedCrew.includes(crew.id) && <span className="text-sm">✓</span>}
                </div>
              </div>
              {!crew.available && (
                <p className="text-xs text-destructive mt-1">Not available</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Assignment Details */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h2 className="font-bold text-lg">Assignment Details</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Route/Location</label>
            <input
              type="text"
              placeholder="Enter route or location"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Start Time</label>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Duration (minutes)</label>
            <input
              type="number"
              placeholder="Duration"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Summary & Assign */}
      {selectedCrew.length > 0 && (
        <div className="rounded-xl border border-primary bg-primary/5 p-4 space-y-3">
          <h3 className="font-bold">Assignment Summary</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Vehicle:</span> <span className="font-semibold">{selectedVehicle}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Crew:</span> <span className="font-semibold">{selectedCrew.length} member(s)</span>
            </p>
            <div className="space-y-1">
              {MOCK_CREW.filter((c) => selectedCrew.includes(c.id)).map((crew) => (
                <p key={crew.id} className="text-xs text-muted-foreground ml-4">
                  • {crew.name} ({crew.role})
                </p>
              ))}
            </div>
          </div>
          <Button onClick={handleAssign} className="w-full">
            Confirm Assignment
          </Button>
        </div>
      )}

      {!selectedCrew.length && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Select crew members to create assignment</p>
        </div>
      )}
    </div>
  );
}
