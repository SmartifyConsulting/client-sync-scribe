import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../components/ProviderGate";
import { loadGoogleMaps } from "../../lib/googleMapsLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AddressAutocomplete } from "@/features/patients/components/AddressAutocomplete";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/userMessage";
import { invalidateProviderCapabilities } from "../../hooks/useProviderCapabilities";

export default function ProviderProfile() {
  const { t } = useTranslation();
  const { providerType, providerId, loading } = useProviderAccess();
  const table = providerType === "hospital" ? "holarchelp_hospitals" : "holarchelp_ambulance_providers";
  const addressField = providerType === "hospital" ? "address" : "base_address";
  const [row, setRow] = useState<any | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const lastGeocodedRef = useRef<string>("");

  useEffect(() => {
    if (!providerId) return;
    supabase.from(table as any).select("*").eq("id", providerId).maybeSingle()
      .then(({ data }) => {
        setRow(data);
        lastGeocodedRef.current = ((data as any)?.[addressField] ?? "").trim();
      });
  }, [providerId, table, addressField]);

  const geocode = async (address: string) => {
    const trimmed = address.trim();
    if (!trimmed || trimmed.length < 5 || trimmed === lastGeocodedRef.current) return;
    lastGeocodedRef.current = trimmed;
    setGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke("geocode-address", {
        body: { address: trimmed },
      });
      if (error) throw error;
      if (data?.latitude && data?.longitude) {
        setRow((prev: any) => prev && ({ ...prev, latitude: data.latitude, longitude: data.longitude }));
        toast.success(t("providerProfile.pinUpdated"));
      } else {
        toast.error(t("providerProfile.notFoundAddress"));
      }
    } catch (e: any) {
      console.error("Geocoding failed", e);
      toast.error(t("providerProfile.lookupFailed"));
    } finally {
      setGeocoding(false);
    }
  };

  const handleAddressChange = (v: string) => {
    setRow((prev: any) => prev && ({ ...prev, [addressField]: v }));
  };

  const save = async () => {
    if (!row || !providerId) return;
    // Ensure we have fresh coords for the current address before saving.
    const currentAddr = (row[addressField] ?? "").trim();
    if (currentAddr && currentAddr !== lastGeocodedRef.current) {
      await geocode(currentAddr);
    }
    const patch = providerType === "hospital"
      ? {
          name: row.name, contact_email: row.contact_email, contact_phone: row.contact_phone,
          address: row.address, city: row.city, state: row.state,
          latitude: row.latitude ?? null, longitude: row.longitude ?? null,
          bed_capacity: Number(row.bed_capacity) || 0, beds_available: Number(row.beds_available) || 0,
          icu_capacity: Number(row.icu_capacity) || 0, icu_available: Number(row.icu_available) || 0,
          at_capacity: !!row.at_capacity,
          has_emergency_department: !!row.has_emergency_department,
          accepts_ambulance_transfers: !!row.accepts_ambulance_transfers,
          operates_own_ambulance_fleet: !!row.operates_own_ambulance_fleet,
        }
      : {
          company_name: row.company_name, contact_email: row.contact_email, contact_phone: row.contact_phone,
          base_address: row.base_address, city: row.city, state: row.state,
          latitude: row.latitude ?? null, longitude: row.longitude ?? null,
          fleet_size: Number(row.fleet_size) || 1, at_capacity: !!row.at_capacity,
        };
    const { error } = await supabase.from(table as any).update(patch as any).eq("id", providerId);
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    invalidateProviderCapabilities(providerId);
    toast.success(t("providerProfile.saved"));
  };

  if (loading || !row) return <div className="text-muted-foreground">{t("common.loading")}</div>;

  const hasPin = typeof row.latitude === "number" && typeof row.longitude === "number";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">{t("providerProfile.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("providerProfile.status")}: <span className="font-semibold">{row.status}</span> · {t("providerProfile.tier")}: <span className="font-semibold">{row.tier}</span>
          {" · "}{t("providerProfile.subscription")}: <span className="font-semibold">{row.subscription_status}</span>
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-4">
        {providerType === "hospital" ? (
          <>
            <Field label={t("providerProfile.hospitalName")} value={row.name} onChange={(v) => setRow({ ...row, name: v })} />
            <Field label={t("providerProfile.contactEmail")} type="email" value={row.contact_email} onChange={(v) => setRow({ ...row, contact_email: v })} />
            <Field label={t("providerProfile.contactPhone")} value={row.contact_phone ?? ""} onChange={(v) => setRow({ ...row, contact_phone: v })} />
          </>
        ) : (
          <>
            <Field label={t("providerProfile.companyName")} value={row.company_name} onChange={(v) => setRow({ ...row, company_name: v })} />
            <Field label={t("providerProfile.contactEmail")} type="email" value={row.contact_email} onChange={(v) => setRow({ ...row, contact_email: v })} />
            <Field label={t("providerProfile.contactPhone")} value={row.contact_phone ?? ""} onChange={(v) => setRow({ ...row, contact_phone: v })} />
          </>
        )}

        <div className="grid gap-1.5">
          <Label className="text-xs">
            {providerType === "hospital" ? t("providerProfile.address") : t("providerProfile.baseAddress")}
            {geocoding && <Loader2 className="inline ml-2 h-3 w-3 animate-spin text-muted-foreground" />}
          </Label>
          <AddressAutocomplete
            value={row[addressField] ?? ""}
            onChange={(v) => {
              handleAddressChange(v);
              // The autocomplete calls onChange both for typing and when a
              // suggestion is selected. Suggestions yield a long, complete
              // address — geocode those immediately.
              if (v && v.length > 12 && !v.endsWith(" ")) {
                void geocode(v);
              }
            }}
            placeholder={t("providerProfile.addressPlaceholder")}
            rows={2}
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {hasPin
              ? <span>{t("providerProfile.savedPin")}: {Number(row.latitude).toFixed(5)}, {Number(row.longitude).toFixed(5)}</span>
              : <span>{t("providerProfile.noPin")}</span>}
          </div>
        </div>

        <PinMap latitude={row.latitude} longitude={row.longitude} />

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("providerProfile.city")} value={row.city ?? ""} onChange={(v) => setRow({ ...row, city: v })} />
          <Field label={t("providerProfile.state")} value={row.state ?? ""} onChange={(v) => setRow({ ...row, state: v })} />
        </div>

        {providerType === "hospital" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("providerProfile.bedCapacity")} type="number" value={String(row.bed_capacity ?? 0)} onChange={(v) => setRow({ ...row, bed_capacity: v })} />
            <Field label={t("providerProfile.bedsAvailable")} type="number" value={String(row.beds_available ?? 0)} onChange={(v) => setRow({ ...row, beds_available: v })} />
            <Field label={t("providerProfile.icuCapacity")} type="number" value={String(row.icu_capacity ?? 0)} onChange={(v) => setRow({ ...row, icu_capacity: v })} />
            <Field label={t("providerProfile.icuAvailable")} type="number" value={String(row.icu_available ?? 0)} onChange={(v) => setRow({ ...row, icu_available: v })} />
          </div>
        ) : (
          <Field label={t("providerProfile.fleetSize")} type="number" value={String(row.fleet_size ?? 1)} onChange={(v) => setRow({ ...row, fleet_size: v })} />
        )}

        {providerType === "hospital" && (
          <div className="space-y-2 rounded-xl border p-3">
            <p className="text-sm font-semibold">Emergency Services</p>
            <p className="text-xs text-muted-foreground">
              These settings control which modules appear in your navigation.
            </p>
            <CapabilityToggle
              label="Has Emergency Department"
              checked={row.has_emergency_department ?? true}
              onChange={(v) => setRow({ ...row, has_emergency_department: v })}
            />
            <CapabilityToggle
              label="Accepts Ambulance Transfers"
              checked={row.accepts_ambulance_transfers ?? true}
              onChange={(v) => setRow({ ...row, accepts_ambulance_transfers: v })}
            />
            <CapabilityToggle
              label="Operates Own Ambulance Fleet"
              checked={row.operates_own_ambulance_fleet ?? false}
              onChange={(v) => setRow({ ...row, operates_own_ambulance_fleet: v })}
            />
          </div>
        )}


        <div className="flex items-center justify-between rounded-xl border p-3">
          <div>
            <p className="text-sm font-semibold">{t("providerProfile.atCapacity")}</p>
            <p className="text-xs text-muted-foreground">{t("providerProfile.pauseDispatches")}</p>
          </div>
          <Switch checked={!!row.at_capacity} onCheckedChange={(v) => setRow({ ...row, at_capacity: v })} />
        </div>

        <Button onClick={save} className="h-12 rounded-xl">{t("providerProfile.saveChanges")}</Button>
      </div>
    </div>
  );
}

