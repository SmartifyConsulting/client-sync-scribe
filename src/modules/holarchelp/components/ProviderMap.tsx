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
    for (const p of providers) {
      if (p.latitude == null || p.longitude == null) continue;
      const img = document.createElement("img");
      const dimmed = p.accepting === false;
      img.src = p.type === "hospital" ? hospitalIcon : ambulanceIcon;
      img.style.cssText = `width:38px;height:38px;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35))${dimmed ? " grayscale(1)" : ""};opacity:${dimmed ? 0.45 : 1}`;
      img.alt = p.name;
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: p.latitude, lng: p.longitude },
        map: mapRef.current!, content: img, title: `${p.name}${p.subtitle ? " — " + p.subtitle : ""}`,
      });
      markersRef.current.push(marker);
    }
  }, [ready, providers]);

  return <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-2xl border" />;
}
