import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { toastError } from "@/lib/userMessage";
import { Check, ShieldAlert, Users } from "lucide-react";

export type AcceptanceIncident = {
  id: string;
  hospital_acceptance_status?: string | null;
  assigned_trauma_bay?: string | null;
  assigned_doctor_name?: string | null;
  trauma_team_prepared?: boolean | null;
  handover_status?: string | null;
};

export const acceptanceTone = (s?: string | null) =>
  s === "accepted"
    ? "bg-success/15 text-success border-success/40"
    : s === "redirected" || s === "declined"
      ? "bg-destructive/15 text-destructive border-destructive/40"
      : "bg-warning/15 text-warning border-warning/40";

/**
 * Hospital-side acceptance controls for a shared Emergency Incident.
 * Writes to the same `holarchelp_incidents` row the ambulance crew reads.
 */
export function HospitalAcceptancePanel({
  incident,
  onChanged,
}: {
  incident: AcceptanceIncident;
  onChanged?: () => void;
}) {
  const [bay, setBay] = useState(incident.assigned_trauma_bay ?? "");
  const [doctor, setDoctor] = useState(incident.assigned_doctor_name ?? "");
  const [saving, setSaving] = useState(false);

  const patch = async (p: Record<string, unknown>, message: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("holarchelp_incidents" as any)
      .update(p)
      .eq("id", incident.id);
    setSaving(false);
    if (error) return toastError(error, "We couldn't update this incident. Please try again.");
    toast.success(message);
    onChanged?.();
  };

  const accepted = incident.hospital_acceptance_status === "accepted";

  return (
    <div className="space-y-2 border-t px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={acceptanceTone(incident.hospital_acceptance_status)}>
          {(incident.hospital_acceptance_status ?? "pending").replace(/_/g, " ")}
        </Badge>
        {incident.trauma_team_prepared && (
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
            <Users className="mr-1 h-3 w-3" /> Trauma team ready
          </Badge>
        )}
        {incident.handover_status && incident.handover_status !== "pending" && (
          <Badge variant="outline">Handover {incident.handover_status.replace(/_/g, " ")}</Badge>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={bay}
          onChange={(e) => setBay(e.target.value)}
          placeholder="Trauma bay"
          className="h-9 rounded-xl"
        />
        <Input
          value={doctor}
          onChange={(e) => setDoctor(e.target.value)}
          placeholder="Assigned doctor"
          className="h-9 rounded-xl"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={saving}
          onClick={() =>
            patch(
              {
                hospital_acceptance_status: "accepted",
                hospital_decision_at: new Date().toISOString(),
                assigned_trauma_bay: bay || null,
                assigned_doctor_name: doctor || null,
              },
              "Patient accepted",
            )
          }
        >
          <Check className="mr-1 h-4 w-4" /> {accepted ? "Update" : "Accept"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() =>
            patch(
              { hospital_acceptance_status: "redirected", hospital_decision_at: new Date().toISOString() },
              "Ambulance redirected",
            )
          }
        >
          <ShieldAlert className="mr-1 h-4 w-4" /> Redirect
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => patch({ trauma_team_prepared: true }, "Trauma team prepared")}
        >
          <Users className="mr-1 h-4 w-4" /> Prepare trauma team
        </Button>
        {accepted && incident.handover_status !== "completed" && (
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() =>
              patch(
                { handover_status: "completed", handover_at: new Date().toISOString() },
                "Handover completed",
              )
            }
          >
            Complete handover
          </Button>
        )}
      </div>
    </div>
  );
}

/** Ambulance-side read-only view of the hospital's decision on the same incident. */
export function AcceptanceStatusBanner({ incident }: { incident: AcceptanceIncident | null }) {
  if (!incident) return null;
  const status = incident.hospital_acceptance_status ?? "pending";
  return (
    <div className={`rounded-2xl border p-3 text-sm ${acceptanceTone(status)}`}>
      <p className="font-extrabold uppercase tracking-wider">
        {status === "accepted"
          ? "Accepted by hospital"
          : status === "redirected"
            ? "Redirected — select another hospital"
            : status === "declined"
              ? "Declined by hospital"
              : "Awaiting hospital acceptance"}
      </p>
      {status === "accepted" && (
        <p className="mt-1">
          {incident.assigned_trauma_bay ? `Proceed to ${incident.assigned_trauma_bay}. ` : ""}
          {incident.assigned_doctor_name ? `${incident.assigned_doctor_name} assigned. ` : ""}
          {incident.trauma_team_prepared ? "Trauma team ready. " : ""}
          Continue navigation.
        </p>
      )}
    </div>
  );
}
