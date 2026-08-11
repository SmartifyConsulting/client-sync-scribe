import { useState } from "react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface IncidentForm {
  caller_name: string;
  caller_phone: string;
  caller_location: string;
  emergency_type: "medical" | "trauma" | "cardiac" | "respiratory" | "other";
  priority_level: "critical" | "high" | "medium" | "low";
  patient_age?: number;
  patient_gender?: "male" | "female" | "other";
  description: string;
}

const EMERGENCY_TYPES = [
  { value: "medical", label: "Medical Emergency" },
  { value: "trauma", label: "Trauma/Accident" },
  { value: "cardiac", label: "Cardiac Event" },
  { value: "respiratory", label: "Respiratory Distress" },
  { value: "other", label: "Other" },
];

const PRIORITY_LEVELS = [
  { value: "critical", label: "Critical", color: "bg-red-600 text-white" },
  { value: "high", label: "High", color: "bg-orange-600 text-white" },
  { value: "medium", label: "Medium", color: "bg-yellow-600 text-white" },
  { value: "low", label: "Low", color: "bg-blue-600 text-white" },
];

export default function CreateIncidentScreen() {
  const { providerId } = useProviderAccess();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<IncidentForm>({
    caller_name: "",
    caller_phone: "",
    caller_location: "",
    emergency_type: "medical",
    priority_level: "high",
    patient_age: undefined,
    patient_gender: "other",
    description: "",
  });

  const handleChange = (field: keyof IncidentForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.caller_name || !form.caller_phone || !form.emergency_type) {
      alert("Please fill in all required fields");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      window.location.href = `/provider/hospital/incident/create/location?caller=${form.caller_name}`;
    }, 500);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
            <h1 className="text-3xl font-bold text-foreground">Create New Incident</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Receive and log emergency call details
          </p>
        </div>
      </header>

      <div className="grid gap-6 max-w-2xl">
        {/* Caller Information */}
        <div className="rounded-xl border border-primary bg-card p-5">
          <h2 className="text-lg font-bold mb-4">Caller Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Caller Name *</label>
              <input
                type="text"
                value={form.caller_name}
                onChange={(e) => handleChange("caller_name", e.target.value)}
                placeholder="Name of caller"
                className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Phone Number *</label>
              <input
                type="tel"
                value={form.caller_phone}
                onChange={(e) => handleChange("caller_phone", e.target.value)}
                placeholder="+27 XX XXX XXXX"
                className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Caller Location</label>
              <input
                type="text"
                value={form.caller_location}
                onChange={(e) => handleChange("caller_location", e.target.value)}
                placeholder="Where is the caller?"
                className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Emergency Details */}
        <div className="rounded-xl border border-primary bg-card p-5">
          <h2 className="text-lg font-bold mb-4">Emergency Details</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Emergency Type *</label>
              <select
                value={form.emergency_type}
                onChange={(e) =>
                  handleChange("emergency_type", e.target.value)
                }
                className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {EMERGENCY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold">Priority Level *</label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {PRIORITY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() =>
                      handleChange("priority_level", level.value)
                    }
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-semibold transition-all",
                      form.priority_level === level.value
                        ? level.color
                        : "bg-muted text-foreground hover:bg-muted-foreground/20"
                    )}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Describe the emergency (symptoms, injuries, etc.)"
                rows={4}
                className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Patient Information (Optional) */}
        <div className="rounded-xl border border-primary bg-card p-5">
          <h2 className="text-lg font-bold mb-4">Patient Information (Optional)</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold">Age</label>
                <input
                  type="number"
                  value={form.patient_age || ""}
                  onChange={(e) =>
                    handleChange("patient_age", e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="Years"
                  className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Gender</label>
                <select
                  value={form.patient_gender}
                  onChange={(e) =>
                    handleChange("patient_gender", e.target.value)
                  }
                  className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
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
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Next: Capture Location"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
