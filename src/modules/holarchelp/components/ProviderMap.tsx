import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapboxToken } from "../hooks/useMapboxToken";
import { MAPBOX_STYLE } from "../config/mapbox";

export type ProviderMarker = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: "hospital" | "ambulance";
  subtitle?: string;
  accepting?: boolean;
  tier?: string;
  distanceKm?: number;
};

interface Props {
  center: { lat: number; lng: number } | null;
  providers: ProviderMarker[];
  height?: number;
}

const ICON_HTML = {
  user:
    '<div style="width:18px;height:18px;border-radius:50%;background:#1d8cff;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
  ambulance: (dimmed: boolean) =>
    `<div style="width:34px;height:34px;border-radius:50%;background:white;border:3px solid #dc2626;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);opacity:${dimmed ? 0.45 : 1};filter:${dimmed ? "grayscale(1)" : "none"}"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10H6"/><path d="M8 8v4"/><path d="M9 18h6"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"/><path d="M3 17V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>`,
  hospital: (dimmed: boolean) =>
    `<div style="width:34px;height:34px;border-radius:6px;background:white;border:3px solid #16a34a;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);opacity:${dimmed ? 0.45 : 1};filter:${dimmed ? "grayscale(1)" : "none"}"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#16a34a"><path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/></svg></div>`,
};

function makeEl(html: string): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = html;
  el.style.cursor = "pointer";
  return el.firstElementChild as HTMLElement;
}

const distanceBetweenKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function ProviderMap({ center, providers, height = 360 }: Props) {
  const { data: token } = useMapboxToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: center ? [center.lng, center.lat] : [28.05, -26.1],
      zoom: center ? 11 : 4,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(() => map.resize());
      ro.observe(containerRef.current);
    }
    requestAnimationFrame(() => map.resize());
    return () => {
      ro?.disconnect();
      markersRef.current.forEach((m) => m.remove());
      userMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    map.easeTo({ center: [center.lng, center.lat], zoom: Math.max(map.getZoom() ?? 10, 11) });
    if (!userMarkerRef.current) {
      userMarkerRef.current = new mapboxgl.Marker({ element: makeEl(ICON_HTML.user) })
        .setLngLat([center.lng, center.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([center.lng, center.lat]);
    }
  }, [center?.lat, center?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    for (const p of providers) {
      if (p.latitude == null || p.longitude == null) continue;
      const dimmed = p.accepting === false;
      const html = p.type === "hospital" ? ICON_HTML.hospital(dimmed) : ICON_HTML.ambulance(dimmed);
      const marker = new mapboxgl.Marker({ element: makeEl(html) })
        .setLngLat([p.longitude, p.latitude])
        .addTo(map);
      const dKm = p.distanceKm ?? (center ? distanceBetweenKm(center, { lat: p.latitude, lng: p.longitude }) : null);
      const eta = dKm != null ? Math.max(1, Math.round((dKm / 40) * 60)) : null;
      const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(`
        <div style="font-family:system-ui,sans-serif;min-width:180px;padding:2px 4px">
          <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:4px">${escapeHtml(p.name)}</div>
          ${dKm != null ? `<div style="font-size:12px;color:#475569"><strong>${dKm.toFixed(1)} km</strong> away</div>` : ""}
          ${eta != null ? `<div style="font-size:12px;color:#475569">≈ ${eta} min by car</div>` : ""}
          ${dimmed ? `<div style="font-size:11px;color:#dc2626;font-weight:600;margin-top:4px">Currently full capacity</div>` : ""}
        </div>`);
      marker.setPopup(popup);
      markersRef.current.push(marker);
    }
  }, [providers, center?.lat, center?.lng]);

  return <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-2xl border z-0" />;
}
