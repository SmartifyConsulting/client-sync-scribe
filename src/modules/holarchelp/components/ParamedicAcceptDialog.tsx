import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Truck, AlertCircle, Hospital, Check } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useParamedicShift } from "../hooks/useParamedicShift";
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/userMessage";

interface Props {
  incidentId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onNeedShift?: () => void;
}

type H = {
  id: string;
  name: string;
  city: string | null;
  ownership: string | null;
  accepting_patients: boolean | null;
  er_capacity_status: "green" | "yellow" | "red" | null;
  er_beds_available: number | null;
  latitude: number | null;
  longitude: number | null;
  distance_km?: number;
};

const capColor = (s: string | null) =>
  s === "red" ? "bg-red-500/15 text-red-700 border-red-500/40"
  : s === "yellow" ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/40"
  : "bg-green-500/15 text-green-700 border-green-500/40";

const dist = (a?: { lat: number; lng: number } | null, b?: { lat: number; lng: number } | null) => {
  if (!a || !b) return undefined;
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

export function ParamedicAcceptDialog({ incidentId, open, onOpenChange, onNeedShift }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shift } = useParamedicShift();
  const [accepting, setAccepting] = useState(false);
  const [step, setStep] = useState<"confirm" | "hospital">("confirm");
  const [hospitals, setHospitals] = useState<H[]>([]);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [incident, setIncident] = useState<{ incident_number: string | null; latitude: number | null; longitude: number | null } | null>(null);

  useEffect(() => {
    if (!open || !incidentId) {
      setStep("confirm");
      setHospitalId(null);
      return;
    }
    (async () => {
      const { data: inc } = await supabase
        .from("holarchelp_incidents" as any)
        .select("incident_number, id")
        .eq("id", incidentId)
        .maybeSingle();
      // Get most recent patient location as origin for distance ordering
      const { data: loc } = await supabase
        .from("holarchelp_locations" as any)
        .select("latitude, longitude")
        .eq("incident_id", incidentId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setIncident({
        incident_number: (inc as any)?.incident_number ?? null,
        latitude: (loc as any)?.latitude ?? null,
        longitude: (loc as any)?.longitude ?? null,
      });

      const { data } = await supabase
        .from("holarchelp_hospitals_public" as any)
        .select("id, name, city, ownership, accepting_patients, er_capacity_status, er_beds_available, latitude, longitude");
      const origin = (loc as any)?.latitude && (loc as any)?.longitude
        ? { lat: (loc as any).latitude, lng: (loc as any).longitude }
        : null;
      const enriched: H[] = ((data as any) ?? [])
        .filter((h: any) => h.accepting_patients)
        .map((h: any) => ({
          ...h,
          distance_km: h.latitude && h.longitude ? dist(origin, { lat: h.latitude, lng: h.longitude }) : undefined,
        }))
        .sort((a: H, b: H) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));
      setHospitals(enriched);
    })();
  }, [open, incidentId]);

  const accept = async () => {
    if (!incidentId || !shift || !hospitalId) return;
    setAccepting(true);
    const { error } = await supabase.rpc("holarchelp_paramedic_accept" as any, {
      _incident_id: incidentId,
      _ambulance_id: shift.ambulance_id,
      _destination_hospital_id: hospitalId,
    });
    setAccepting(false);
    if (error) {
      toast.error(error.message === "Incident already taken" ? t("ambulance.anotherCrewAccepted") : error.message);
      onOpenChange(false);
      return;
    }
    const hospName = hospitals.find((h) => h.id === hospitalId)?.name ?? "the hospital";
    toast.success(`Locked in — ${hospName} notified.`);
    onOpenChange(false);
    navigate(`/provider/ambulance/incident/${incidentId}`);
  };

  const noShift = !shift || shift.status !== "available";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> {t("paramedicAccept.acceptSos")}
            {incident?.incident_number && (
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold tracking-wider text-primary">
                {incident.incident_number}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {noShift ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" /> {t("paramedicAccept.notAvailableShift")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("paramedicAccept.startBeforeAccept")}
            </p>
          </div>
        ) : step === "confirm" ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("paramedicAccept.respondingWith")}</p>
            <p className="mt-1 text-lg font-bold">{t("liveSos.ambulance")} · {shift.ambulance_id.slice(0, 8)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("paramedicAccept.busyUntilCompleted")}
            </p>
            <p className="mt-3 text-xs text-foreground">
              Next: select the receiving hospital so they're alerted as you head out.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Hospital className="h-4 w-4 text-primary" /> Choose destination hospital
            </p>
            <p className="text-xs text-muted-foreground">
              Pick where you'll deliver the patient. They will be notified immediately.
            </p>
            <ul className="mt-2 max-h-72 space-y-1.5 overflow-auto">
              {hospitals.map((h) => {
                const isSelected = h.id === hospitalId;
                return (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => setHospitalId(h.id)}
                      className={`flex w-full items-start gap-2 rounded-xl border p-2 text-left transition ${
                        isSelected ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/40"
                      }`}
                    >
                      <Hospital className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold">{h.name}</p>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs">
                          <span className={`rounded-full border px-1.5 py-0.5 font-semibold ${capColor(h.er_capacity_status)}`}>
                            {(h.er_capacity_status ?? "green").toUpperCase()}
                          </span>
                          {h.er_beds_available != null && <span className="text-muted-foreground">{h.er_beds_available} ER beds</span>}
                          {h.city && <span className="text-muted-foreground">· {h.city}</span>}
                          {h.distance_km != null && <span className="text-muted-foreground">· {h.distance_km.toFixed(1)} km</span>}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
              {!hospitals.length && (
                <li className="py-4 text-center text-xs text-muted-foreground">No hospitals currently accepting.</li>
              )}
            </ul>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          {noShift ? (
            <Button onClick={() => { onOpenChange(false); onNeedShift?.(); }}>{t("shift.startTitle")}</Button>
          ) : step === "confirm" ? (
            <Button onClick={() => setStep("hospital")}>Next: choose hospital</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("confirm")}>Back</Button>
              <Button onClick={accept} disabled={accepting || !hospitalId}>
                {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("incomingSos.acceptIncident")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
