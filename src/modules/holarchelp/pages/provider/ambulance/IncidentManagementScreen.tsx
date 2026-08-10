import { useState } from "react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, MapPin, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Incident {
  id: string;
  code: string;
  type: "self-created" | "from-hospital";
  severity: "critical" | "high" | "medium" | "low";
  status: "pending" | "accepted" | "declined" | "active" | "completed";
  title: string;
  location: string;
  time_created: string;
  distance_km?: number;
  description: string;
  hospital_name?: string;
  current_capacity_percent?: number;
  assigned_ambulance?: string;
  eta_minutes?: number;
  decline_reason?: string;
  duration_minutes?: number;
}

const MOCK_INCIDENTS: Incident[] = [
  {
    id: "inc_001",
    code: "INC-2024-100",
    type: "self-created",
    severity: "critical",
    status: "active",
    title: "Cardiac Emergency",
    location: "Main Street Downtown",
    time_created: "14:32",
    description: "Patient experiencing chest pain and shortness of breath",
    assigned_ambulance: "AMB-001",
    eta_minutes: 5,
    duration_minutes: 12,
  },
  {
    id: "inc_002",
    code: "INC-2024-050",
    type: "from-hospital",
    severity: "high",
    status: "pending",
    title: "Trauma/Accident",
    location: "Downtown Medical Center",
    distance_km: 3.2,
    time_created: "14:25",
    hospital_name: "Central Hospital",
    current_capacity_percent: 60,
    description: "Multi-vehicle accident with 2 patients, stable vitals",
  },
  {
    id: "inc_003",
    code: "INC-2024-049",
    type: "from-hospital",
    severity: "medium",
    status: "accepted",
    title: "Medical Emergency",
    location: "North Business District",
    distance_km: 5.1,
    time_created: "14:18",
    hospital_name: "North General Hospital",
    assigned_ambulance: "AMB-003",
    eta_minutes: 3,
    description: "Patient experiencing severe allergic reaction",
  },
  {
    id: "inc_004",
    code: "INC-2024-048",
    type: "from-hospital",
    severity: "high",
    status: "declined",
    title: "Trauma",
    location: "City Medical Centre",
    time_created: "14:08",
    hospital_name: "City Medical Centre",
    decline_reason: "No capacity at this time",
    description: "Trauma incident requiring immediate response",
  },
];

const DECLINE_REASONS = [
  "No capacity at this time",
  "Service area too far",
  "Lack of required equipment/specialization",
  "All units currently on emergency",
  "Maintenance/vehicle issue",
  "Staff shortage",
  "Cannot reach location in required time",
  "Other",
];

const SEVERITY_COLORS = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-warning text-warning-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-primary text-primary-foreground",
};

const STATUS_BADGES = {
  pending: "bg-warning/10 text-warning border-warning/40",
  accepted: "bg-success/10 text-success border-success/40",
  declined: "bg-destructive/10 text-destructive border-destructive/40",
  active: "bg-primary/10 text-primary border-primary/40",
  completed: "bg-muted text-muted-foreground border-border",
};

