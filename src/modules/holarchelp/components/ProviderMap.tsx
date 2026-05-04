/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from "../config/google-maps";
import hospitalIcon from "@/assets/marker-hospital.png";
import ambulanceIcon from "@/assets/marker-ambulance.png";

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

const TIER_LABEL = (t?: string) => t ? t.replace("tier_", "Tier ") : "";
const TIER_COLOR: Record<string, string> = {
  tier_1: "#db2777", tier_2: "#ea580c", tier_3: "#ca8a04", tier_4: "#2563eb",
};
const distanceBetweenKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

interface Props {
  center: { lat: number; lng: number } | null;
  providers: ProviderMarker[];
  height?: number;
}

export function ProviderMap({ center, providers, height = 360 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !containerRef.current || mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !containerRef.current) return;
      mapRef.current = new google.maps.Map(containerRef.current, {
        center: center ?? { lat: -26.1, lng: 28.05 },
        zoom: center ? 12 : 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapId: GOOGLE_MAPS_MAP_ID,
      });
      setReady(true);
    });
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
      if (userMarkerRef.current) userMarkerRef.current.map = null;
      userMarkerRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !center) return;
    mapRef.current.panTo(center);
    if (mapRef.current.getZoom()! < 11) mapRef.current.setZoom(12);
    if (!userMarkerRef.current) {
      const dot = document.createElement("div");
      dot.style.cssText =
        "width:18px;height:18px;border-radius:50%;background:#1d8cff;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)";
      userMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        position: center, map: mapRef.current, content: dot, title: "You",
      });
    } else {
      userMarkerRef.current.position = center;
    }
  }, [ready, center?.lat, center?.lng]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
    if (!infoRef.current) infoRef.current = new google.maps.InfoWindow();
    for (const p of providers) {
      if (p.latitude == null || p.longitude == null) continue;
      const img = document.createElement("img");
      const dimmed = p.accepting === false;
      img.src = p.type === "hospital" ? hospitalIcon : ambulanceIcon;
      img.style.cssText = `width:38px;height:38px;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35))${dimmed ? " grayscale(1)" : ""};opacity:${dimmed ? 0.45 : 1};cursor:pointer`;
      img.alt = p.name;
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: p.latitude, lng: p.longitude },
        map: mapRef.current!, content: img, title: p.name,
      });
      const dKm = p.distanceKm ?? (center ? distanceBetweenKm(center, { lat: p.latitude, lng: p.longitude }) : null);
      const eta = dKm != null ? Math.max(1, Math.round((dKm / 40) * 60)) : null;
      const tierColor = TIER_COLOR[p.tier ?? ""] ?? "#64748b";
      const html = `
        <div style="font-family:system-ui,sans-serif;min-width:180px;padding:2px 4px">
          <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:4px">${escapeHtml(p.name)}</div>
          ${p.tier ? `<div style="display:inline-block;padding:2px 8px;border-radius:999px;background:${tierColor}1a;color:${tierColor};font-size:11px;font-weight:600;margin-bottom:6px">${TIER_LABEL(p.tier)}</div>` : ""}
          ${dKm != null ? `<div style="font-size:12px;color:#475569"><strong>${dKm.toFixed(1)} km</strong> away</div>` : ""}
          ${eta != null ? `<div style="font-size:12px;color:#475569">≈ ${eta} min by car</div>` : ""}
          ${dimmed ? `<div style="font-size:11px;color:#dc2626;font-weight:600;margin-top:4px">Currently full capacity</div>` : ""}
        </div>`;
      marker.addListener("gmp-click", () => {
        infoRef.current!.setContent(html);
        infoRef.current!.setPosition({ lat: p.latitude, lng: p.longitude });
        infoRef.current!.open({ map: mapRef.current!, anchor: marker });
      });
      markersRef.current.push(marker);
    }
  }, [ready, providers, center?.lat, center?.lng]);

  return <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-2xl border" />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
