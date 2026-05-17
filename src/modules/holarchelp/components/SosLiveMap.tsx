import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LiveMap, type LiveMapPoint } from "./LiveMap";

type Mode = "patient" | "ambulance" | "hospital" | "admin";

type LatLng = { lat: number; lng: number };

interface Props {
  incidentId: string;
  mode: Mode;
  height?: number;
}

/**
 * Shared live tracker for the SOS ecosystem. Uses Leaflet/OpenStreetMap so it
 * renders even when Google Maps billing/API restrictions block the browser key.
 */
export function SosLiveMap({ incidentId, mode, height = 320 }: Props) {
  const [patient, setPatient] = useState<LatLng | null>(null);
  const [provider, setProvider] = useState<(LatLng & { kind: "ambulance" | "hospital" }) | null>(null);
  const [hospital, setHospital] = useState<(LatLng & { name?: string }) | null>(null);
  const [eta, setEta] = useState<{ minutes: number; km: number } | null>(null);

  // Load initial positions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: inc } = await supabase
        .from("holarchelp_incidents" as any)
        .select("destination_hospital_id, assigned_provider_id, provider_latitude, provider_longitude")
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
        .select("latitude, longitude, provider_kind")
        .eq("incident_id", incidentId)
        .order("recorded_at", { ascending: false }).limit(1).maybeSingle();
      if (cancelled) return;
      const p: any = livePos;
      if (p?.latitude && p?.longitude) {
        setProvider({ lat: p.latitude, lng: p.longitude, kind: p.provider_kind ?? "ambulance" });
      } else if (i?.provider_latitude && i?.provider_longitude && i?.assigned_provider_id) {
        setProvider({ lat: i.provider_latitude, lng: i.provider_longitude, kind: "ambulance" });
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

  // Realtime updates
  useEffect(() => {
    const ch = supabase.channel(`sos-map-${incidentId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "holarchelp_provider_locations", filter: `incident_id=eq.${incidentId}` },
        (p) => {
          const n: any = p.new;
          if (n?.latitude && n?.longitude) {
            setProvider({ lat: n.latitude, lng: n.longitude, kind: n.provider_kind ?? "ambulance" });
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

  // ETA via routes-eta — gracefully no-op if backend or Google fails
  useEffect(() => {
    if (!provider) { setEta(null); return; }
    const dest = hospital ?? patient;
    if (!dest) { setEta(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("routes-eta", {
          body: { origin: { lat: provider.lat, lng: provider.lng }, destination: { lat: dest.lat, lng: dest.lng } },
        });
        if (cancelled) return;
        if (error || !data || (data as any)?.fallback) {
          // Fallback: straight-line distance, avg 40 km/h
          const km = haversineKm(provider, dest);
          setEta({ minutes: Math.max(1, Math.round((km / 40) * 60)), km });
          return;
        }
        const d: any = data;
        setEta({ minutes: d.duration_minutes, km: (d.distance_meters ?? 0) / 1000 });
      } catch {
        if (cancelled) return;
        const km = haversineKm(provider, dest);
        setEta({ minutes: Math.max(1, Math.round((km / 40) * 60)), km });
      }
    }, 1200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [provider?.lat, provider?.lng, patient?.lat, patient?.lng, hospital?.lat, hospital?.lng]);

  const points = useMemo<LiveMapPoint[]>(() => {
    const out: LiveMapPoint[] = [];
    if (patient) out.push({ kind: "patient", latitude: patient.lat, longitude: patient.lng, label: "Patient" });
    if (provider) out.push({ kind: provider.kind, latitude: provider.lat, longitude: provider.lng, label: provider.kind === "ambulance" ? "Ambulance" : "Hospital" });
    if (hospital) out.push({ kind: "hospital", latitude: hospital.lat, longitude: hospital.lng, label: hospital.name ?? "Hospital" });
    return out;
  }, [patient?.lat, patient?.lng, provider?.lat, provider?.lng, provider?.kind, hospital?.lat, hospital?.lng, hospital?.name]);

  // Countdown timer tied to the latest ETA
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  useEffect(() => {
    if (!eta) { setRemainingSec(null); return; }
    setRemainingSec(Math.max(0, Math.round(eta.minutes * 60)));
    const id = setInterval(() => {
      setRemainingSec((s) => (s === null ? null : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(id);
  }, [eta?.minutes]);

  const countdownLabel = useMemo(() => {
    if (remainingSec === null) return null;
    if (remainingSec <= 0) return "Arriving now";
    const m = Math.floor(remainingSec / 60);
    const s = remainingSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [remainingSec]);

  return (
    <div className="relative">
      <LiveMap points={points} height={height} />
      {eta && provider && countdownLabel && (
        <div className="absolute left-2 top-2 z-[400] flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur">
          <span className="tabular-nums text-foreground">{countdownLabel}</span>
          <span className="text-muted-foreground">· {eta.km.toFixed(1)} km</span>
          <span className="text-[10px] uppercase text-muted-foreground">{hospital ? "→ hospital" : "→ patient"}</span>
        </div>
      )}
      <div className="absolute right-2 top-2 z-[400] rounded-full bg-background/95 px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground shadow-md">
        {mode}
      </div>
    </div>
  );
}

function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
