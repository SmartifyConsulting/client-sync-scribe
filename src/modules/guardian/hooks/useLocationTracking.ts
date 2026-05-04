import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useLocationTracking = (incidentId: string | null, enabled: boolean) => {
  const lastWriteRef = useRef(0);

  useEffect(() => {
    if (!enabled || !incidentId) return;
    if (!("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastWriteRef.current < 5000) return;
        lastWriteRef.current = now;
        await supabase.from("guardian_locations" as any).insert({
          incident_id: incidentId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => console.error("geo error", err),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [incidentId, enabled]);
};
