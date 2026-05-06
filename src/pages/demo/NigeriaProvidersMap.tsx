/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadGoogleMaps, GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from "@/modules/holarchelp/config/google-maps";

type Provider = { kind: "hospital" | "ambulance"; name: string; city: string; lat: number; lng: number };

export default function NigeriaProvidersMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: hosp }, { data: amb }] = await Promise.all([
        supabase.from("holarchelp_hospitals" as any)
          .select("name, city, latitude, longitude")
          .ilike("country", "%nigeria%")
          .eq("status", "approved")
          .not("latitude", "is", null),
        supabase.from("holarchelp_ambulance_providers" as any)
          .select("company_name, city, latitude, longitude")
          .ilike("country", "%nigeria%")
          .eq("status", "approved")
          .not("latitude", "is", null),
      ]);
      const list: Provider[] = [
        ...((hosp ?? []) as any[]).map((h) => ({ kind: "hospital" as const, name: h.name, city: h.city, lat: h.latitude, lng: h.longitude })),
        ...((amb ?? []) as any[]).map((a) => ({ kind: "ambulance" as const, name: a.company_name, city: a.city, lat: a.latitude, lng: a.longitude })),
      ];
      setProviders(list);
    })();
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    loadGoogleMaps().then(() => {
      if (!containerRef.current) return;
      mapRef.current = new google.maps.Map(containerRef.current, {
        center: { lat: 9.08, lng: 8.67 },
        zoom: 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapId: GOOGLE_MAPS_MAP_ID,
        styles: undefined,
      });
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    providers.forEach((p) => {
      const el = document.createElement("div");
      const isHosp = p.kind === "hospital";
      el.style.cssText = `
        width:28px;height:28px;border-radius:50%;
        background:${isHosp ? "#E01837" : "#0EA5E9"};
        border:3px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
        display:flex;align-items:center;justify-content:center;
        color:white;font-weight:900;font-size:14px;font-family:system-ui;
      `;
      el.textContent = isHosp ? "+" : "A";
      new google.maps.marker.AdvancedMarkerElement({
        position: { lat: p.lat, lng: p.lng },
        map,
        content: el,
        title: `${p.name} — ${p.city}`,
      });
    });
  }, [ready, providers]);

  const hospitals = providers.filter((p) => p.kind === "hospital").length;
  const ambulances = providers.filter((p) => p.kind === "ambulance").length;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-slate-900 to-transparent px-6 pt-6 pb-12">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E01837] text-white font-black text-xl shadow-lg">H+</div>
          <div>
            <h1 className="text-white text-2xl font-black tracking-tight">HolarcHelp Nigeria</h1>
            <p className="text-slate-300 text-sm font-medium">Live Provider Network</p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div ref={containerRef} className="h-full w-full" />
      {!GOOGLE_MAPS_API_KEY && (
        <div className="absolute inset-0 flex items-center justify-center text-white">Map loading…</div>
      )}

      {/* Legend & stats */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent px-6 pb-8 pt-16">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E01837] text-white font-black border-2 border-white">+</div>
              <span className="text-white font-bold text-sm">Hospitals</span>
            </div>
            <p className="text-white text-3xl font-black mt-2">{hospitals}</p>
            <p className="text-slate-300 text-xs">across Nigeria</p>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0EA5E9] text-white font-black border-2 border-white">A</div>
              <span className="text-white font-bold text-sm">Ambulances</span>
            </div>
            <p className="text-white text-3xl font-black mt-2">{ambulances}</p>
            <p className="text-slate-300 text-xs">dispatch units</p>
          </div>
        </div>
      </div>
    </div>
  );
}