export default function IncidentManagementScreen() {
  const { providerId } = useProviderAccess();
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "completed">("all");
  const [showDeclineDialog, setShowDeclineDialog] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const filteredIncidents = incidents.filter((inc) => {
    if (filter === "all") return true;
    return inc.status === filter;
  });

  const handleAccept = (incidentId: string) => {
    setLoading(true);
    setTimeout(() => {
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === incidentId ? { ...inc, status: "accepted" as const } : inc
        )
      );
      setLoading(false);
      alert("Incident accepted! Dispatching ambulance...");
    }, 500);
  };

  const handleDecline = (incidentId: string) => {
    if (!selectedReason) {
      alert("Please select a decline reason");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === incidentId
            ? {
                ...inc,
                status: "declined" as const,
                decline_reason: selectedReason,
              }
            : inc
        )
      );
      setLoading(false);
      setShowDeclineDialog(null);
      setSelectedReason("");
      alert("Incident declined. Hospital will be notified to select alternative.");
    }, 500);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "⚠ PENDING YOUR RESPONSE";
      case "accepted":
        return "✓ ACCEPTED";
      case "active":
        return "🚑 ACTIVE";
      case "completed":
        return "✓ COMPLETED";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          ER Provider Operations
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Incident Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All incidents (self-created and from affiliated hospitals)
        </p>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {["all", "pending", "active", "completed"].map((f) => (
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

      {/* Incidents List */}
      <div className="space-y-4">
        {filteredIncidents.map((incident) => (
          <div
            key={incident.id}
            className={cn(
              "rounded-2xl border-2 p-6 space-y-3",
              incident.status === "pending" ? "border-warning/40 bg-warning/10" : "border-border bg-card"
            )}
          >
            {/* Header Row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      "px-3 py-1 rounded text-sm font-bold text-white",
                      SEVERITY_COLORS[incident.severity]
                    )}
                  >
                    {incident.severity.toUpperCase()}
                  </span>
                  <span
                    className={cn(
                      "px-3 py-1 rounded text-sm font-semibold border",
                      STATUS_BADGES[incident.status]
                    )}
                  >
                    {getStatusLabel(incident.status)}
                  </span>
                </div>
                <h3 className="text-lg font-bold">{incident.code}</h3>
                <p className="text-sm text-muted-foreground mt-1">{incident.title}</p>
              </div>
            </div>

            {/* Source Badge */}
            {incident.type === "from-hospital" && (
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                🏥 FROM: {incident.hospital_name}
              </div>
            )}
            {incident.type === "self-created" && (
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm font-semibold">
                📋 Self-Created
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-semibold flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {incident.location}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Received</p>
                <p className="font-semibold mt-1">{incident.time_created}</p>
              </div>
              {incident.distance_km && (
                <div>
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="font-semibold mt-1">{incident.distance_km} km away</p>
                </div>
              )}
              {incident.current_capacity_percent !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground">Your Capacity</p>
                  <p className="font-semibold mt-1">{incident.current_capacity_percent}%</p>
                </div>
              )}
              {incident.duration_minutes && (
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-semibold flex items-center gap-1 mt-1">
                    <Clock className="h-4 w-4" />
                    {incident.duration_minutes} minutes
                  </p>
                </div>
              )}
              {incident.assigned_ambulance && (
                <div>
                  <p className="text-xs text-muted-foreground">Assigned Ambulance</p>
                  <p className="font-semibold mt-1">{incident.assigned_ambulance}</p>
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-sm bg-muted/50 p-3 rounded-lg">{incident.description}</p>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {incident.status === "pending" && incident.type === "from-hospital" && (
                <>
                  <Button
                    className="flex-1 bg-success hover:bg-success"
                    onClick={() => handleAccept(incident.id)}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Accept
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive border-destructive/40"
                    onClick={() => setShowDeclineDialog(incident.id)}
                    disabled={loading}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Decline
                  </Button>
                </>
              )}

              {incident.status === "active" && (
                <>
                  <Button variant="outline" className="flex-1">
                    View Details
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Track Live
                  </Button>
                  {incident.assigned_ambulance && (
                    <Button variant="outline" className="flex-1">
                      Mark Arrived
                    </Button>
                  )}
                </>
              )}

              {incident.status === "accepted" && (
                <>
                  <Button variant="outline" className="flex-1">
                    View Details
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Track Live
                  </Button>
                </>
              )}

              {incident.status === "declined" && incident.type === "from-hospital" && (
                <div className="w-full">
                  <p className="text-sm text-muted-foreground">
                    ✗ Declined at • Reason: "{incident.decline_reason}"
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hospital is selecting alternative provider
                  </p>
                </div>
              )}
            </div>

            {/* Decline Dialog */}
            {showDeclineDialog === incident.id && (
              <div className="border-t pt-4 space-y-3">
                <p className="font-semibold">Select Decline Reason:</p>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Choose a reason --</option>
                  {DECLINE_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowDeclineDialog(null);
                      setSelectedReason("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-destructive hover:bg-destructive"
                    onClick={() => handleDecline(incident.id)}
                    disabled={!selectedReason || loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Declining...
                      </>
                    ) : (
                      "Submit Decline"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredIncidents.length === 0 && (
        <div className="rounded-2xl border bg-muted p-8 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No {filter !== "all" ? filter : ""} incidents</p>
        </div>
      )}
    </div>
  );
}
