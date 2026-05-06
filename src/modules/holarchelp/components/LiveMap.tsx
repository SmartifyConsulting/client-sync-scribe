/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from "../config/google-maps";
import hospitalIcon from "@/assets/marker-hospital.png";
import ambulanceIcon from "@/assets/marker-ambulance.png";

export type LiveMapPoint = {
  kind: "patient" | "ambulance" | "hospital";
  latitude: number;
  longitude: number;
  label?: string;
};

type AnyMarker = google.maps.marker.AdvancedMarkerElement | google.maps.Marker;

const hasRealMapId = !!GOOGLE_MAPS_MAP_ID && GOOGLE_MAPS_MAP_ID !== "DEMO_MAP_ID";

function makeContent(kind: LiveMapPoint["kind"]): HTMLElement {
  if (kind === "patient") {
    const dot = document.createElement("div");
    dot.style.cssText =
      "width:18px;height:18px;border-radius:50%;background:#1d8cff;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)";
    return dot;
  }
  const img = document.createElement("img");
  img.src = kind === "hospital" ? hospitalIcon : ambulanceIcon;
  img.style.cssText =
    "width:38px;height:38px;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35))";
  img.alt = kind;
  return img;
}

function classicIcon(kind: LiveMapPoint["kind"]): google.maps.Icon | google.maps.Symbol | undefined {
  if (kind === "patient") {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: "#1d8cff",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 3,
    } as google.maps.Symbol;
  }
  return {
    url: kind === "hospital" ? hospitalIcon : ambulanceIcon,
    scaledSize: new google.maps.Size(38, 38),
  } as google.maps.Icon;
}

export const LiveMap = ({
  points,
  height = 360,
}: {
  points: LiveMapPoint[];
  height?: number;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<AnyMarker[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const patient = points.find((p) => p.kind === "patient") ?? points[0];

  // Initialize map
  useEffect(() => {
    if (failed || !GOOGLE_MAPS_API_KEY || !containerRef.current || mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        try {
          const opts: google.maps.MapOptions = {
            center: patient
              ? { lat: patient.latitude, lng: patient.longitude }
              : { lat: -26.1, lng: 28.05 },
            zoom: patient ? 15 : 5,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          };
          if (hasRealMapId) (opts as any).mapId = GOOGLE_MAPS_MAP_ID;
          mapRef.current = new google.maps.Map(containerRef.current, opts);
          setReady(true);
        } catch (e) {
          console.warn("[LiveMap] init failed", e);
          setFailed(true);
        }
      })
      .catch((e) => {
        console.warn("[LiveMap] load failed", e);
        setFailed(true);
      });

    (window as any).gm_authFailure = () => {
      console.warn("[LiveMap] gm_authFailure");
      setFailed(true);
    };

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => {
        if ("setMap" in m) (m as google.maps.Marker).setMap(null);
        else (m as any).map = null;
      });
      markersRef.current = [];
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  // Render markers + fit bounds
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => {
      if ("setMap" in m) (m as google.maps.Marker).setMap(null);
      else (m as any).map = null;
    });
    markersRef.current = [];

    const valid = points.filter(
      (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
    );
    if (valid.length === 0) return;

    const useAdvanced = hasRealMapId && !!google.maps.marker?.AdvancedMarkerElement;

    for (const p of valid) {
      const pos = { lat: p.latitude, lng: p.longitude };
      let marker: AnyMarker;
      if (useAdvanced) {
        marker = new google.maps.marker.AdvancedMarkerElement({
          position: pos,
          map,
          content: makeContent(p.kind),
          title: p.label ?? p.kind,
        });
      } else {
        marker = new google.maps.Marker({
          position: pos,
          map,
          icon: classicIcon(p.kind),
          title: p.label ?? p.kind,
        });
      }
      markersRef.current.push(marker);
    }

    if (valid.length === 1) {
      map.panTo({ lat: valid[0].latitude, lng: valid[0].longitude });
      if ((map.getZoom() ?? 0) < 14) map.setZoom(15);
    } else {
      const bounds = new google.maps.LatLngBounds();
      valid.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
      map.fitBounds(bounds, 64);
    }
  }, [ready, points]);

  if (!patient) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground"
      >
        <p className="font-medium text-foreground">Waiting for first GPS fix…</p>
      </div>
    );
  }

  if (failed) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground"
      >
        <p className="font-medium text-foreground">Map unavailable</p>
        <p className="mt-1 text-xs">
          Lat {patient.latitude.toFixed(4)}, Lng {patient.longitude.toFixed(4)}
        </p>
      </div>
    );
  }

  return <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-2xl border" />;
};
