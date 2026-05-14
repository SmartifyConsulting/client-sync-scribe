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
    '<div style="width:34px;height:34px;border-radius:50%;background:white;border:3px solid #dc2626;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35)"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10H6"/><path d="M8 8v4"/><path d="M9 18h6"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"/><path d="M3 17V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>',
  hospital:
    '<div style="width:34px;height:34px;border-radius:6px;background:white;border:3px solid #dc2626;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35)"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#dc2626"><path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/></svg></div>',
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

  const hasAnyPoint = points.some(
    (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
  );

  // Init map once — runs on mount, regardless of whether we have points yet.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const first = points.find(
      (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
    );
    const center: [number, number] = first
      ? [first.latitude, first.longitude]
      : [-26.2041, 28.0473]; // Johannesburg fallback
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
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      lineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers + bounds whenever points change.
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

    // Always invalidate size before changing the view — handles container resize on re-entry.
    map.invalidateSize();

    if (valid.length === 0) return;

    for (const p of valid) {
      const marker = L.marker([p.latitude, p.longitude], {
        icon: makeIcon(p.kind),
        title: p.label ?? p.kind,
      }).addTo(map);
      if (p.label) marker.bindTooltip(p.label, { direction: "top", offset: [0, -12] });
      markersRef.current.push(marker);
    }

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
    setTimeout(() => map.invalidateSize(), 100);
  }, [points]);

  return (
    <div className="relative" style={{ height }}>
      <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-2xl border z-0" />
      {!hasAnyPoint && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow">
          Waiting for first GPS fix…
        </div>
      )}
    </div>
  );
};
