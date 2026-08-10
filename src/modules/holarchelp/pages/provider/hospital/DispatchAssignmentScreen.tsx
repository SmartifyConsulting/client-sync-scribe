import { useState } from "react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Send, MapPin, Phone } from "lucide-react";

interface DispatchData {
  ambulance_id: string;
  incident_id: string;
  crew_lead: string;
  route_priority: "fastest" | "safest" | "standard";
  special_instructions: string;
  hospital_destination: string;
  contact_number: string;
}

export default function DispatchAssignmentScreen() {
  const { providerId } = useProviderAccess();
  const [loading, setLoading] = useState(false);
  const [dispatch, setDispatch] = useState<DispatchData>({
    ambulance_id: "AMB-001",
    incident_id: "INC-2024-001",
    crew_lead: "John Smith",
    route_priority: "fastest",
    special_instructions: "",
    hospital_destination: "Central Hospital",
    contact_number: "+27 11 234 5678",
  });

  const handleChange = (field: keyof DispatchData, value: any) => {
    setDispatch((prev) => ({ ...prev, [field]: value }));
  };

  const handleDispatchConfirm = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Send notification to crew
      alert(
        `Dispatch sent to ${dispatch.ambulance_id}! Crew will receive SMS notification.`
      );
      window.location.href = `/provider/hospital/incident/active-dispatch/${dispatch.ambulance_id}`;
    }, 500);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Emergency Dispatch
        </p>
        <h1 className="text-3xl font-extrabold">Confirm Dispatch Assignment</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Finalize assignment and send dispatch to crew
        </p>
      </header>

      <div className="grid gap-6 max-w-2xl">
        {/* Dispatch Details */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Dispatch Details</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  Ambulance
                </label>
                <p className="text-lg font-bold mt-1">{dispatch.ambulance_id}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  Incident ID
                </label>
                <p className="text-lg font-bold mt-1">{dispatch.incident_id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  Crew Lead
                </label>
                <p className="text-lg font-bold mt-1">{dispatch.crew_lead}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-muted-foreground">
                  Contact
                </label>
                <p className="text-lg font-bold mt-1">{dispatch.contact_number}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Destination */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Hospital Destination
          </h2>
          <select
            value={dispatch.hospital_destination}
            onChange={(e) => handleChange("hospital_destination", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option>Central Hospital</option>
            <option>City Medical Centre</option>
            <option>North General Hospital</option>
            <option>Emergency Care Unit</option>
          </select>
          <p className="text-xs text-muted-foreground mt-2">
            Crew will navigate to this hospital destination
          </p>
        </div>

        {/* Route Priority */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Route Priority</h2>
          <div className="space-y-2">
            {[
              {
                value: "fastest",
                label: "Fastest Route",
                desc: "Quickest time, may use major roads",
              },
              {
                value: "safest",
                label: "Safest Route",
                desc: "Avoids dangerous areas",
              },
              {
                value: "standard",
                label: "Standard Route",
                desc: "Balanced approach",
              },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
              >
                <input
                  type="radio"
                  name="route"
                  value={option.value}
                  checked={dispatch.route_priority === option.value}
                  onChange={(e) =>
                    handleChange("route_priority", e.target.value)
                  }
                  className="h-4 w-4"
                />
                <div className="ml-3 flex-1">
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Special Instructions */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Special Instructions</h2>
          <textarea
            value={dispatch.special_instructions}
            onChange={(e) => handleChange("special_instructions", e.target.value)}
            placeholder="Any special instructions for the crew (e.g., access notes, hazards, patient information)..."
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Notification Summary */}
        <div className="rounded-2xl border-l-4 border-l-primary bg-blue-50 p-4">
          <div className="flex gap-3">
            <Send className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Notifications will be sent to:</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>✓ Crew Lead ({dispatch.crew_lead})</li>
                <li>✓ Hospital Destination</li>
                <li>✓ Dispatch Control Center</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.history.back()}
          >
            Back
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={handleDispatchConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Dispatch
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
