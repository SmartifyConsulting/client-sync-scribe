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
    '<div style="width:34px;height:34px;border-radius:50%;background:#dc2626;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 6px rgba(0,0,0,0.35)">🚑</div>',
  hospital:
    '<div style="width:34px;height:34px;border-radius:50%;background:#0ea5e9;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 6px rgba(0,0,0,0.35)">🏥</div>',
};

const makeIcon = (kind: LiveMapPoint["kind"]) =>
  L.divIcon({
    html: ICON_HTML[kind],
    className: "",
    iconSize: kind === "patient" ? [18, 18] : [34, 34],
    iconAnchor: kind === "patient" ? [9, 9] : [17, 17],
  });

export const LiveMap = ({
  points,
  height = 360,
}: {
  points: LiveMapPoint[];
  height?: number;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const lineRef = useRef<L.Polyline | null>(null);

  const patient = points.find((p) => p.kind === "patient") ?? points[0];

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center: [number, number] = patient
      ? [patient.latitude, patient.longitude]
      : [-26.1, 28.05];
    const map = L.map(containerRef.current, {
      center,
      zoom: patient ? 14 : 5,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      lineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers + bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (lineRef.current) {
      lineRef.current.remove();
      lineRef.current = null;
    }

    const valid = points.filter(
      (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
    );
    if (valid.length === 0) return;

    for (const p of valid) {
      const marker = L.marker([p.latitude, p.longitude], {
        icon: makeIcon(p.kind),
        title: p.label ?? p.kind,
      }).addTo(map);
      if (p.label) marker.bindTooltip(p.label, { direction: "top", offset: [0, -12] });
      markersRef.current.push(marker);
    }

    // Draw a line between patient and responder when both present
    const pt = valid.find((p) => p.kind === "patient");
    const rsp = valid.find((p) => p.kind === "ambulance" || p.kind === "hospital");
    if (pt && rsp) {
      lineRef.current = L.polyline(
        [
          [pt.latitude, pt.longitude],
          [rsp.latitude, rsp.longitude],
        ],
        { color: "#dc2626", weight: 3, dashArray: "6 6", opacity: 0.8 },
      ).addTo(map);
    }

    if (valid.length === 1) {
      map.setView([valid[0].latitude, valid[0].longitude], Math.max(14, map.getZoom()));
    } else {
      const bounds = L.latLngBounds(valid.map((p) => [p.latitude, p.longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [48, 48] });
    }
    // Fix initial sizing inside flex/grid containers
    setTimeout(() => map.invalidateSize(), 100);
  }, [points]);

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

  return <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-2xl border z-0" />;
};
