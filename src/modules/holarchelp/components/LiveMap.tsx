import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../lib/googleMapsLoader";

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

const ROUTE_COLOR: Record<LiveMapRoute["color"], string> = {
  red: "#dc2626",
  teal: "#0d9488",
};

// SVG marker icons (data-URI) â€” match the previous Mapbox look.
const PATIENT_SVG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="7" fill="#1d8cff" stroke="white" stroke-width="3"/></svg>`,
  );

const AMBULANCE_SVG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
       <circle cx="20" cy="20" r="16" fill="white" stroke="#dc2626" stroke-width="3"/>
       <g transform="translate(8,8)" fill="none" stroke="#dc2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
         <path d="M10 10H6"/><path d="M8 8v4"/><path d="M9 18h6"/>
         <path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"/>
         <path d="M3 17V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11"/>
         <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
       </g>
     </svg>`,
  );

const HOSPITAL_SVG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
       <rect x="3" y="3" width="34" height="34" rx="6" fill="#dc2626"/>
       <path d="M16 8h8v8h8v8h-8v8h-8v-8H8v-8h8z" fill="white"/>
     </svg>`,
  );

const ICON_BY_KIND: Record<LiveMapPoint["kind"], { url: string; size: number }> = {
  patient: { url: PATIENT_SVG, size: 22 },
  ambulance: { url: AMBULANCE_SVG, size: 40 },
  hospital: { url: HOSPITAL_SVG, size: 40 },
};

function iconFor(kind: LiveMapPoint["kind"], gmaps: any) {
  const cfg = ICON_BY_KIND[kind];
  return {
    url: cfg.url,
    scaledSize: new gmaps.Size(cfg.size, cfg.size),
    anchor: new gmaps.Point(cfg.size / 2, cfg.size / 2),
  };
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Overlay that pins an HTML pill to a LatLng on the map. */
function createPillOverlay(gmaps: any) {
  class PillOverlay extends gmaps.OverlayView {
    private div: HTMLDivElement | null = null;
    constructor(public position: any, public html: string) {
      super();
    }
    onAdd() {
      this.div = document.createElement("div");
      this.div.style.position = "absolute";
      this.div.style.transform = "translate(-50%, -50%)";
      this.div.style.pointerEvents = "none";
      this.div.innerHTML = this.html;
      const panes = (this as any).getPanes();
      panes.floatPane.appendChild(this.div);
    }
    draw() {
      if (!this.div) return;
      const proj = (this as any).getProjection();
      if (!proj) return;
      const p = proj.fromLatLngToDivPixel(this.position);
      if (!p) return;
      this.div.style.left = `${p.x}px`;
      this.div.style.top = `${p.y}px`;
    }
    onRemove() {
      if (this.div?.parentNode) this.div.parentNode.removeChild(this.div);
      this.div = null;
    }
  }
  return PillOverlay;
}

function distancePillHtml(km: number, color: LiveMapRoute["color"]) {
  const hex = ROUTE_COLOR[color];
  return `<div style="white-space:nowrap;padding:3px 8px;border-radius:9999px;background:white;border:2px solid ${hex};color:${hex};font-weight:700;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,0.25)">${km.toFixed(1)} km</div>`;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const gmapsRef = useRef<any>(null);
  const PillCtorRef = useRef<any>(null);
  const staticMarkersRef = useRef<any[]>([]);
  const vehicleMarkerRef = useRef<any>(null);
  const vehicleCurrentRef = useRef<{ lat: number; lng: number } | null>(null);
  const tweenRafRef = useRef<number | null>(null);
  const pillOverlaysRef = useRef<any[]>([]);
  const routeLinesRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hasAnyPoint = points.some(
    (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
  );

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    const onAuthFailure = () => {
      setErr(
        window.__lovableGmapsAuthError ??
          "Google Maps authorization failed. Check billing, enabled APIs, and domain restrictions in Google Cloud.",
      );
    };
    const onWindowError = (event: ErrorEvent) => {
      const message = String(event.message ?? "");
      if (!message.toLowerCase().includes("google maps javascript api error")) return;
      if (message.includes("BillingNotEnabledMapError")) {
        setErr("BillingNotEnabledMapError");
        return;
      }
      if (message.includes("RefererNotAllowedMapError")) {
        setErr("RefererNotAllowedMapError");
        return;
      }
      setErr(message);
    };
    window.addEventListener("lovable:gmaps-auth-failure", onAuthFailure);
    window.addEventListener("error", onWindowError);
    const observer = new MutationObserver(() => {
      const text = containerRef.current?.innerText ?? "";
      if (text.includes("This page can't load Google Maps correctly")) {
        setErr("BillingNotEnabledMapError");
      }
    });
    observer.observe(containerRef.current, { childList: true, subtree: true });
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        if (window.__lovableGmapsAuthError) {
          setErr(window.__lovableGmapsAuthError);
        }
        gmapsRef.current = g.maps;
        PillCtorRef.current = createPillOverlay(g.maps);
        const first = points.find(
          (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
        );
        mapRef.current = new g.maps.Map(containerRef.current, {
          center: first
            ? { lat: first.latitude, lng: first.longitude }
            : { lat: -26.2041, lng: 28.0473 },
          zoom: first ? 13 : 10,
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          clickableIcons: false,
        });
        setReady(true);
      })
      .catch((e) => setErr(e?.message ?? "Map failed to load"));

    return () => {
      cancelled = true;
      window.removeEventListener("lovable:gmaps-auth-failure", onAuthFailure);
      window.removeEventListener("error", onWindowError);
      observer.disconnect();
      if (tweenRafRef.current) cancelAnimationFrame(tweenRafRef.current);
      staticMarkersRef.current.forEach((m) => m.setMap(null));
      pillOverlaysRef.current.forEach((m) => m.setMap(null));
      routeLinesRef.current.forEach((m) => m.setMap(null));
      vehicleMarkerRef.current?.setMap(null);
      staticMarkersRef.current = [];
      pillOverlaysRef.current = [];
      routeLinesRef.current = [];
      vehicleMarkerRef.current = null;
      vehicleCurrentRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawRoutes = (rs: LiveMapRoute[]) => {
    const gmaps = gmapsRef.current;
    const map = mapRef.current;
    if (!map || !gmaps) return;
    routeLinesRef.current.forEach((l) => l.setMap(null));
    routeLinesRef.current = [];
    pillOverlaysRef.current.forEach((p) => p.setMap(null));
    pillOverlaysRef.current = [];

    const dashSymbol = {
      path: "M 0,-1 0,1",
      strokeOpacity: 1,
      scale: 3,
    };

    rs.forEach((r) => {
      const line = new gmaps.Polyline({
        path: [
          { lat: r.from.lat, lng: r.from.lng },
          { lat: r.to.lat, lng: r.to.lng },
        ],
        strokeColor: ROUTE_COLOR[r.color],
        strokeOpacity: 0,
        icons: [{ icon: { ...dashSymbol, strokeColor: ROUTE_COLOR[r.color] }, offset: "0", repeat: "12px" }],
        map,
      });
      routeLinesRef.current.push(line);

      const km = r.distanceKm ?? haversineKm(r.from, r.to);
      const mid = new gmaps.LatLng((r.from.lat + r.to.lat) / 2, (r.from.lng + r.to.lng) / 2);
      const Pill = PillCtorRef.current;
      const overlay = new Pill(mid, distancePillHtml(km, r.color));
      overlay.setMap(map);
      pillOverlaysRef.current.push(overlay);
    });
  };

  // Render markers + routes + bounds
  useEffect(() => {
    const gmaps = gmapsRef.current;
    const map = mapRef.current;
    if (!ready || !map || !gmaps) return;

    const valid = points.filter(
      (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
    );

    staticMarkersRef.current.forEach((m) => m.setMap(null));
    staticMarkersRef.current = [];

    const vehicle = valid.find((p) => p.kind === "ambulance");
    const statics = valid.filter((p) => p !== vehicle);

    for (const p of statics) {
      const marker = new gmaps.Marker({
        position: { lat: p.latitude, lng: p.longitude },
        map,
        icon: iconFor(p.kind, gmaps),
        title: p.label,
      });
      if (p.label) {
        const info = new gmaps.InfoWindow({ content: p.label });
        marker.addListener("click", () => info.open({ anchor: marker, map }));
      }
      staticMarkersRef.current.push(marker);
    }

    if (vehicle) {
      const target = { lat: vehicle.latitude, lng: vehicle.longitude };
      if (!vehicleMarkerRef.current) {
        vehicleMarkerRef.current = new gmaps.Marker({
          position: target,
          map,
          icon: iconFor("ambulance", gmaps),
          title: vehicle.label,
          zIndex: 999,
        });
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
          vehicleMarkerRef.current?.setPosition({ lat, lng });
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
      vehicleMarkerRef.current?.setMap(null);
      vehicleMarkerRef.current = null;
      vehicleCurrentRef.current = null;
      drawRoutes(routes);
    }

    if (valid.length === 1) {
      map.panTo({ lat: valid[0].latitude, lng: valid[0].longitude });
      if ((map.getZoom() ?? 0) < 13) map.setZoom(13);
    } else if (valid.length > 1) {
      const bounds = new gmaps.LatLngBounds();
      valid.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
      map.fitBounds(bounds, 64);
    }
  }, [ready, points, routes]);

  return (
    <div className="relative" style={{ height }}>
      <div
        ref={containerRef}
        style={{ height }}
        className="overflow-hidden rounded-2xl border z-0"
      />
      {err && (
        <div className="absolute inset-0 z-[2147483647] flex items-center justify-center bg-background/90 px-4 text-center">
          <div className="max-w-sm rounded-xl border border-destructive/40 bg-card p-3 shadow-lg">
            <p className="text-sm font-semibold text-destructive">Google Maps could not load</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {err.toLowerCase().includes("referer") || err.toLowerCase().includes("not allowed")
                ? "This domain is not on the Google Maps key's HTTP referrer allowlist. Add the domain in Google Cloud."
                : err.toLowerCase().includes("billing")
                  ? "Google Maps billing is not enabled for this API key's Google Cloud project. Enable billing, then reload this SOS screen."
                : err.toLowerCase().includes("key")
                  ? "The Google Maps key is missing or not configured for this app."
                  : err}
            </p>
          </div>
        </div>
      )}
      {!err && !hasAnyPoint && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-background/90 px-3 py-1 text-sm font-medium text-muted-foreground shadow">
          Waiting for first GPS fixâ€¦
        </div>
      )}
    </div>
  );
};

