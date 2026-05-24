import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapboxToken } from "../hooks/useMapboxToken";
import { MAPBOX_STYLE } from "../config/mapbox";

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
    '<div style="width:34px;height:34px;border-radius:6px;background:#dc2626;border:3px solid #dc2626;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35)"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#ffffff"><path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/></svg></div>',
};

function makeMarkerEl(kind: LiveMapPoint["kind"]) {
  const el = document.createElement("div");
  el.innerHTML = ICON_HTML[kind];
  el.style.cursor = "pointer";
  return el.firstElementChild as HTMLElement;
}

function distancePillEl(km: number, color: LiveMapRoute["color"]) {
  const hex = COLOR[color];
  const el = document.createElement("div");
  el.innerHTML = `<div style="white-space:nowrap;padding:3px 8px;border-radius:9999px;background:white;border:2px solid ${hex};color:${hex};font-weight:700;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,0.25)">${km.toFixed(1)} km</div>`;
  return el.firstElementChild as HTMLElement;
}

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
  const { data: token } = useMapboxToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const styleLoadedRef = useRef(false);
  const staticMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const vehicleMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const vehicleCurrentRef = useRef<{ lat: number; lng: number } | null>(null);
  const tweenRafRef = useRef<number | null>(null);
  const pillMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const routeIdsRef = useRef<string[]>([]);

  const hasAnyPoint = points.some(
    (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
  );

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token) return;
    mapboxgl.accessToken = token;
    const first = points.find(
      (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
    );
    const center: [number, number] = first
      ? [first.longitude, first.latitude]
      : [28.0473, -26.2041];
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center,
      zoom: first ? 13 : 10,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    map.on("load", () => {
      styleLoadedRef.current = true;
    });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(() => map.resize());
      ro.observe(containerRef.current);
    }
    requestAnimationFrame(() => map.resize());

    return () => {
      ro?.disconnect();
      if (tweenRafRef.current) cancelAnimationFrame(tweenRafRef.current);
      staticMarkersRef.current.forEach((m) => m.remove());
      pillMarkersRef.current.forEach((m) => m.remove());
      vehicleMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      styleLoadedRef.current = false;
      staticMarkersRef.current = [];
      pillMarkersRef.current = [];
      vehicleMarkerRef.current = null;
      vehicleCurrentRef.current = null;
      routeIdsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const drawRoutes = (rs: LiveMapRoute[]) => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;
    // Remove previous route layers + sources
    for (const id of routeIdsRef.current) {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    }
    routeIdsRef.current = [];
    pillMarkersRef.current.forEach((m) => m.remove());
    pillMarkersRef.current = [];

    rs.forEach((r, i) => {
      const id = `route-${i}`;
      map.addSource(id, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [r.from.lng, r.from.lat],
              [r.to.lng, r.to.lat],
            ],
          },
          properties: {},
        },
      });
      map.addLayer({
        id,
        type: "line",
        source: id,
        paint: {
          "line-color": COLOR[r.color],
          "line-width": 3,
          "line-dasharray": [2, 2],
          "line-opacity": 0.85,
        },
      });
      routeIdsRef.current.push(id);

      const km = r.distanceKm ?? haversineKm(r.from, r.to);
      const mid: [number, number] = [(r.from.lng + r.to.lng) / 2, (r.from.lat + r.to.lat) / 2];
      const pill = new mapboxgl.Marker({ element: distancePillEl(km, r.color) })
        .setLngLat(mid)
        .addTo(map);
      pillMarkersRef.current.push(pill);
    });
  };

  // Render markers + routes + bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const valid = points.filter(
        (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
      );

      staticMarkersRef.current.forEach((m) => m.remove());
      staticMarkersRef.current = [];

      const vehicle = valid.find((p) => p.kind === "ambulance");
      const statics = valid.filter((p) => p !== vehicle);

      for (const p of statics) {
        const m = new mapboxgl.Marker({ element: makeMarkerEl(p.kind) })
          .setLngLat([p.longitude, p.latitude])
          .addTo(map);
        if (p.label) m.setPopup(new mapboxgl.Popup({ offset: 16 }).setText(p.label));
        staticMarkersRef.current.push(m);
      }

      if (vehicle) {
        const target = { lat: vehicle.latitude, lng: vehicle.longitude };
        if (!vehicleMarkerRef.current) {
          vehicleMarkerRef.current = new mapboxgl.Marker({ element: makeMarkerEl("ambulance") })
            .setLngLat([target.lng, target.lat])
            .addTo(map);
          if (vehicle.label) {
            vehicleMarkerRef.current.setPopup(
              new mapboxgl.Popup({ offset: 16 }).setText(vehicle.label),
            );
          }
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
            vehicleMarkerRef.current?.setLngLat([lng, lat]);
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
        vehicleMarkerRef.current?.remove();
        vehicleMarkerRef.current = null;
        vehicleCurrentRef.current = null;
        drawRoutes(routes);
      }

      if (valid.length === 1) {
        map.easeTo({
          center: [valid[0].longitude, valid[0].latitude],
          zoom: Math.max(13, map.getZoom()),
        });
      } else if (valid.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        valid.forEach((p) => bounds.extend([p.longitude, p.latitude]));
        map.fitBounds(bounds, { padding: 64, duration: 600 });
      }
    };

    if (styleLoadedRef.current) apply();
    else map.once("load", apply);
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
