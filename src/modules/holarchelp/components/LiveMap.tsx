import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type LiveMapPoint = {
  kind: "patient" | "ambulance" | "hospital";
  latitude: number;
  longitude: number;
  label?: string;
};

const ICON_HTML: Record<LiveMapPoint["kind"], string> = {
  patient:
    '<div style="width:18px;height:18px;border-radius:50%;background:#1d8cff;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
  ambulance:
    '<div style="width:34px;height:34px;border-radius:50%;background:white;border:3px solid #dc2626;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35)"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10H6"/><path d="M8 8v4"/><path d="M9 18h6"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"/><path d="M3 17V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>',
  hospital:
    '<div style="width:34px;height:34px;border-radius:6px;background:white;border:3px solid #dc2626;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35)"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#dc2626"><path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/></svg></div>',
};

const makeIcon = (kind: LiveMapPoint["kind"]) =>
  L.divIcon({
    html: ICON_HTML[kind],
    className: "",
    iconSize: kind === "patient" ? [18, 18] : [34, 34],
    iconAnchor: kind === "patient" ? [9, 9] : [17, 17],
  });

const distancePillIcon = (km: number) =>
  L.divIcon({
    html: `<div style="white-space:nowrap;padding:3px 8px;border-radius:9999px;background:white;border:2px solid #dc2626;color:#dc2626;font-weight:700;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,0.25)">${km.toFixed(1)} km</div>`,
    className: "",
    iconSize: [60, 22],
    iconAnchor: [30, 11],
  });

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371,
    toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat),
    dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const LiveMap = ({
  points,
  height = 360,
  showDistanceLabel = true,
}: {
  points: LiveMapPoint[];
  height?: number;
  showDistanceLabel?: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const staticMarkersRef = useRef<L.Marker[]>([]);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const vehicleCurrentRef = useRef<{ lat: number; lng: number } | null>(null);
  const tweenRafRef = useRef<number | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const distancePillRef = useRef<L.Marker | null>(null);

  const hasAnyPoint = points.some(
    (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
  );

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const first = points.find(
      (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
    );
    const center: [number, number] = first
      ? [first.latitude, first.longitude]
      : [-26.2041, 28.0473];
    const map = L.map(containerRef.current, {
      center,
      zoom: first ? 14 : 11,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;

    requestAnimationFrame(() => map.invalidateSize());
    const t1 = setTimeout(() => map.invalidateSize(), 250);
    const t2 = setTimeout(() => map.invalidateSize(), 800);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(containerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro?.disconnect();
      if (tweenRafRef.current) cancelAnimationFrame(tweenRafRef.current);
      map.remove();
      mapRef.current = null;
      staticMarkersRef.current = [];
      vehicleMarkerRef.current = null;
      vehicleCurrentRef.current = null;
      lineRef.current = null;
      distancePillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers + bounds whenever points change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const valid = points.filter(
      (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
    );

    map.invalidateSize();

    // Refresh static (non-vehicle) markers each time
    staticMarkersRef.current.forEach((m) => m.remove());
    staticMarkersRef.current = [];

    const vehicle = valid.find((p) => p.kind === "ambulance");
    const statics = valid.filter((p) => p !== vehicle);

    for (const p of statics) {
      const marker = L.marker([p.latitude, p.longitude], {
        icon: makeIcon(p.kind),
        title: p.label ?? p.kind,
      }).addTo(map);
      if (p.label) marker.bindTooltip(p.label, { direction: "top", offset: [0, -12] });
      staticMarkersRef.current.push(marker);
    }

    // Handle the vehicle (ambulance) marker with tweening
    if (vehicle) {
      const target = { lat: vehicle.latitude, lng: vehicle.longitude };
      if (!vehicleMarkerRef.current) {
        vehicleMarkerRef.current = L.marker([target.lat, target.lng], {
          icon: makeIcon("ambulance"),
          title: vehicle.label ?? "Ambulance",
        }).addTo(map);
        if (vehicle.label)
          vehicleMarkerRef.current.bindTooltip(vehicle.label, {
            direction: "top",
            offset: [0, -16],
          });
        vehicleCurrentRef.current = target;
        redrawLineAndPill();
      } else {
        // Tween from current position to target
        const from = vehicleCurrentRef.current ?? target;
        const start = performance.now();
        const duration = 800;
        if (tweenRafRef.current) cancelAnimationFrame(tweenRafRef.current);
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const lat = from.lat + (target.lat - from.lat) * t;
          const lng = from.lng + (target.lng - from.lng) * t;
          vehicleCurrentRef.current = { lat, lng };
          vehicleMarkerRef.current?.setLatLng([lat, lng]);
          redrawLineAndPill();
          if (t < 1) tweenRafRef.current = requestAnimationFrame(step);
          else tweenRafRef.current = null;
        };
        tweenRafRef.current = requestAnimationFrame(step);
      }
    } else if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.remove();
      vehicleMarkerRef.current = null;
      vehicleCurrentRef.current = null;
      redrawLineAndPill();
    }

    function redrawLineAndPill() {
      const map = mapRef.current;
      if (!map) return;
      if (lineRef.current) {
        lineRef.current.remove();
        lineRef.current = null;
      }
      if (distancePillRef.current) {
        distancePillRef.current.remove();
        distancePillRef.current = null;
      }
      const pt = statics.find((p) => p.kind === "patient");
      const veh = vehicleCurrentRef.current;
      if (pt && veh) {
        const a = { lat: pt.latitude, lng: pt.longitude };
        const b = veh;
        lineRef.current = L.polyline(
          [
            [a.lat, a.lng],
            [b.lat, b.lng],
          ],
          { color: "#dc2626", weight: 3, dashArray: "6 6", opacity: 0.85 },
        ).addTo(map);
        if (showDistanceLabel) {
          const km = haversineKm(a, b);
          const mid: [number, number] = [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2];
          distancePillRef.current = L.marker(mid, {
            icon: distancePillIcon(km),
            interactive: false,
            keyboard: false,
          }).addTo(map);
        }
      }
    }

    if (valid.length === 1) {
      map.setView([valid[0].latitude, valid[0].longitude], Math.max(14, map.getZoom()));
    } else if (valid.length > 1) {
      const bounds = L.latLngBounds(
        valid.map((p) => [p.latitude, p.longitude] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [56, 56] });
    }
    setTimeout(() => map.invalidateSize(), 100);
  }, [points, showDistanceLabel]);

  return (
    <div className="relative" style={{ height }}>
      <div
        ref={containerRef}
        style={{ height }}
        className="overflow-hidden rounded-2xl border z-0"
      />
      {!hasAnyPoint && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow">
          Waiting for first GPS fix…
        </div>
      )}
    </div>
  );
};
