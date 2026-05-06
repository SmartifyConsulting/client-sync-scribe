import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Pings the assigned provider's location into the incident every ~4s while active. */
export function useProviderLocationTracking(incidentId: string | null, active: boolean) {
  useEffect(() => {
    if (!incidentId || !active || !("geolocation" in navigator)) return;
    let watchId: number | null = null;
    let last = 0;
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - last < 4000) return;
        last = now;
        supabase.rpc("holarchelp_update_provider_location" as any, {
          _incident_id: incidentId,
          _lat: pos.coords.latitude,
          _lng: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [incidentId, active]);
}
