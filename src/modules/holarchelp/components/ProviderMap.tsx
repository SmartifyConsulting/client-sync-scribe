import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../lib/googleMapsLoader";

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

const USER_SVG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="7" fill="#1d8cff" stroke="white" stroke-width="3"/></svg>`,
  );

const ambulanceSvg = (dimmed: boolean) =>
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" opacity="${dimmed ? 0.5 : 1}">
       <circle cx="20" cy="20" r="16" fill="white" stroke="#dc2626" stroke-width="3"/>
       <g transform="translate(8,8)" fill="none" stroke="${dimmed ? "#94a3b8" : "#dc2626"}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
         <path d="M10 10H6"/><path d="M8 8v4"/><path d="M9 18h6"/>
         <path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"/>
         <path d="M3 17V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11"/>
         <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
       </g>
     </svg>`,
  );

const hospitalSvg = (dimmed: boolean) =>
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" opacity="${dimmed ? 0.5 : 1}">
       <rect x="3" y="3" width="34" height="34" rx="6" fill="white" stroke="${dimmed ? "#94a3b8" : "#16a34a"}" stroke-width="3"/>
       <path d="M16 8h8v8h8v8h-8v8h-8v-8H8v-8h8z" fill="${dimmed ? "#94a3b8" : "#16a34a"}"/>
     </svg>`,
  );

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
  const mapRef = useRef<any>(null);
  const gmapsRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        gmapsRef.current = g.maps;
        mapRef.current = new g.maps.Map(containerRef.current, {
          center: center ? { lat: center.lat, lng: center.lng } : { lat: -26.1, lng: 28.05 },
          zoom: center ? 11 : 4,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        setReady(true);
      })
      .catch((e) => setErr(e?.message ?? "Map failed to load"));
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      userMarkerRef.current?.setMap(null);
      markersRef.current = [];
      userMarkerRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    const gmaps = gmapsRef.current;
    const map = mapRef.current;
    if (!map || !gmaps || !center) return;
    map.panTo({ lat: center.lat, lng: center.lng });
    if ((map.getZoom() ?? 0) < 11) map.setZoom(11);
    if (!userMarkerRef.current) {
      userMarkerRef.current = new gmaps.Marker({
        position: { lat: center.lat, lng: center.lng },
        map,
        icon: { url: USER_SVG, scaledSize: new gmaps.Size(22, 22), anchor: new gmaps.Point(11, 11) },
        zIndex: 999,
      });
    } else {
      userMarkerRef.current.setPosition({ lat: center.lat, lng: center.lng });
    }
  }, [ready, center?.lat, center?.lng]);

  useEffect(() => {
    if (!ready) return;
    const gmaps = gmapsRef.current;
    const map = mapRef.current;
    if (!map || !gmaps) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    for (const p of providers) {
      if (p.latitude == null || p.longitude == null) continue;
      const dimmed = p.accepting === false;
      const url = p.type === "hospital" ? hospitalSvg(dimmed) : ambulanceSvg(dimmed);
      const marker = new gmaps.Marker({
        position: { lat: p.latitude, lng: p.longitude },
        map,
        icon: { url, scaledSize: new gmaps.Size(40, 40), anchor: new gmaps.Point(20, 20) },
        title: p.name,
      });
      const dKm = p.distanceKm ?? (center ? distanceBetweenKm(center, { lat: p.latitude, lng: p.longitude }) : null);
      const eta = dKm != null ? Math.max(1, Math.round((dKm / 40) * 60)) : null;
      const info = new gmaps.InfoWindow({
        content: `
        <div style="font-family:system-ui,sans-serif;min-width:180px;padding:2px 4px">
          <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:4px">${escapeHtml(p.name)}</div>
          ${dKm != null ? `<div style="font-size:12px;color:#475569"><strong>${dKm.toFixed(1)} km</strong> away</div>` : ""}
          ${eta != null ? `<div style="font-size:12px;color:#475569">â‰ˆ ${eta} min by car</div>` : ""}
          ${dimmed ? `<div style="font-size:11px;color:#dc2626;font-weight:600;margin-top:4px">Currently full capacity</div>` : ""}
        </div>`,
      });
      marker.addListener("click", () => info.open({ anchor: marker, map }));
      markersRef.current.push(marker);
    }
  }, [ready, providers, center?.lat, center?.lng]);

  return (
    <div className="relative" style={{ height }}>
      <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-2xl border z-0" />
      {err && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-destructive/90 px-3 py-1 text-sm font-medium text-destructive-foreground shadow">
          {err}
        </div>
      )}
    </div>
  );
}

