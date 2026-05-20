import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AddressAutocomplete } from "@/features/patients/components/AddressAutocomplete";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function ProviderProfile() {
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
        toast.success("Location pin updated");
      } else {
        toast.error("Could not find a location for that address");
      }
    } catch (e: any) {
      console.error("Geocoding failed", e);
      toast.error("Could not look up that address");
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
        }
      : {
          company_name: row.company_name, contact_email: row.contact_email, contact_phone: row.contact_phone,
          base_address: row.base_address, city: row.city, state: row.state,
          latitude: row.latitude ?? null, longitude: row.longitude ?? null,
          fleet_size: Number(row.fleet_size) || 1, at_capacity: !!row.at_capacity,
        };
    const { error } = await supabase.from(table as any).update(patch as any).eq("id", providerId);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  if (loading || !row) return <div className="text-muted-foreground">Loading…</div>;

  const hasPin = typeof row.latitude === "number" && typeof row.longitude === "number";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Provider profile</h1>
        <p className="text-sm text-muted-foreground">
          Status: <span className="font-semibold">{row.status}</span> · Tier: <span className="font-semibold">{row.tier}</span>
          {" · "}Subscription: <span className="font-semibold">{row.subscription_status}</span>
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-4">
        {providerType === "hospital" ? (
          <>
            <Field label="Hospital name" value={row.name} onChange={(v) => setRow({ ...row, name: v })} />
            <Field label="Contact email" type="email" value={row.contact_email} onChange={(v) => setRow({ ...row, contact_email: v })} />
            <Field label="Contact phone" value={row.contact_phone ?? ""} onChange={(v) => setRow({ ...row, contact_phone: v })} />
          </>
        ) : (
          <>
            <Field label="Company name" value={row.company_name} onChange={(v) => setRow({ ...row, company_name: v })} />
            <Field label="Contact email" type="email" value={row.contact_email} onChange={(v) => setRow({ ...row, contact_email: v })} />
            <Field label="Contact phone" value={row.contact_phone ?? ""} onChange={(v) => setRow({ ...row, contact_phone: v })} />
          </>
        )}

        <div className="grid gap-1.5">
          <Label className="text-xs">
            {providerType === "hospital" ? "Address" : "Base address"}
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
            placeholder="Start typing your address…"
            rows={2}
          />
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {hasPin
              ? <span>Saved pin: {Number(row.latitude).toFixed(5)}, {Number(row.longitude).toFixed(5)}</span>
              : <span>No pin saved yet — pick a suggestion or save to drop a pin.</span>}
          </div>
        </div>

        <PinMap latitude={row.latitude} longitude={row.longitude} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="City" value={row.city ?? ""} onChange={(v) => setRow({ ...row, city: v })} />
          <Field label="State" value={row.state ?? ""} onChange={(v) => setRow({ ...row, state: v })} />
        </div>

        {providerType === "hospital" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bed capacity" type="number" value={String(row.bed_capacity ?? 0)} onChange={(v) => setRow({ ...row, bed_capacity: v })} />
            <Field label="Beds available" type="number" value={String(row.beds_available ?? 0)} onChange={(v) => setRow({ ...row, beds_available: v })} />
            <Field label="ICU capacity" type="number" value={String(row.icu_capacity ?? 0)} onChange={(v) => setRow({ ...row, icu_capacity: v })} />
            <Field label="ICU available" type="number" value={String(row.icu_available ?? 0)} onChange={(v) => setRow({ ...row, icu_available: v })} />
          </div>
        ) : (
          <Field label="Fleet size" type="number" value={String(row.fleet_size ?? 1)} onChange={(v) => setRow({ ...row, fleet_size: v })} />
        )}

        <div className="flex items-center justify-between rounded-xl border p-3">
          <div>
            <p className="text-sm font-semibold">At capacity</p>
            <p className="text-xs text-muted-foreground">Pause incoming dispatches</p>
          </div>
          <Switch checked={!!row.at_capacity} onCheckedChange={(v) => setRow({ ...row, at_capacity: v })} />
        </div>

        <Button onClick={save} className="h-12 rounded-xl">Save changes</Button>
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
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [latitude ?? -26.1, longitude ?? 28.05],
      zoom: latitude && longitude ? 14 : 4,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (typeof latitude === "number" && typeof longitude === "number") {
      const icon = L.divIcon({
        className: "",
        html: '<div style="width:18px;height:18px;border-radius:50%;background:#dc2626;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      markerRef.current = L.marker([latitude, longitude], { icon }).addTo(map);
      map.setView([latitude, longitude], 14);
    }
  }, [latitude, longitude]);

  return <div ref={containerRef} className="h-[220px] w-full overflow-hidden rounded-xl border" />;
}
