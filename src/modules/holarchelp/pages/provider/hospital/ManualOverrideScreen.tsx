import { useState } from "react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Lock } from "lucide-react";

interface OverrideRequest {
  incident_id: string;
  override_type: "skip_triage" | "force_dispatch" | "bypass_protocol" | "emergency_override";
  reason: string;
  authorization_level: "supervisor" | "manager" | "admin";
  supervisor_approval: boolean;
  notes: string;
}

export default function ManualOverrideScreen() {
  const { providerId } = useProviderAccess();
  const [loading, setLoading] = useState(false);
  const [override, setOverride] = useState<OverrideRequest>({
    incident_id: "INC-2024-001",
    override_type: "force_dispatch",
    reason: "Critical patient condition requires immediate dispatch",
    authorization_level: "manager",
    supervisor_approval: false,
    notes: "",
  });

  const handleChange = (field: keyof OverrideRequest, value: any) => {
    setOverride((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!override.supervisor_approval) {
      alert("Supervisor approval is required");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert("Manual override applied. Audit log created.");
      window.history.back();
    }, 500);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Admin Functions
        </p>
        <h1 className="text-3xl font-extrabold">Manual Override</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Emergency override of standard dispatch protocols (requires authorization)
        </p>
      </header>

      {/* Warning */}
      <div className="rounded-2xl border-l-4 border-l-red-600 bg-red-50 p-6 max-w-2xl">
        <div className="flex gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900">âš ï¸ Restricted Function</h3>
            <p className="text-sm text-red-800 mt-1">
              Manual overrides bypass established safety protocols and must be authorized by
              management. All actions will be logged for audit purposes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Override Type */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Override Type</h2>
          <select
            value={override.override_type}
            onChange={(e) => handleChange("override_type", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="skip_triage">Skip Triage Assessment</option>
            <option value="force_dispatch">Force Immediate Dispatch</option>
            <option value="bypass_protocol">Bypass Response Protocol</option>
            <option value="emergency_override">Emergency System Override</option>
          </select>

          <p className="text-sm text-muted-foreground mt-2">
            {override.override_type === "skip_triage" &&
              "Skip standard triage and proceed directly to dispatch"}
            {override.override_type === "force_dispatch" &&
              "Dispatch ambulance immediately without waiting for all systems"}
            {override.override_type === "bypass_protocol" &&
              "Bypass established response protocols for critical situations"}
            {override.override_type === "emergency_override" &&
              "Full system override for extreme emergencies"}
          </p>
        </div>

        {/* Reason */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Justification</h2>
          <textarea
            value={override.reason}
            onChange={(e) => handleChange("reason", e.target.value)}
            placeholder="Explain why this override is necessary..."
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Authorization */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Authorization
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Authorization Level Required</label>
              <select
                value={override.authorization_level}
                onChange={(e) => handleChange("authorization_level", e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="supervisor">Supervisor</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={override.supervisor_approval}
                onChange={(e) => handleChange("supervisor_approval", e.target.checked)}
                className="h-5 w-5"
              />
              <span className="font-semibold">
                I have received verbal/written approval from authorized personnel
              </span>
            </label>

            {override.supervisor_approval && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-800">âœ“ Authorization confirmed</p>
              </div>
            )}
          </div>
        </div>

        {/* Audit Notes */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Audit Notes</h2>
          <textarea
            value={override.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Additional information for audit trail..."
            rows={2}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-sm text-muted-foreground mt-2">
            This information will be permanently recorded in the audit log
          </p>
        </div>

        {/* Summary */}
        <div className="rounded-2xl border bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">âš ï¸ Important Reminder</p>
          <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
            <li>All overrides are permanently logged and audited</li>
            <li>Misuse of overrides may result in disciplinary action</li>
            <li>Overrides should only be used in genuine emergencies</li>
            <li>Full incident details will be recorded</li>
          </ul>
        </div>

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
            className="flex-1 bg-red-600 hover:bg-red-700"
            onClick={handleSubmit}
            disabled={loading || !override.supervisor_approval}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying Override...
              </>
            ) : (
              "Apply Override"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

