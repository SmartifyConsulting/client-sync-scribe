import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Records telematics pings for the current driver during an active shift
 * (independent of any incident). Used by ER admins for "where are my drivers".
 */
export function useShiftTelematics(
  providerId: string | null | undefined,
  active: boolean,
  vehicleId?: string | null,
) {
  const { user } = useAuth();
  useEffect(() => {
    if (!providerId || !active || !user || !("geolocation" in navigator)) return;
    let watchId: number | null = null;
    let last = 0;
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - last < 5_000) return;
        last = now;
        supabase.from("holarchelp_telematics_pings" as any).insert({
          provider_id: providerId,
          user_id: user.id,
          vehicle_id: vehicleId ?? null,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed_kph: pos.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : null,
          heading: pos.coords.heading ?? null,
          accuracy_m: pos.coords.accuracy ?? null,
        } as any);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 15000 },
    );
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [providerId, active, vehicleId, user]);
}
