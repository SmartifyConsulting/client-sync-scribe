import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LiveMap, type LiveMapPoint, type LiveMapRoute } from "./LiveMap";

type Mode = "patient" | "ambulance" | "hospital" | "admin";

type LatLng = { lat: number; lng: number };
type Eta = { minutes: number; km: number } | null;

interface Props {
  incidentId: string;
  mode: Mode;
  height?: number;
}

const TRANSPORT_STATUSES = new Set(["en_route", "patient_collected", "at_hospital"]);

/**
 * SOS live tracker on Leaflet/OpenStreetMap.
 *
 * Three phases:
 *  - selecting: no destination chosen yet → patient only (ambulance hidden).
 *  - pickup:    destination chosen, ambulance heading to patient.
 *               Lines: red patient↔ambulance + teal patient↔hospital. PICKUP countdown.
 *  - transport: ambulance en_route/patient_collected → heading to hospital.
 *               Lines: teal patient↔hospital + red ambulance↔hospital. TRANSPORT countdown.
 */
export function SosLiveMap({ incidentId, mode, height = 320 }: Props) {
  const [patient, setPatient] = useState<LatLng | null>(null);
  const [provider, setProvider] = useState<(LatLng & { kind: "ambulance" | "hospital" }) | null>(null);
  const [hospital, setHospital] = useState<(LatLng & { name?: string }) | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [pickupEta, setPickupEta] = useState<Eta>(null);
  const [transportEta, setTransportEta] = useState<Eta>(null);

  // Load initial state
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: inc } = await supabase
        .from("holarchelp_incidents" as any)
        .select(
          "status, destination_hospital_id, assigned_provider_id, provider_latitude, provider_longitude",
        )
        .eq("id", incidentId)
        .maybeSingle();
      if (cancelled) return;
      const i: any = inc;
      if (i?.status) setStatus(i.status);

      const { data: loc } = await supabase
        .from("holarchelp_locations" as any)
        .select("latitude, longitude")
        .eq("incident_id", incidentId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      const l: any = loc;
      if (l?.latitude && l?.longitude) setPatient({ lat: l.latitude, lng: l.longitude });

      const { data: livePos } = await supabase
        .from("holarchelp_provider_locations" as any)
        .select("latitude, longitude, provider_kind")
        .eq("incident_id", incidentId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
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
          .eq("id", i.destination_hospital_id)
          .maybeSingle();
        const hh: any = h;
        if (!cancelled && hh?.latitude && hh?.longitude) {
          setHospital({ lat: hh.latitude, lng: hh.longitude, name: hh.name });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`sos-map-${incidentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "holarchelp_provider_locations",
          filter: `incident_id=eq.${incidentId}`,
        },
        (p) => {
          const n: any = p.new;
          if (n?.latitude && n?.longitude) {
            setProvider({
              lat: n.latitude,
              lng: n.longitude,
              kind: n.provider_kind ?? "ambulance",
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "holarchelp_locations",
          filter: `incident_id=eq.${incidentId}`,
        },
        (p) => {
          const n: any = p.new;
          if (n?.latitude && n?.longitude) setPatient({ lat: n.latitude, lng: n.longitude });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "holarchelp_incidents",
          filter: `id=eq.${incidentId}`,
        },
        async (p) => {
          const n: any = p.new;
          if (n?.status) setStatus(n.status);
          if (n?.destination_hospital_id) {
            const { data: h } = await supabase
              .from("holarchelp_hospitals" as any)
              .select("name, latitude, longitude")
              .eq("id", n.destination_hospital_id)
              .maybeSingle();
            const hh: any = h;
            if (hh?.latitude && hh?.longitude)
              setHospital({ lat: hh.latitude, lng: hh.longitude, name: hh.name });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [incidentId]);

  // Phase
  const phase: "selecting" | "pickup" | "transport" = !hospital
    ? "selecting"
    : status && TRANSPORT_STATUSES.has(status)
      ? "transport"
      : "pickup";

  // ETA for pickup leg (ambulance → patient)
  useEffect(() => {
    if (phase !== "pickup" || !provider || !patient) {
      setPickupEta(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const e = await fetchEta(provider, patient);
      if (!cancelled) setPickupEta(e);
    }, 1000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [phase, provider?.lat, provider?.lng, patient?.lat, patient?.lng]);

  // ETA for transport leg (ambulance → hospital)
  useEffect(() => {
    if (phase !== "transport" || !provider || !hospital) {
      setTransportEta(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const e = await fetchEta(provider, hospital);
      if (!cancelled) setTransportEta(e);
    }, 1000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [phase, provider?.lat, provider?.lng, hospital?.lat, hospital?.lng]);

  // Map points
  const points = useMemo<LiveMapPoint[]>(() => {
    const out: LiveMapPoint[] = [];
    if (patient) out.push({ kind: "patient", latitude: patient.lat, longitude: patient.lng, label: "You" });
    if (phase !== "selecting" && provider) {
      out.push({
        kind: provider.kind,
        latitude: provider.lat,
        longitude: provider.lng,
        label: provider.kind === "ambulance" ? "Ambulance" : "Responder",
      });
    }
    if (hospital) {
      out.push({
        kind: "hospital",
        latitude: hospital.lat,
        longitude: hospital.lng,
        label: hospital.name ?? "Destination",
      });
    }
    return out;
  }, [
    patient?.lat,
    patient?.lng,
    provider?.lat,
    provider?.lng,
    provider?.kind,
    hospital?.lat,
    hospital?.lng,
    hospital?.name,
    phase,
  ]);

  // Lines
  const routes = useMemo<LiveMapRoute[]>(() => {
    const rs: LiveMapRoute[] = [];
    if (phase === "selecting") return rs;
    if (hospital && patient) {
      rs.push({ from: patient, to: { lat: hospital.lat, lng: hospital.lng }, color: "teal" });
    }
    if (phase === "pickup" && provider && patient) {
      rs.push({ from: patient, to: { lat: provider.lat, lng: provider.lng }, color: "red" });
    }
    if (phase === "transport" && provider && hospital) {
      rs.push({
        from: { lat: provider.lat, lng: provider.lng },
        to: { lat: hospital.lat, lng: hospital.lng },
        color: "red",
      });
    }
    return rs;
  }, [phase, patient?.lat, patient?.lng, provider?.lat, provider?.lng, hospital?.lat, hospital?.lng]);

  return (
    <div className="relative">
      <LiveMap points={points} routes={routes} height={height} />

      <div className="pointer-events-none absolute left-2 top-2 z-[400] flex flex-col gap-1.5">
        {phase === "pickup" && (
          <CountdownBadge label="PICKUP" eta={pickupEta} arriveText="Arriving at you" />
        )}
        {phase === "transport" && (
          <CountdownBadge
            label="TRANSPORT"
            eta={transportEta}
            arriveText="Arriving at hospital"
          />
        )}
      </div>

      <div className="absolute right-2 top-2 z-[400] rounded-full bg-background/95 px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground shadow-md">
        {mode}
      </div>
    </div>
  );
}

function CountdownBadge({
  label,
  eta,
  arriveText,
}: {
  label: string;
  eta: Eta;
  arriveText: string;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!eta) {
      setRemaining(null);
      return;
    }
    setRemaining(Math.max(0, Math.round(eta.minutes * 60)));
    const id = setInterval(() => {
      setRemaining((s) => (s === null ? null : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(id);
  }, [eta?.minutes]);

  if (!eta || remaining === null) return null;
  const display =
    remaining <= 0
      ? arriveText
      : `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-destructive px-3.5 py-2 text-destructive-foreground shadow-lg">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inset-0 animate-ping rounded-full bg-white/70" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">{label}</span>
      <span className="text-base font-extrabold tabular-nums leading-none">{display}</span>
      <span className="text-xs font-semibold opacity-90">· {eta.km.toFixed(1)} km</span>
    </div>
  );
}

async function fetchEta(origin: LatLng, dest: LatLng): Promise<Eta> {
  try {
    const { data, error } = await supabase.functions.invoke("routes-eta", {
      body: { origin, destination: dest },
    });
    if (error || !data || (data as any)?.fallback) return fallbackEta(origin, dest);
    const d: any = data;
    return { minutes: d.duration_minutes, km: (d.distance_meters ?? 0) / 1000 };
  } catch {
    return fallbackEta(origin, dest);
  }
}

function fallbackEta(a: LatLng, b: LatLng): Eta {
  const km = haversineKm(a, b);
  return { minutes: Math.max(1, Math.round((km / 40) * 60)), km };
}

function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371,
    toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat),
    dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
