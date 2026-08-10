import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, ArrowLeftRight } from "lucide-react";

interface Ambulance {
  id: string;
  code: string;
  location: string;
  status: string;
  eta: number;
}

const CURRENT_AMBULANCE: Ambulance = {
  id: "amb_001",
  code: "AMB-001",
  location: "Downtown",
  status: "En Route",
  eta: 7,
};

const AVAILABLE_AMBULANCES: Ambulance[] = [
  {
    id: "amb_002",
    code: "AMB-002",
    location: "North Station",
    status: "Available",
    eta: 9,
  },
  {
    id: "amb_003",
    code: "AMB-003",
    location: "South Station",
    status: "Available",
    eta: 13,
  },
  {
    id: "amb_004",
    code: "AMB-004",
    location: "East Station",
    status: "Available",
    eta: 11,
  },
];

export default function DispatchReassignmentScreen() {
  const { t } = useTranslation();
  const { providerId } = useProviderAccess();
  const [selectedAmbulance, setSelectedAmbulance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reassignmentReason, setReassignmentReason] = useState("");

  const handleReassign = () => {
    if (!selectedAmbulance || !reassignmentReason) {
      alert("Please select an ambulance and provide a reason");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert(`Dispatch reassigned to ${selectedAmbulance}. Previous crew notified.`);
      window.history.back();
    }, 500);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">Reassign Dispatch</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Change ambulance assignment for an active dispatch
        </p>
      </header>

      <div className="grid gap-6 max-w-2xl">
        {/* Current Assignment */}
        <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Current Assignment
          </h3>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Ambulance</p>
              <p className="text-lg font-bold text-orange-900">{CURRENT_AMBULANCE.code}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-base font-semibold text-orange-900">
                {CURRENT_AMBULANCE.location}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-orange-200">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-semibold text-orange-900">{CURRENT_AMBULANCE.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ETA</p>
                <p className="font-semibold text-orange-900">{CURRENT_AMBULANCE.eta} min</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reassignment Reason */}
        <div className="rounded-2xl border bg-card p-6">
          <h3 className="text-lg font-bold mb-4">Reason for Reassignment</h3>
          <select
            value={reassignmentReason}
            onChange={(e) => setReassignmentReason(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a reason...</option>
            <option value="vehicle_breakdown">Vehicle Breakdown</option>
            <option value="crew_emergency">Crew Emergency</option>
            <option value="better_location">Better Available Location</option>
            <option value="capability_mismatch">Capability Mismatch</option>
            <option value="traffic_conditions">Traffic Conditions</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Available Ambulances */}
        <div className="rounded-2xl border bg-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Available Ambulances
          </h3>

          <div className="space-y-2">
            {AVAILABLE_AMBULANCES.map((ambulance) => (
              <div
                key={ambulance.id}
                onClick={() => setSelectedAmbulance(ambulance.code)}
                className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  selectedAmbulance === ambulance.code
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-primary">{ambulance.code}</p>
                    <p className="text-sm text-muted-foreground">{ambulance.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">Available</p>
                    <p className="text-xs text-muted-foreground">ETA: {ambulance.eta} min</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison */}
        {selectedAmbulance && (
          <div className="rounded-2xl border bg-blue-50 p-6">
            <h3 className="text-lg font-bold mb-4">Comparison</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Current ETA:</span>
                <span className="font-bold">{CURRENT_AMBULANCE.eta} minutes</span>
              </div>
              <div className="flex justify-between">
                <span>New ETA:</span>
                <span className="font-bold text-green-600">
                  {AVAILABLE_AMBULANCES.find((a) => a.code === selectedAmbulance)?.eta}{" "}
                  minutes
                </span>
              </div>
              <div className="pt-2 border-t">
                {(() => {
                  const diff =
                    AVAILABLE_AMBULANCES.find((a) => a.code === selectedAmbulance)!.eta -
                    CURRENT_AMBULANCE.eta;
                  return (
                    <p className="text-xs text-blue-700">
                      ℹ️ The new ambulance will arrive {Math.abs(diff)} minute(s){" "}
                      {diff >= 0 ? "later" : "earlier"}
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.history.back()}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-orange-600 hover:bg-orange-700"
            onClick={handleReassign}
            disabled={loading || !selectedAmbulance || !reassignmentReason}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reassigning...
              </>
            ) : (
              "Confirm Reassignment"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
