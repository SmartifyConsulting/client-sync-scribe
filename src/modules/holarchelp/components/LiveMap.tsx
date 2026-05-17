import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type LiveMapPoint = {
  kind: "patient" | "ambulance" | "hospital";
  latitude: number;
  longitude: number;
  label?: string;
};

export type LiveMapRoute = {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  color: "red" | "teal";
  distanceKm?: number;
};

const COLOR: Record<LiveMapRoute["color"], string> = {
  red: "#dc2626",
  teal: "#0d9488",
};

const ICON_HTML: Record<LiveMapPoint["kind"], string> = {
  patient:
    '<div style="width:18px;height:18px;border-radius:50%;background:#1d8cff;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
  ambulance:
    '<div style="width:34px;height:34px;border-radius:50%;background:white;border:3px solid #dc2626;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35)"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10H6"/><path d="M8 8v4"/><path d="M9 18h6"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"/><path d="M3 17V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>',
  hospital:
    '<div style="width:34px;height:34px;border-radius:6px;background:white;border:3px solid #0d9488;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35)"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#0d9488"><path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/></svg></div>',
};

const makeIcon = (kind: LiveMapPoint["kind"]) =>
  L.divIcon({
    html: ICON_HTML[kind],
    className: "",
    iconSize: kind === "patient" ? [18, 18] : [34, 34],
    iconAnchor: kind === "patient" ? [9, 9] : [17, 17],
  });

const distancePillIcon = (km: number, color: LiveMapRoute["color"]) => {
  const hex = COLOR[color];
  return L.divIcon({
    html: `<div style="white-space:nowrap;padding:3px 8px;border-radius:9999px;background:white;border:2px solid ${hex};color:${hex};font-weight:700;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,0.25)">${km.toFixed(1)} km</div>`,
    className: "",
    iconSize: [60, 22],
    iconAnchor: [30, 11],
  });
};

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
  routes = [],
  height = 360,
}: {
  points: LiveMapPoint[];
  routes?: LiveMapRoute[];
  height?: number;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const staticMarkersRef = useRef<L.Marker[]>([]);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const vehicleCurrentRef = useRef<{ lat: number; lng: number } | null>(null);
  const tweenRafRef = useRef<number | null>(null);
  const routeLayersRef = useRef<L.Layer[]>([]);

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
      routeLayersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Routes (lines + pills)
  const drawRoutes = (rs: LiveMapRoute[]) => {
    const map = mapRef.current;
    if (!map) return;
    routeLayersRef.current.forEach((l) => l.remove());
    routeLayersRef.current = [];
    for (const r of rs) {
      const line = L.polyline(
        [
          [r.from.lat, r.from.lng],
          [r.to.lat, r.to.lng],
        ],
        { color: COLOR[r.color], weight: 3, dashArray: "6 6", opacity: 0.85 },
      ).addTo(map);
      routeLayersRef.current.push(line);
      const km = r.distanceKm ?? haversineKm(r.from, r.to);
      const mid: [number, number] = [(r.from.lat + r.to.lat) / 2, (r.from.lng + r.to.lng) / 2];
      const pill = L.marker(mid, {
        icon: distancePillIcon(km, r.color),
        interactive: false,
        keyboard: false,
      }).addTo(map);
      routeLayersRef.current.push(pill);
    }
  };

  // Update markers + bounds + routes whenever inputs change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const valid = points.filter(
      (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
    );

    map.invalidateSize();

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
        drawRoutes(routes);
      } else {
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
          // Substitute the live vehicle position into any routes that originally point at the target.
          const live = routes.map((r) => {
            const fromMatches = r.from.lat === target.lat && r.from.lng === target.lng;
            const toMatches = r.to.lat === target.lat && r.to.lng === target.lng;
            if (fromMatches) return { ...r, from: { lat, lng } };
            if (toMatches) return { ...r, to: { lat, lng } };
            return r;
          });
          drawRoutes(live);
          if (t < 1) tweenRafRef.current = requestAnimationFrame(step);
          else tweenRafRef.current = null;
        };
        tweenRafRef.current = requestAnimationFrame(step);
      }
    } else {
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.remove();
        vehicleMarkerRef.current = null;
        vehicleCurrentRef.current = null;
      }
      drawRoutes(routes);
    }

    if (valid.length === 1) {
      map.setView([valid[0].latitude, valid[0].longitude], Math.max(14, map.getZoom()));
    } else if (valid.length > 1) {
      const bounds = L.latLngBounds(
        valid.map((p) => [p.latitude, p.longitude] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [64, 64] });
    }
    setTimeout(() => map.invalidateSize(), 100);
  }, [points, routes]);

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
