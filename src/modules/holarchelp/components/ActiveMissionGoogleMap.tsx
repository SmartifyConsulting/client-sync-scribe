import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadGoogleMaps } from "../lib/googleMapsLoader";

type LatLng = { lat: number; lng: number };
type Eta = { minutes: number; km: number } | null;

interface Props {
  incidentId: string;
  height?: number;
}

const TRANSPORT_STATUSES = new Set(["en_route_to_hospital", "patient_collected", "at_hospital"]);

/**
 * LIVE Google Maps view for the assigned ambulance crew on Active Mission.
 *
 * - Mounts a real Google Map (via the connected Google Maps Platform key).
 * - Subscribes to realtime updates on holarchelp_provider_locations and
 *   holarchelp_incidents so the ambulance marker glides as GPS rows arrive.
 * - Draws the actual ROAD polyline (Google Routes API via routes-eta edge fn)
 *   from ambulance -> patient (pickup) or ambulance -> hospital (transport),
 *   updating ETA + distance pill in the corner.
 */
export function ActiveMissionGoogleMap({ incidentId, height = 520 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const gmapsRef = useRef<any>(null);

  const ambMarkerRef = useRef<any>(null);
  const ambCurrentRef = useRef<LatLng | null>(null);
  const patientMarkerRef = useRef<any>(null);
  const hospitalMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const tweenRafRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [ambulance, setAmbulance] = useState<LatLng | null>(null);
  const [patient, setPatient] = useState<LatLng | null>(null);
  const [hospital, setHospital] = useState<(LatLng & { name?: string }) | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [eta, setEta] = useState<Eta>(null);

  /* ---------- init map once ---------- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        gmapsRef.current = g.maps;
        mapRef.current = new g.maps.Map(containerRef.current, {
          center: { lat: -26.2041, lng: 28.0473 },
          zoom: 11,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        setReady(true);
      })
      .catch((e) => setErr(humanizeMapError(e?.message ?? "Google Maps failed to load")));

    return () => {
      cancelled = true;
      if (tweenRafRef.current) cancelAnimationFrame(tweenRafRef.current);
      ambMarkerRef.current?.setMap(null);
      patientMarkerRef.current?.setMap(null);
      hospitalMarkerRef.current?.setMap(null);
      polylineRef.current?.setMap(null);
      mapRef.current = null;
    };
  }, []);

  /* ---------- load incident snapshot ---------- */
  useEffect(() => {
    if (!incidentId) return;
    let cancelled = false;
    (async () => {
      const { data: inc } = await supabase
        .from("holarchelp_incidents" as any)
        .select("status, destination_hospital_id, latitude, longitude, provider_latitude, provider_longitude")
        .eq("id", incidentId)
        .maybeSingle();
      if (cancelled) return;
      const i: any = inc;
      if (i?.status) setStatus(i.status);
      if (i?.latitude && i?.longitude) setPatient({ lat: i.latitude, lng: i.longitude });
      if (i?.provider_latitude && i?.provider_longitude) {
        setAmbulance({ lat: i.provider_latitude, lng: i.provider_longitude });
      }

      const { data: loc } = await supabase
        .from("holarchelp_provider_locations" as any)
        .select("latitude, longitude")
        .eq("incident_id", incidentId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const l: any = loc;
      if (!cancelled && l?.latitude && l?.longitude) {
        setAmbulance({ lat: l.latitude, lng: l.longitude });
      }

      if (i?.destination_hospital_id) {
        const { data: h } = await supabase
          .from("holarchelp_hospitals_public" as any)
          .select("name, latitude, longitude")
          .eq("id", i.destination_hospital_id)
          .maybeSingle();
        const hh: any = h;
        if (!cancelled && hh?.latitude && hh?.longitude) {
          setHospital({ lat: hh.latitude, lng: hh.longitude, name: hh.name });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [incidentId]);

  /* ---------- realtime subscriptions ---------- */
  useEffect(() => {
    if (!incidentId) return;
    const ch = supabase
      .channel(`amg-${incidentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "holarchelp_provider_locations", filter: `incident_id=eq.${incidentId}` },
        (p) => {
          const n: any = p.new;
          if (n?.latitude && n?.longitude) setAmbulance({ lat: n.latitude, lng: n.longitude });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "holarchelp_incidents", filter: `id=eq.${incidentId}` },
        async (p) => {
          const n: any = p.new;
          if (n?.status) setStatus(n.status);
          if (n?.destination_hospital_id) {
            const { data: h } = await supabase
              .from("holarchelp_hospitals_public" as any)
              .select("name, latitude, longitude")
              .eq("id", n.destination_hospital_id)
              .maybeSingle();
            const hh: any = h;
            if (hh?.latitude && hh?.longitude) setHospital({ lat: hh.latitude, lng: hh.longitude, name: hh.name });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [incidentId]);

  /* ---------- markers ---------- */
  useEffect(() => {
    const gmaps = gmapsRef.current;
    const map = mapRef.current;
    if (!ready || !map || !gmaps) return;

    // Patient marker
    if (patient) {
      if (!patientMarkerRef.current) {
        patientMarkerRef.current = new gmaps.Marker({
          position: patient, map, title: "Patient",
          icon: svgIcon(PATIENT_SVG, 22, gmaps),
        });
      } else patientMarkerRef.current.setPosition(patient);
    }
    // Hospital marker
    if (hospital) {
      if (!hospitalMarkerRef.current) {
        hospitalMarkerRef.current = new gmaps.Marker({
          position: hospital, map, title: hospital.name ?? "Destination",
          icon: svgIcon(HOSPITAL_SVG, 40, gmaps),
        });
      } else hospitalMarkerRef.current.setPosition(hospital);
    }
    // Ambulance — tween between updates so it glides
    if (ambulance) {
      if (!ambMarkerRef.current) {
        ambMarkerRef.current = new gmaps.Marker({
          position: ambulance, map, title: "Ambulance", zIndex: 999,
          icon: svgIcon(AMBULANCE_SVG, 40, gmaps),
        });
        ambCurrentRef.current = ambulance;
      } else {
        const from = ambCurrentRef.current ?? ambulance;
        const to = ambulance;
        const start = performance.now();
        const duration = 800;
        if (tweenRafRef.current) cancelAnimationFrame(tweenRafRef.current);
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const lat = from.lat + (to.lat - from.lat) * t;
          const lng = from.lng + (to.lng - from.lng) * t;
          ambCurrentRef.current = { lat, lng };
          ambMarkerRef.current?.setPosition({ lat, lng });
          if (t < 1) tweenRafRef.current = requestAnimationFrame(step);
          else tweenRafRef.current = null;
        };
        tweenRafRef.current = requestAnimationFrame(step);
      }
    }

    // Fit bounds
    const all: LatLng[] = [];
    if (ambulance) all.push(ambulance);
    if (patient) all.push(patient);
    if (hospital) all.push(hospital);
    if (all.length === 1) {
      map.panTo(all[0]);
      if ((map.getZoom() ?? 0) < 13) map.setZoom(13);
    } else if (all.length > 1) {
      const b = new gmaps.LatLngBounds();
      all.forEach((p) => b.extend(p));
      map.fitBounds(b, 72);
    }
  }, [ready, ambulance?.lat, ambulance?.lng, patient?.lat, patient?.lng, hospital?.lat, hospital?.lng]);

  /* ---------- which leg is active? ---------- */
  const phase: "pickup" | "transport" | "idle" = useMemo(() => {
    if (status && TRANSPORT_STATUSES.has(status) && hospital && ambulance) return "transport";
    if (ambulance && patient) return "pickup";
    return "idle";
  }, [status, ambulance, patient, hospital]);

  const legOrigin = ambulance;
  const legDest = phase === "transport" ? hospital : patient;

  /* ---------- fetch real road route + draw polyline ---------- */
  useEffect(() => {
    const gmaps = gmapsRef.current;
    const map = mapRef.current;
    if (!ready || !map || !gmaps || !legOrigin || !legDest) {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      setEta(null);
      return;
    }
    let cancelled = false;
    const color = phase === "transport" ? "#dc2626" : "#0d9488";

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("routes-eta", {
          body: { origin: legOrigin, destination: legDest },
        });
        if (cancelled) return;
        if (error || !data || (data as any)?.fallback || !(data as any)?.polyline) {
          drawStraightLine(gmaps, map, legOrigin, legDest, color);
          setEta(fallbackEta(legOrigin, legDest));
          return;
        }
        const d: any = data;
        const path = decodePolyline(d.polyline);
        polylineRef.current?.setMap(null);
        polylineRef.current = new gmaps.Polyline({
          path, strokeColor: color, strokeOpacity: 0.85, strokeWeight: 5, map, zIndex: 5,
        });
        setEta({ minutes: d.duration_minutes ?? 0, km: (d.distance_meters ?? 0) / 1000 });
      } catch {
        if (cancelled) return;
        drawStraightLine(gmaps, map, legOrigin, legDest, color);
        setEta(fallbackEta(legOrigin, legDest));
      }
    })();

    return () => { cancelled = true; };
  }, [ready, phase, legOrigin?.lat, legOrigin?.lng, legDest?.lat, legDest?.lng]);

  const drawStraightLine = (gmaps: any, map: any, a: LatLng, b: LatLng, color: string) => {
    polylineRef.current?.setMap(null);
    polylineRef.current = new gmaps.Polyline({
      path: [a, b], strokeColor: color, strokeOpacity: 0.6, strokeWeight: 4,
      icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "12px" }],
      map, zIndex: 5,
    });
  };

  return (
    <div className="relative" style={{ height }}>
      <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-2xl border z-0" />
      {err && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/85 px-6 text-center">
          <div className="max-w-md rounded-xl border border-destructive/40 bg-card p-4 shadow-lg">
            <p className="text-sm font-semibold text-destructive">Google Maps could not load</p>
            <p className="mt-1 text-xs text-muted-foreground">{err}</p>
          </div>
        </div>
      )}
      {!err && eta && (
        <div className="absolute left-2 top-2 z-10 flex items-center gap-2 rounded-full bg-destructive px-3 py-1.5 text-destructive-foreground shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-white/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">
            {phase === "transport" ? "Transport" : "Pickup"}
          </span>
          <span className="text-sm font-extrabold tabular-nums leading-none">
            {eta.minutes} min
          </span>
          <span className="text-[11px] font-semibold opacity-90">· {eta.km.toFixed(1)} km</span>
        </div>
      )}
      <div className="absolute right-2 top-2 z-10 rounded-full bg-background/95 px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground shadow-md">
        Live · Google Maps
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

const PATIENT_SVG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="7" fill="#1d8cff" stroke="white" stroke-width="3"/></svg>`,
  );

const AMBULANCE_SVG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
       <circle cx="20" cy="20" r="16" fill="white" stroke="#dc2626" stroke-width="3"/>
       <g transform="translate(8,8)" fill="none" stroke="#dc2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
         <path d="M10 10H6"/><path d="M8 8v4"/><path d="M9 18h6"/>
         <path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"/>
         <path d="M3 17V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11"/>
         <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
       </g>
     </svg>`,
  );

const HOSPITAL_SVG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
       <rect x="3" y="3" width="34" height="34" rx="6" fill="#dc2626"/>
       <path d="M16 8h8v8h8v8h-8v8h-8v-8H8v-8h8z" fill="white"/>
     </svg>`,
  );

function svgIcon(url: string, size: number, gmaps: any) {
  return {
    url,
    scaledSize: new gmaps.Size(size, size),
    anchor: new gmaps.Point(size / 2, size / 2),
  };
}

function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function fallbackEta(a: LatLng, b: LatLng): Eta {
  const km = haversineKm(a, b);
  return { minutes: Math.max(1, Math.round((km / 40) * 60)), km };
}

/** Decode a Google encoded polyline. */
function decodePolyline(encoded: string): LatLng[] {
  const path: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    path.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return path;
}

function humanizeMapError(raw: string): string {
  const r = raw.toLowerCase();
  if (r.includes("browser key missing") || r.includes("api key")) {
    return "The Google Maps key is not configured for this app. Connect the Google Maps Platform connector with a key that allows this domain.";
  }
  if (r.includes("referernotallowed") || r.includes("referer") || r.includes("not allowed")) {
    return "This domain is not on the Google Maps key's HTTP referrer allowlist. Add both https://yourdomain.com/* and https://*.yourdomain.com/* in Google Cloud, then refresh.";
  }
  return raw;
}
