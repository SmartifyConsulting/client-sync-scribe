import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: center ? [center.lat, center.lng] : [-26.1, 28.05],
      zoom: center ? 12 : 5,
      zoomControl: true,
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
      clearTimeout(t1); clearTimeout(t2); ro?.disconnect();
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    map.setView([center.lat, center.lng], Math.max(map.getZoom() ?? 11, 12));
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([center.lat, center.lng], {
        icon: L.divIcon({ html: ICON_HTML.user, className: "", iconSize: [18, 18], iconAnchor: [9, 9] }),
        title: "You",
      }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([center.lat, center.lng]);
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
      const marker = L.marker([p.latitude, p.longitude], {
        icon: L.divIcon({ html, className: "", iconSize: [34, 34], iconAnchor: [17, 17] }),
        title: p.name,
      }).addTo(map);
      const dKm = p.distanceKm ?? (center ? distanceBetweenKm(center, { lat: p.latitude, lng: p.longitude }) : null);
      const eta = dKm != null ? Math.max(1, Math.round((dKm / 40) * 60)) : null;
      const popup = `
        <div style="font-family:system-ui,sans-serif;min-width:180px;padding:2px 4px">
          <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:4px">${escapeHtml(p.name)}</div>
          ${dKm != null ? `<div style="font-size:12px;color:#475569"><strong>${dKm.toFixed(1)} km</strong> away</div>` : ""}
          ${eta != null ? `<div style="font-size:12px;color:#475569">≈ ${eta} min by car</div>` : ""}
          ${dimmed ? `<div style="font-size:11px;color:#dc2626;font-weight:600;margin-top:4px">Currently full capacity</div>` : ""}
        </div>`;
      marker.bindPopup(popup);
      markersRef.current.push(marker);
    }
  }, [providers, center?.lat, center?.lng]);

  return <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-2xl border z-0" />;
}
