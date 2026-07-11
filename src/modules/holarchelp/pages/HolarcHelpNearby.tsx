import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Crosshair, ArrowLeft, AlertTriangle } from "lucide-react";
import { ProviderMap, ProviderMarker } from "../components/ProviderMap";
import hospitalIcon from "@/assets/marker-hospital.png";
import ambulanceIcon from "@/assets/marker-ambulance.png";
import { toast } from "sonner";

type Coords = { lat: number; lng: number };

const distanceKm = (a: Coords, b: Coords) => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

export default function HolarcHelpNearby() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [permState, setPermState] = useState<PermissionState | "unknown">("unknown");
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [providers, setProviders] = useState<(ProviderMarker & { ownership?: string | null })[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const qLat = parseFloat(searchParams.get("lat") ?? "");
    const qLng = parseFloat(searchParams.get("lng") ?? "");
    if (!isNaN(qLat) && !isNaN(qLng)) {
      setCoords({ lat: qLat, lng: qLng });
      setPermState("granted");
      return;
    }
    if (!("permissions" in navigator)) {
      requestLocation(true);
      return;
    }
    (navigator as any).permissions.query({ name: "geolocation" }).then((p: PermissionStatus) => {
      setPermState(p.state);
      p.onchange = () => setPermState(p.state);
      if (p.state === "granted") requestLocation(true);
      else if (p.state === "prompt") requestLocation(true);
    }).catch(() => requestLocation(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestLocation = (silent = false) => {
    if (!("geolocation" in navigator)) {
      toast.error("GPS not supported on this device");
      return;
    }
    setLoadingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPermState("granted");
        setLoadingLoc(false);
      },
      (err) => {
        setLoadingLoc(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermState("denied");
          if (!silent) toast.error("Location is blocked. Enable it in your browser site settings to find nearby providers.");
        } else if (!silent) {
          toast.error("Couldn't get your location. Try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    (async () => {
      setLoadingProviders(true);
      const [{ data: hs }, { data: as_ }] = await Promise.all([
        supabase.from("holarchelp_hospitals_public" as any)
          .select("id, name, latitude, longitude, city, status, ownership")
          .not("latitude", "is", null).not("longitude", "is", null),
        supabase.from("holarchelp_ambulance_providers_public" as any)
          .select("id, company_name, latitude, longitude, city, status, ownership")
          .not("latitude", "is", null).not("longitude", "is", null),
      ]);
      if (cancelled) return;
      const list = [
        ...((hs as any[]) ?? []).map((h) => ({
          id: h.id, name: h.name, latitude: h.latitude, longitude: h.longitude,
          type: "hospital" as const, subtitle: h.city ?? undefined, ownership: h.ownership ?? 'private',
        })),
        ...((as_ as any[]) ?? []).map((a) => ({
          id: a.id, name: a.company_name, latitude: a.latitude, longitude: a.longitude,
          type: "ambulance" as const, subtitle: a.city ?? undefined, ownership: a.ownership ?? 'private',
        })),
      ];
      setProviders(list);
      setLoadingProviders(false);
    })();
    return () => { cancelled = true; };
  }, [coords?.lat, coords?.lng]);

  const sorted = coords
    ? [...providers]
        .map((p) => ({ ...p, _d: distanceKm(coords, { lat: p.latitude, lng: p.longitude }) }))
        .sort((a, b) => a._d - b._d).slice(0, 30)
    : [];

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link to="/patient/holarchelp">
        <Button size="sm" variant="ghost" className="text-primary"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold">Find nearby provider</h1>
        <p className="text-sm text-muted-foreground">Approved hospitals and emergency responders within reach.</p>
      </div>

      {!coords && permState !== "denied" && (
        <Button onClick={() => requestLocation()} disabled={loadingLoc} className="h-12 w-full gap-2 rounded-xl">
          {loadingLoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-5 w-5" />}
          Find nearby provider
        </Button>
      )}

      {permState === "denied" && (
        <Card className="border-amber-500/40 bg-amber-50">
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4" /> Location is blocked
            </div>
            <p className="text-amber-900/80 text-xs">
              To find nearby hospitals and emergency responders, enable location access for this site:
            </p>
            <ul className="list-disc pl-5 text-xs text-amber-900/80 space-y-0.5">
              <li>Tap the lock/info icon in the address bar</li>
              <li>Find <strong>Location</strong> permission and set to <strong>Allow</strong></li>
              <li>Reload this page and try again</li>
            </ul>
            <Button size="sm" onClick={() => requestLocation()} className="mt-1">Try again</Button>
          </CardContent>
        </Card>
      )}

      {coords && (
        <>
          <ProviderMap center={coords} providers={providers} height={320} />
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><img src={hospitalIcon} alt="" className="h-4 w-4" /> Hospital</span>
            <span className="flex items-center gap-1.5"><img src={ambulanceIcon} alt="" className="h-4 w-4" /> ER</span>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {loadingProviders ? "Loading providers…" : `${sorted.length} nearest`}
            </p>
            {sorted.map((p) => {
              const isPublic = (p.ownership ?? 'private') === 'public';
              return (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <img src={p.type === "hospital" ? hospitalIcon : ambulanceIcon} alt="" className="h-9 w-9 object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground capitalize">
                    <span>{p.type === "ambulance" ? "ER" : p.type}{p.subtitle && ` · ${p.subtitle}`}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${isPublic ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}>
                      {isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold">{p._d.toFixed(1)} km</p>
                </div>
              </div>
              );
            })}
            {!loadingProviders && (() => {
              const hospCount = sorted.filter((p) => p.type === "hospital").length;
              const ambCount = sorted.filter((p) => p.type === "ambulance").length;
              if (sorted.length === 0) {
                return (
                  <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No approved providers with mapped locations yet.
                  </p>
                );
              }
              return (
                <div className="space-y-1 pt-1 text-sm text-muted-foreground">
                  {hospCount === 0 && <p>No approved hospitals in your area yet.</p>}
                  {ambCount === 0 && <p>No approved emergency response providers in your area yet.</p>}
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
