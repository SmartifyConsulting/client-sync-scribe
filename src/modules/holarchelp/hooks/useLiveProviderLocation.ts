import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Streams the assigned ambulance crew's GPS into holarchelp_provider_locations
 * (used by the shared SosLiveMap so patient + hospital + admin see live position).
 * Also calls the legacy RPC for backward-compat ETA fields on the incident.
 */
export function useLiveProviderLocation(
  incidentId: string | null,
  providerId: string | null | undefined,
  active: boolean,
) {
  const { user } = useAuth();
  useEffect(() => {
    if (!incidentId || !providerId || !active || !user || !("geolocation" in navigator)) return;
    let watchId: number | null = null;
    let last = 0;
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - last < 10_000) return;
        last = now;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        supabase
          .from("holarchelp_provider_locations" as any)
          .upsert({
            incident_id: incidentId,
            provider_id: providerId,
            provider_kind: "ambulance",
            user_id: user.id,
            latitude: lat,
            longitude: lng,
            heading: pos.coords.heading ?? null,
            speed: pos.coords.speed ?? null,
            accuracy: pos.coords.accuracy ?? null,
            recorded_at: new Date().toISOString(),
          } as any, { onConflict: "incident_id,provider_id" });
        supabase.rpc("holarchelp_update_provider_location" as any, {
          _incident_id: incidentId,
          _lat: lat,
          _lng: lng,
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [incidentId, providerId, active, user]);
}
