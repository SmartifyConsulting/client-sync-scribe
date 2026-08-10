import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, AlertCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAvailableHospitals,
  distanceKm,
} from "../../../hooks/useHospitalNetwork";

export default function HospitalSelectionScreen() {
  const { t } = useTranslation();
  const { data = [], isLoading } = useAvailableHospitals();
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setCoords(null),
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60_000 },
    );
  }, []);

  const hospitals = useMemo(() => {
    return data.map((h) => {
      const km =
        coords && h.latitude != null && h.longitude != null
          ? distanceKm(coords, { lat: h.latitude, lng: h.longitude })
          : null;
      // Rough ETA: assume 50 km/h urban average → 1.2 min/km
      const eta = km != null ? Math.max(2, Math.round(km * 1.2)) : null;
      return { ...h, _km: km, _eta: eta };
    });
  }, [data, coords]);

  useEffect(() => {
    if (!selectedHospital && hospitals.length) setSelectedHospital(hospitals[0].id);
  }, [hospitals, selectedHospital]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("holarcHelp.emergency.dispatch.dispatchManagement")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("holarcHelp.emergency.dispatch.selectHospitalDestination")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("holarcHelp.emergency.dispatch.onlyAcceptingHospitals")}
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-2 max-w-2xl">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : hospitals.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8">
          {t("holarcHelp.emergency.dispatch.noHospitalsAccepting")}
        </p>
      ) : (
        <div className="grid gap-3 max-w-2xl">
          {hospitals.map((hospital) => (
            <div
              key={hospital.id}
              onClick={() => setSelectedHospital(hospital.id)}
              className={cn(
                "rounded-xl border p-4 cursor-pointer transition-all",
                selectedHospital === hospital.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50",
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <h3 className="text-xs font-medium text-primary-dark truncate">
                    {hospital.name}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {[hospital.address, hospital.city, hospital.state]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                </div>
                {hospital._eta != null && (
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-warning">
                      {t("holarcHelp.emergency.dispatch.etaLabel", { minutes: hospital._eta })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("holarcHelp.emergency.dispatch.kmAway", { km: hospital._km!.toFixed(1) })}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2 p-2 bg-muted rounded text-xs">
                <div>
                  <p className="text-muted-foreground">{t("holarcHelp.emergency.dispatch.beds")}</p>
                  <p className="font-semibold">{hospital.beds_available ?? t("common.dash")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("holarcHelp.emergency.dispatch.icu")}</p>
                  <p className="font-semibold">{hospital.icu_available ?? t("common.dash")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("holarcHelp.emergency.dispatch.erBeds")}</p>
                  <p className="font-semibold">{hospital.er_beds_available ?? t("common.dash")}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-success">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="font-medium">{t("holarcHelp.emergency.dispatch.acceptingPatients")}</span>
              </div>

              {hospital.contact_phone && (
                <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {hospital.contact_phone}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedHospital && (
        <div className="rounded-xl border bg-card p-4 max-w-2xl">
          <h3 className="text-xs font-semibold uppercase mb-1 text-muted-foreground">
            {t("holarcHelp.emergency.dispatch.selectedDestination")}
          </h3>
          <p className="text-sm font-semibold">
            {hospitals.find((h) => h.id === selectedHospital)?.name}
          </p>
        </div>
      )}

      <div className="flex gap-2 max-w-2xl">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => window.history.back()}
        >
          {t("common.back")}
        </Button>
        <Button
          size="sm"
          className="flex-1"
          disabled={!selectedHospital}
          onClick={() => alert("Hospital selected!")}
        >
          {t("holarcHelp.emergency.dispatch.confirmSelection")}
        </Button>
      </div>
    </div>
  );
}
