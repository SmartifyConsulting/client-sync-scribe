import { useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleMapsKey } from "../hooks/useGoogleMapsKey";
import { Ambulance, Hospital, MapPin, Loader2, AlertTriangle } from "lucide-react";

type Mode = "patient" | "ambulance" | "hospital" | "admin";

type LatLng = { lat: number; lng: number };
type ProviderPos = LatLng & { id: string; kind: "ambulance" | "hospital"; updated_at: string };

interface Props {
  incidentId: string;
  mode: Mode;
  height?: number;
}

/**
 * Shared Google Maps live tracker for the SOS ecosystem.
 * Every role (patient, ambulance, hospital, admin) sees the same map and data.
 */
export function SosLiveMap({ incidentId, mode, height = 320 }: Props) {
  const { data: apiKey, isLoading: keyLoading } = useGoogleMapsKey();
  const [patient, setPatient] = useState<LatLng | null>(null);
  const [provider, setProvider] = useState<ProviderPos | null>(null);
  const [hospital, setHospital] = useState<(LatLng & { name?: string }) | null>(null);

  // Load initial positions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: inc } = await supabase
        .from("holarchelp_incidents" as any)
        .select("destination_hospital_id, assigned_provider_id, provider_latitude, provider_longitude, provider_location_updated_at")
        .eq("id", incidentId).maybeSingle();
      if (cancelled) return;
      const i: any = inc;
      const { data: loc } = await supabase
        .from("holarchelp_locations" as any)
        .select("latitude, longitude").eq("incident_id", incidentId)
        .order("recorded_at", { ascending: false }).limit(1).maybeSingle();
      if (cancelled) return;
      const l: any = loc;
      if (l?.latitude && l?.longitude) setPatient({ lat: l.latitude, lng: l.longitude });

      const { data: livePos } = await supabase
        .from("holarchelp_provider_locations" as any)
        .select("latitude, longitude, provider_id, provider_kind, recorded_at")
        .eq("incident_id", incidentId)
        .order("recorded_at", { ascending: false }).limit(1).maybeSingle();
      if (cancelled) return;
      const p: any = livePos;
      if (p?.latitude && p?.longitude) {
        setProvider({ lat: p.latitude, lng: p.longitude, id: p.provider_id, kind: p.provider_kind, updated_at: p.recorded_at });
      } else if (i?.provider_latitude && i?.provider_longitude && i?.assigned_provider_id) {
        setProvider({
          lat: i.provider_latitude, lng: i.provider_longitude,
          id: i.assigned_provider_id, kind: "ambulance",
          updated_at: i.provider_location_updated_at ?? new Date().toISOString(),
        });
      }

      if (i?.destination_hospital_id) {
        const { data: h } = await supabase
          .from("holarchelp_hospitals" as any)
          .select("name, latitude, longitude")
          .eq("id", i.destination_hospital_id).maybeSingle();
        const hh: any = h;
        if (!cancelled && hh?.latitude && hh?.longitude) {
          setHospital({ lat: hh.latitude, lng: hh.longitude, name: hh.name });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [incidentId]);

  // Realtime: provider position
  useEffect(() => {
    const ch = supabase.channel(`sos-map-${incidentId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "holarchelp_provider_locations", filter: `incident_id=eq.${incidentId}` },
        (p) => {
          const n: any = p.new;
          if (n?.latitude && n?.longitude) {
            setProvider({
              lat: n.latitude, lng: n.longitude,
              id: n.provider_id, kind: n.provider_kind,
              updated_at: n.recorded_at,
            });
          }
        })
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "holarchelp_locations", filter: `incident_id=eq.${incidentId}` },
        (p) => {
          const n: any = p.new;
          if (n?.latitude && n?.longitude) setPatient({ lat: n.latitude, lng: n.longitude });
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "holarchelp_incidents", filter: `id=eq.${incidentId}` },
        async (p) => {
          const n: any = p.new;
          if (n?.destination_hospital_id) {
            const { data: h } = await supabase
              .from("holarchelp_hospitals" as any)
              .select("name, latitude, longitude").eq("id", n.destination_hospital_id).maybeSingle();
            const hh: any = h;
            if (hh?.latitude && hh?.longitude) setHospital({ lat: hh.latitude, lng: hh.longitude, name: hh.name });
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [incidentId]);

  if (keyLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border bg-muted/30" style={{ height }}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!apiKey) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border-2 border-amber-400/50 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/20" style={{ minHeight: 80 }}>
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Google Maps key not configured — set <code className="rounded bg-amber-100 px-1">GOOGLE_MAPS_API_KEY</code> in backend secrets.
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["geometry"]}>
      <MapBody
        mode={mode}
        patient={patient}
        provider={provider}
        hospital={hospital}
        height={height}
      />
    </APIProvider>
  );
}

function MapBody({
  mode, patient, provider, hospital, height,
}: {
  mode: Mode;
  patient: LatLng | null;
  provider: ProviderPos | null;
  hospital: (LatLng & { name?: string }) | null;
  height: number;
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [eta, setEta] = useState<{ minutes: number; km: number } | null>(null);
  const [routeQueryKey, setRouteQueryKey] = useState(0);

  // Fit bounds whenever pins change
  useEffect(() => {
    if (!map) return;
    const pts: LatLng[] = [patient, provider, hospital].filter(Boolean) as LatLng[];
    if (pts.length === 0) return;
    if (pts.length === 1) { map.panTo(pts[0]); map.setZoom(14); return; }
    const b = new google.maps.LatLngBounds();
    pts.forEach((p) => b.extend(p));
    map.fitBounds(b, 80);
  }, [map, patient?.lat, patient?.lng, provider?.lat, provider?.lng, hospital?.lat, hospital?.lng]);

  // Debounce ETA / polyline updates
  useEffect(() => {
    const t = setTimeout(() => setRouteQueryKey((k) => k + 1), 1500);
    return () => clearTimeout(t);
  }, [provider?.lat, provider?.lng, patient?.lat, patient?.lng, hospital?.lat, hospital?.lng]);

  useEffect(() => {
    if (!map || !provider) return;
    // Pre-collection: ambulance → patient. Post-collection: ambulance → hospital.
    const dest = hospital ?? patient;
    if (!dest) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("routes-eta", {
        body: { origin: { lat: provider.lat, lng: provider.lng }, destination: { lat: dest.lat, lng: dest.lng } },
      });
      if (cancelled || error || !data) return;
      const d: any = data;
      setEta({ minutes: d.duration_minutes, km: (d.distance_meters ?? 0) / 1000 });
      if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
      if (d.polyline && window.google?.maps?.geometry?.encoding) {
        const path = google.maps.geometry.encoding.decodePath(d.polyline);
        polylineRef.current = new google.maps.Polyline({
          path,
          strokeColor: hospital ? "#16a34a" : "#dc2626",
          strokeOpacity: 0.85,
          strokeWeight: 4,
        });
        polylineRef.current.setMap(map);
      }
    })();
    return () => { cancelled = true; if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeQueryKey, map]);

  const initialCenter = useMemo<LatLng>(
    () => patient ?? provider ?? hospital ?? { lat: -26.2041, lng: 28.0473 },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border" style={{ height }}>
      <Map
        defaultCenter={initialCenter}
        defaultZoom={13}
        mapId="sos-live-map"
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
      >
        {patient && (
          <AdvancedMarker position={patient} title="Patient">
            <Pin tone="patient" />
          </AdvancedMarker>
        )}
        {provider && (
          <AdvancedMarker position={provider} title="Ambulance">
            <Pin tone="ambulance" />
          </AdvancedMarker>
        )}
        {hospital && (
          <AdvancedMarker position={hospital} title={hospital.name ?? "Hospital"}>
            <Pin tone="hospital" />
          </AdvancedMarker>
        )}
      </Map>

      {eta && provider && (
        <div className="absolute left-2 top-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur">
          <span className="text-foreground">{eta.minutes} min</span>
          <span className="ml-1 text-muted-foreground">· {eta.km.toFixed(1)} km</span>
          <span className="ml-1 text-[10px] uppercase text-muted-foreground">{hospital ? "→ hospital" : "→ patient"}</span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex gap-1.5 text-[10px]">
        <Chip><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-600" />Patient</Chip>
        <Chip><Ambulance className="mr-1 h-3 w-3 text-red-600" />Ambulance</Chip>
        <Chip><Hospital className="mr-1 h-3 w-3 text-emerald-600" />Hospital</Chip>
      </div>
      <div className="absolute right-2 top-2 rounded-full bg-background/95 px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground shadow-md">
        {mode}
      </div>
    </div>
  );
}

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="flex items-center rounded-full border border-border bg-background/95 px-2 py-0.5 font-medium shadow-sm">{children}</span>
);

const Pin = ({ tone }: { tone: "patient" | "ambulance" | "hospital" }) => {
  if (tone === "patient") return (
    <span className="relative flex h-4 w-4">
      <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/60" />
      <span className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-md" />
    </span>
  );
  if (tone === "ambulance") return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-red-600 bg-white shadow-lg">
      <Ambulance className="h-5 w-5 text-red-600" />
    </span>
  );
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg border-[3px] border-emerald-600 bg-white shadow-lg">
      <Hospital className="h-5 w-5 text-emerald-600" />
    </span>
  );
};
