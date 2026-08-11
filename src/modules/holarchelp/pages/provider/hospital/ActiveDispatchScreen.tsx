import { useState } from "react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Clock, Zap, AlertCircle } from "lucide-react";

interface ActiveDispatch {
  ambulance_id: string;
  incident_id: string;
  crew_lead: string;
  status: "en_route" | "on_scene" | "transporting" | "arrived";
  current_location: string;
  destination: string;
  eta: number;
  distance_km: number;
  patient_status: string;
  last_update: string;
}

const MOCK_DISPATCH: ActiveDispatch = {
  ambulance_id: "AMB-001",
  incident_id: "INC-2024-001",
  crew_lead: "John Smith",
  status: "en_route",
  current_location: "Main Street, Downtown",
  destination: "Central Hospital",
  eta: 4,
  distance_km: 2.1,
  patient_status: "Stable, conscious, breathing normal",
  last_update: "1 minute ago",
};

export default function ActiveDispatchScreen() {
  const { providerId } = useProviderAccess();
  const [dispatch] = useState<ActiveDispatch>(MOCK_DISPATCH);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en_route":
        return "bg-blue-100 text-blue-800";
      case "on_scene":
        return "bg-orange-100 text-orange-800";
      case "transporting":
        return "bg-purple-100 text-purple-800";
      case "arrived":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "en_route":
        return "En Route";
      case "on_scene":
        return "On Scene";
      case "transporting":
        return "Transporting Patient";
      case "arrived":
        return "Arrived at Hospital";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <header>
            <h1 className="text-3xl font-bold text-foreground">Active Dispatch: {dispatch.ambulance_id}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Monitor live dispatch status and communication
        </p>
      </header>

      <div className="grid gap-6 max-w-3xl">
        {/* Status Card */}
        <div className="rounded-xl border border-primary bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground">DISPATCH STATUS</p>
              <h2 className="text-2xl font-bold mt-1">{dispatch.ambulance_id}</h2>
            </div>
            <div
              className={`px-4 py-2 rounded-lg font-semibold text-sm ${getStatusColor(
                dispatch.status
              )}`}
            >
              {getStatusLabel(dispatch.status)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Incident ID</p>
              <p className="text-lg font-bold mt-1">{dispatch.incident_id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Crew Lead</p>
              <p className="text-lg font-bold mt-1">{dispatch.crew_lead}</p>
            </div>
          </div>
        </div>

        {/* Location & Navigation */}
        <div className="rounded-xl border border-primary bg-card p-5">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Location & Route
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">CURRENT LOCATION</p>
              <p className="text-base font-semibold mt-1">{dispatch.current_location}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">
                  {dispatch.distance_km} km away
                </p>
                <p className="text-xs text-blue-700">ETA: {dispatch.eta} minutes</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">DESTINATION</p>
              <p className="text-base font-semibold mt-1">{dispatch.destination}</p>
            </div>

            <Button className="w-full" variant="outline">
              <MapPin className="mr-2 h-4 w-4" />
              View Live Map
            </Button>
          </div>
        </div>

        {/* Patient Status */}
        <div className="rounded-xl border border-primary bg-card p-5">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Patient Status
          </h3>

          <div className="space-y-2">
            <p className="text-base font-semibold">{dispatch.patient_status}</p>
            <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
              <p className="text-sm text-green-800">✓ Patient vitals stable and normal</p>
            </div>
          </div>
        </div>

        {/* Crew Communication */}
        <div className="rounded-xl border border-primary bg-card p-5">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Phone className="h-5 w-4 text-primary" />
            Crew Communication
          </h3>

          <div className="space-y-3">
            <Button className="w-full" variant="outline">
              <Phone className="mr-2 h-4 w-4" />
              Call Crew Lead
            </Button>
            <Button className="w-full" variant="outline">
              📱 Send SMS Message
            </Button>
            <Button className="w-full" variant="outline">
              💬 Open Chat
            </Button>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-xl border border-primary bg-card p-5">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-4 text-primary" />
            Dispatch Timeline
          </h3>

          <div className="space-y-3">
            {[
              { time: "14:32", event: "Dispatch sent to crew", status: "completed" },
              { time: "14:33", event: "Crew acknowledged dispatch", status: "completed" },
              { time: "14:35", event: "En route to incident", status: "completed" },
              { time: "14:39 (est)", event: "Arrive at incident location", status: "pending" },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-3">
                <div
                  className={`h-3 w-3 rounded-full mt-1.5 flex-shrink-0 ${
                    item.status === "completed" ? "bg-primary" : "bg-gray-300"
                  }`}
                />
                <div>
                  <p className="text-sm font-semibold">{item.event}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground">
          Last updated: {dispatch.last_update}
        </div>
      </div>
    </div>
  );
}
