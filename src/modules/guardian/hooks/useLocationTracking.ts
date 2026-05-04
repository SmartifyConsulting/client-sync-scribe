import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useLocationTracking = (incidentId: string | null, enabled: boolean) => {
  const lastWriteRef = useRef(0);

  useEffect(() => {
    if (!enabled || !incidentId) return;
    if (!("geolocation" in navigator)) {
      toast({
        title: "Location unavailable",
        description: "This device does not support geolocation.",
        variant: "destructive",
      });
      return;
    }

    let watchId: number | null = null;
    let cancelled = false;

    const startWatch = () => {
      if (cancelled) return;
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const now = Date.now();
          if (now - lastWriteRef.current < 5000) return;
          lastWriteRef.current = now;
          await supabase.from("holarchelp_locations" as any).insert({
            incident_id: incidentId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          console.error("geo error", err);
          if (err.code === err.PERMISSION_DENIED) {
            toast({
              title: "Location permission denied",
              description: "Enable location access in your browser settings so responders can find you.",
              variant: "destructive",
            });
          }
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
      );
    };

    // Pre-flight: prompt for permission if not yet granted
    const init = async () => {
      try {
        if ("permissions" in navigator) {
          const status = await (navigator.permissions as any).query({ name: "geolocation" });
          if (status.state === "denied") {
            toast({
              title: "Location is blocked",
              description: "Please enable location access for this site so we can track your SOS.",
              variant: "destructive",
            });
            return;
          }
          if (status.state === "prompt") {
            // Trigger the browser permission dialog explicitly
            navigator.geolocation.getCurrentPosition(
              () => startWatch(),
              (err) => {
                console.error("geo prompt error", err);
                if (err.code === err.PERMISSION_DENIED) {
                  toast({
                    title: "Location permission denied",
                    description: "Responders will not be able to see your live location.",
                    variant: "destructive",
                  });
                } else {
                  startWatch();
                }
              },
              { enableHighAccuracy: true, timeout: 15000 }
            );
            return;
          }
        }
        startWatch();
      } catch {
        startWatch();
      }
    };

    init();
    return () => {
      cancelled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [incidentId, enabled]);
};
