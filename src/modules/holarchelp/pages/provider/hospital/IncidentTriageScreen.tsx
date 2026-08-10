import { useState } from "react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TriageData {
  severity: "critical" | "high" | "medium" | "low";
  type: "trauma" | "medical" | "cardiac" | "respiratory" | "obstetric" | "paediatric" | "other";
  urgency: "immediate" | "urgent" | "delayed" | "routine";
  consciousness: "alert" | "responsive" | "unresponsive";
  breathing: "normal" | "difficulty" | "severe";
  bleeding: "none" | "minor" | "moderate" | "severe";
  notes: string;
}

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical", color: "bg-red-600 text-white" },
  { value: "high", label: "High", color: "bg-orange-600 text-white" },
  { value: "medium", label: "Medium", color: "bg-yellow-600 text-white" },
  { value: "low", label: "Low", color: "bg-blue-600 text-white" },
];

const INCIDENT_TYPES = [
  "Trauma",
  "Medical",
  "Cardiac",
  "Respiratory",
  "Obstetric",
  "Paediatric",
  "Other",
];

export default function IncidentTriageScreen() {
  const { providerId } = useProviderAccess();
  const [loading, setLoading] = useState(false);
  const [triage, setTriage] = useState<TriageData>({
    severity: "high",
    type: "medical",
    urgency: "urgent",
    consciousness: "alert",
    breathing: "normal",
    bleeding: "none",
    notes: "",
  });

  const handleChange = (field: keyof TriageData, value: any) => {
    setTriage((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      window.location.href = `/provider/hospital/incident/create/recommend-ambulance`;
    }, 500);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">Incident Triage Assessment</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Categorize the incident by severity, type, and urgency
        </p>
      </header>

      <div className="grid gap-6 max-w-2xl">
        {/* Severity Level */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Severity Level</h2>
          <div className="grid grid-cols-4 gap-2">
            {SEVERITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleChange("severity", option.value)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition-all",
                  triage.severity === option.value
                    ? option.color
                    : "bg-muted text-foreground hover:bg-muted/80"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Incident Type */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Incident Type</h2>
          <select
            value={triage.type}
            onChange={(e) => handleChange("type", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {INCIDENT_TYPES.map((type) => (
              <option key={type.toLowerCase()} value={type.toLowerCase()}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Urgency Level */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Response Urgency</h2>
          <div className="space-y-2">
            {[
              {
                value: "immediate",
                label: "Immediate",
                desc: "Life-threatening, needs response ASAP",
              },
              {
                value: "urgent",
                label: "Urgent",
                desc: "Serious condition, needs quick response",
              },
              {
                value: "delayed",
                label: "Delayed",
                desc: "Stable but requires treatment",
              },
              { value: "routine", label: "Routine", desc: "Non-urgent" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
              >
                <input
                  type="radio"
                  name="urgency"
                  value={option.value}
                  checked={triage.urgency === option.value}
                  onChange={(e) => handleChange("urgency", e.target.value)}
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

        {/* Vital Signs Assessment */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Vital Signs Assessment</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Consciousness Level</label>
              <select
                value={triage.consciousness}
                onChange={(e) => handleChange("consciousness", e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="alert">Alert & Responsive</option>
                <option value="responsive">Responsive to Stimuli</option>
                <option value="unresponsive">Unresponsive</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold">Breathing</label>
              <select
                value={triage.breathing}
                onChange={(e) => handleChange("breathing", e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="normal">Normal</option>
                <option value="difficulty">Difficulty Breathing</option>
                <option value="severe">Severe Respiratory Distress</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold">Bleeding</label>
              <select
                value={triage.bleeding}
                onChange={(e) => handleChange("bleeding", e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="none">No Bleeding</option>
                <option value="minor">Minor Bleeding</option>
                <option value="moderate">Moderate Bleeding</option>
                <option value="severe">Severe Bleeding</option>
              </select>
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Additional Notes</h2>
          <textarea
            value={triage.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Any additional clinical information or observations..."
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
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
          <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Next: Find Ambulance"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
