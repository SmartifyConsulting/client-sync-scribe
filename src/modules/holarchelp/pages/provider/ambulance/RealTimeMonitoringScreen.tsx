import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2, MapPin, AlertTriangle, Radar, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AmbulanceSimulator } from "../../../components/AmbulanceSimulator";
import { loadGoogleMaps } from "../../../lib/googleMapsLoader";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";

type FleetMarker = { id: string; lat: number; lng: number; label: string };

function FleetLiveMap({ markers }: { markers: FleetMarker[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRefs = useRef<Map<string, any>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !ref.current || mapRef.current) return;
        mapRef.current = new google.maps.Map(ref.current, {
          center: markers[0] ? { lat: markers[0].lat, lng: markers[0].lng } : { lat: -26.2041, lng: 28.0473 },
          zoom: 11,
          disableDefaultUI: true,
          zoomControl: true,
        });
      })
      .catch((e) => setError(e?.message ?? "Map unavailable"));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined" || !window.google?.maps) return;
    const g = window.google;
    // remove stale
    markerRefs.current.forEach((m, id) => {
      if (!markers.find((x) => x.id === id)) { m.setMap(null); markerRefs.current.delete(id); }
    });
    markers.forEach((m) => {
      const existing = markerRefs.current.get(m.id);
      if (existing) {
        existing.setPosition({ lat: m.lat, lng: m.lng });
      } else {
        const marker = new g.maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map: mapRef.current,
          title: m.label,
        });
        markerRefs.current.set(m.id, marker);
      }
    });
  }, [markers]);

  if (error) {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning/5 p-4 text-xs text-warning">
        Fleet map unavailable: {error}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div ref={ref} className="w-full h-[320px] bg-muted" />
    </div>
  );
}

export default function RealTimeMonitoringScreen() {
  const { t } = useTranslation();
  const { providerId } = useProviderAccess();
  const [markers, setMarkers] = useState<FleetMarker[]>([]);

  useEffect(() => {
    if (!providerId) return;
    const load = async () => {
      const { data } = await supabase
        .from("holarchelp_provider_locations" as any)
        .select("id, latitude, longitude, vehicle_code")
        .eq("provider_id", providerId);
      const list = ((data as any[]) ?? [])
        .filter((r) => r.latitude != null && r.longitude != null)
        .map((r) => ({
          id: String(r.id),
          lat: Number(r.latitude),
          lng: Number(r.longitude),
          label: r.vehicle_code ?? "Vehicle",
        }));
      setMarkers(list);
    };
    load();
    const ch = supabase
      .channel(`fleet-live-${providerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "holarchelp_provider_locations", filter: `provider_id=eq.${providerId}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [providerId]);

  const trackingRows = [
    { vehicle: "AMB-001", location: "Main Street", speed: "35 km/h", fuel: "78%", status: "moving" },
    { vehicle: "AMB-002", location: "Highway 101", speed: "68 km/h", fuel: "62%", status: "moving" },
    { vehicle: "AMB-003", location: "Workshop", speed: "0 km/h", fuel: "45%", status: "stopped" },
  ];

  const safetyEvents = [
    { vehicle: "AMB-002", event: "Speeding on Highway 101", severity: "HIGH", time: "2 min ago", action: "Coach Driver" },
    { vehicle: "AMB-001", event: "Harsh braking detected", severity: "MEDIUM", time: "15 min ago", action: "Review" },
    { vehicle: "AMB-003", event: "After-hours movement", severity: "HIGH", time: "1 hour ago", action: "Investigate" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t("realTimeMonitoring.eyebrow", "Operations")}
        </p>
        <h1 className="text-2xl font-extrabold mt-1 flex items-center gap-2">
          <Radar className="h-5 w-5 text-primary" />
          {t("nav.realTimeMonitoring", "Fleet Live")}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t("realTimeMonitoring.description", "All vehicles on one map — live GPS, speed and safety events across the fleet.")}
        </p>
      </div>

      <AmbulanceSimulator />

      {/* Fleet-wide map */}
      <FleetLiveMap markers={markers} />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Vehicles Online" value={`${markers.length || 6} / 6`} hint="GPS connected" tone="success" />
        <StatCard label="Avg Speed" value="42 km/h" hint="Within limits" tone="muted" />
        <StatCard label="Fuel Status" value="72%" hint="Good levels" tone="success" />
      </div>

      {/* Per-vehicle tracking */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {t("realTimeMonitoring.tabs.tracking", "Live Tracking")}
        </h2>
        {trackingRows.map((item) => (
          <div key={item.vehicle} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-sm">{item.vehicle}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {item.location}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                  item.status === "moving" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                }`}
              >
                {item.status}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs items-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Speed</p>
                <p className="font-semibold">{item.speed}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Fuel</p>
                <p className="font-semibold">{item.fuel}</p>
              </div>
              <div className="text-right">
                <Button variant="outline" size="sm" className="h-7 text-xs">Track</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Safety events — merged in from former Safety tab */}
      <Accordion type="single" collapsible defaultValue="safety" className="space-y-2">
        <AccordionItem value="safety" className="rounded-2xl border-2 border-primary/40 bg-background overflow-hidden">
          <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
            <div className="flex flex-1 items-center justify-between pr-2">
              <span className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Safety events
              </span>
              <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="text-destructive">● 2 high</span>
                <span className="text-warning">● 1 medium</span>
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-2">
            <div className="space-y-1.5">
              {safetyEvents.map((item) => (
                <div
                  key={`${item.vehicle}-${item.event}`}
                  className={`rounded-xl border-l-4 border border-border bg-card p-3 ${
                    item.severity === "HIGH" ? "border-l-destructive" : "border-l-warning"
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <h3 className="font-bold text-sm flex items-center gap-1.5">
                        <AlertTriangle
                          className={`h-3.5 w-3.5 ${
                            item.severity === "HIGH" ? "text-destructive" : "text-warning"
                          }`}
                        />
                        {item.vehicle}
                      </h3>
                      <p className="text-xs mt-0.5">{item.event}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        item.severity === "HIGH"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">{item.time}</p>
                    <Button variant="outline" size="sm" className="h-7 text-xs">{item.action}</Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card p-3 mt-3">
              <h3 className="font-bold text-xs mb-2">Safety event types monitored</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {[
                  "Speeding events",
                  "Harsh acceleration / braking",
                  "After-hours vehicle use",
                  "Geofence breaches",
                  "Route deviations",
                  "Unauthorized stops",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "success" | "muted" | "destructive" | "warning";
}) {
  const toneClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-extrabold mt-1 ${toneClass}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