const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
  <div className="grid gap-1.5">
    <Label className="text-xs">{label}</Label>
    <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl" />
  </div>
);

function PinMap({ latitude, longitude }: { latitude?: number | null; longitude?: number | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const gmapsRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        gmapsRef.current = g.maps;
        mapRef.current = new g.maps.Map(containerRef.current, {
          center: { lat: latitude ?? -26.1, lng: longitude ?? 28.05 },
          zoom: latitude && longitude ? 14 : 3,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        setReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    const gmaps = gmapsRef.current;
    const map = mapRef.current;
    if (!map || !gmaps) return;
    markerRef.current?.setMap(null);
    markerRef.current = null;
    if (typeof latitude === "number" && typeof longitude === "number") {
      const url =
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="7" fill="#dc2626" stroke="white" stroke-width="3"/></svg>`,
        );
      markerRef.current = new gmaps.Marker({
        position: { lat: latitude, lng: longitude },
        map,
        icon: { url, scaledSize: new gmaps.Size(22, 22), anchor: new gmaps.Point(11, 11) },
      });
      map.panTo({ lat: latitude, lng: longitude });
      map.setZoom(14);
    }
  }, [ready, latitude, longitude]);

  return <div ref={containerRef} className="h-[220px] w-full overflow-hidden rounded-xl border" />;
}
