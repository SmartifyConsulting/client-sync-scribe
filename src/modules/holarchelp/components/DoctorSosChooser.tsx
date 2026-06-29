import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Siren, User, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Mode = "choose" | "pickPatient";

export interface DoctorSosChooserProps {
  open: boolean;
  onClose: () => void;
  onSelectSelf: () => void;
  /** called once an incident has been created on the patient's behalf */
  onPatientIncidentCreated: (incidentId: string) => void;
}

interface PatientRow {
  patient_user_id: string;
  full_name: string | null;
}

export function DoctorSosChooser({
  open,
  onClose,
  onSelectSelf,
  onPatientIncidentCreated,
}: DoctorSosChooserProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("choose");
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMode("choose");
      setSearch("");
      setBusy(null);
    }
  }, [open]);

  useEffect(() => {
    if (mode !== "pickPatient" || !user) return;
    (async () => {
      const { data } = await supabase
        .from("doctor_patient_access" as any)
        .select("patient_user_id, profiles:patient_user_id(full_name)")
        .eq("doctor_id", user.id)
        .eq("is_active", true)
        .limit(200);
      const rows: PatientRow[] = ((data as any[]) ?? []).map((r) => ({
        patient_user_id: r.patient_user_id,
        full_name: r.profiles?.full_name ?? null,
      }));
      setPatients(rows);
    })();
  }, [mode, user]);

  const triggerForPatient = async (p: PatientRow) => {
    if (busy) return;
    setBusy(p.patient_user_id);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => {
        if (!("geolocation" in navigator)) return rej(new Error("Geolocation not supported"));
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      const { data, error } = await supabase.functions.invoke("dispatch-sos-for-patient", {
        body: {
          patient_user_id: p.patient_user_id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        },
      });
      if (error) throw error;
      const incidentId = (data as any)?.incident_id;
      if (!incidentId) throw new Error("No incident returned");
      toast.success(`SOS triggered for ${p.full_name ?? "patient"}`);
      onPatientIncidentCreated(incidentId);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not trigger SOS for patient");
    } finally {
      setBusy(null);
    }
  };

  const filtered = patients.filter((p) =>
    !search ? true : (p.full_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">
            {mode === "choose" ? "Who needs help?" : "Select patient"}
          </DialogTitle>
        </DialogHeader>

        {mode === "choose" ? (
          <div className="space-y-3 pt-2">
            <Button
              onClick={() => setMode("pickPatient")}
              className="w-full h-16 text-base font-bold rounded-2xl text-white shadow-lg"
              style={{ background: "linear-gradient(135deg, hsl(354,84%,54%), hsl(0,75%,42%))" }}
            >
              <Siren className="h-5 w-5 mr-2" /> SOS for a Patient
            </Button>
            <Button
              onClick={() => {
                onClose();
                onSelectSelf();
              }}
              className="w-full h-16 text-base font-bold rounded-2xl text-white shadow-lg"
              style={{ background: "linear-gradient(135deg, hsl(354,84%,54%), hsl(0,75%,42%))" }}
            >
              <Siren className="h-5 w-5 mr-2" /> SOS for Me
            </Button>
            <Button variant="ghost" className="w-full" onClick={onClose}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <Input
              placeholder="Search your patients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">
                  No connected patients found.
                </p>
              )}
              {filtered.map((p) => (
                <button
                  key={p.patient_user_id}
                  disabled={!!busy}
                  onClick={() => triggerForPatient(p)}
                  className="w-full flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:border-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="flex-1 text-sm font-medium truncate">
                    {p.full_name ?? "Unnamed patient"}
                  </p>
                  {busy === p.patient_user_id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                  ) : (
                    <Siren className="h-4 w-4 text-red-600" />
                  )}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setMode("choose")} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
