/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from "../config/google-maps";

type Point = { latitude: number; longitude: number };

export const LiveMap = ({ points, height = 360 }: { points: Point[]; height?: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [ready, setReady] = useState(false);

  const latest = points[0];

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !containerRef.current || mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !containerRef.current) return;
      mapRef.current = new google.maps.Map(containerRef.current, {
        center: latest ? { lat: latest.latitude, lng: latest.longitude } : { lat: 20, lng: 0 },
        zoom: latest ? 15 : 2,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapId: GOOGLE_MAPS_MAP_ID,
      });
      setReady(true);
    });
    return () => {
      cancelled = true;
      if (markerRef.current) markerRef.current.map = null;
      markerRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map || !latest) return;
    const pos = { lat: latest.latitude, lng: latest.longitude };
    if (!markerRef.current) {
      const dot = document.createElement("div");
      dot.style.cssText =
        "width:18px;height:18px;border-radius:50%;background:hsl(354,84%,54%);border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)";
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({ position: pos, map, content: dot });
    } else {
      markerRef.current.position = pos;
    }
    map.panTo(pos);
    if (map.getZoom()! < 14) map.setZoom(14);
  }, [ready, latest?.latitude, latest?.longitude]);

  if (!latest && !ready) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground"
      >
        <p className="font-medium text-foreground">Waiting for first GPS fix…</p>
      </div>
    );
  }

  return <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-2xl border" />;
};
