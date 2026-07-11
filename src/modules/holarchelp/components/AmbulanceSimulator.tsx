import { useEffect, useRef, useState } from "react";
import { PlayCircle, StopCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useProviderAccess } from "../components/ProviderGate";
import { toast } from "sonner";

/**
 * Demo simulator: walks a fake ambulance along a Joburg route.
 *
 * Visible only when:
 *   - hostname is a preview domain (NOT holarchealth.com), AND
 *   - the current user has the 'admin' role.
 *
 * Each tick it upserts a row in holarchelp_provider_locations with simulated=true.
 * An RLS RESTRICTIVE policy enforces that only admins may write simulated rows,
 * so even if the toggle ever leaked into production the DB rejects the write.
 *
 * This component renders nothing in production.
 */

type LatLng = { lat: number; lng: number };

// Sandton → Charlotte Maxeke Academic Hospital, ~10 stops
const DEMO_ROUTE: LatLng[] = [
  { lat: -26.1076, lng: 28.0567 }, // Sandton City
  { lat: -26.1170, lng: 28.0540 },
  { lat: -26.1280, lng: 28.0510 },
  { lat: -26.1390, lng: 28.0480 },
  { lat: -26.1500, lng: 28.0455 },
  { lat: -26.1620, lng: 28.0440 },
  { lat: -26.1740, lng: 28.0425 },
  { lat: -26.1820, lng: 28.0410 },
  { lat: -26.1900, lng: 28.0400 }, // Parktown
  { lat: -26.1955, lng: 28.0418 }, // Charlotte Maxeke
];

function isPreviewHost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  if (h === "holarchealth.com" || h === "www.holarchealth.com") return false;
  return (
    h === "localhost" ||
    h.endsWith(".lovable.app") ||
    h.endsWith(".lovableproject.com") ||
    h.endsWith(".lovable.dev")
  );
}

export function AmbulanceSimulator({ incidentId }: { incidentId?: string } = {}) {
  const { providerId } = useProviderAccess();
  const { isAdmin } = useUserRole();
  const [running, setRunning] = useState(false);
  const stepRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const allowed = isPreviewHost() && isAdmin;

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  if (!allowed) return null;

  const tick = async () => {
    const pt = DEMO_ROUTE[stepRef.current % DEMO_ROUTE.length];
    stepRef.current += 1;
    try {
      const payload: any = {
        provider_id: providerId,
        provider_kind: "ambulance",
        latitude: pt.lat,
        longitude: pt.lng,
        recorded_at: new Date().toISOString(),
        simulated: true,
      };
      if (incidentId) payload.incident_id = incidentId;
      const { error } = await supabase
        .from("holarchelp_provider_locations" as any)
        .insert(payload);
      if (error) {
        // Most likely RLS — surface once then stop
        toast.error(`Simulator stopped: ${error.message}`);
        stop();
      }
    } catch (e) {
      console.warn("simulator tick failed", e);
    }
  };

  const start = () => {
    if (!providerId) {
      toast.error("Open an ambulance provider context first");
      return;
    }
    setRunning(true);
    stepRef.current = 0;
    tick();
    timerRef.current = window.setInterval(tick, 3000);
  };

  const stop = () => {
    setRunning(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-warning/60 bg-warning/5 p-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs">
        <Sparkles className="h-4 w-4 text-warning" />
        <div>
          <p className="font-semibold text-foreground">Demo simulator</p>
          <p className="text-sm text-muted-foreground">
            Walks a fake ambulance every 3s. Preview + admin only. Not visible on holarchealth.com.
          </p>
        </div>
      </div>
      {running ? (
        <Button size="sm" variant="outline" onClick={stop} className="h-7 text-xs">
          <StopCircle className="mr-1 h-3.5 w-3.5" /> Stop
        </Button>
      ) : (
        <Button size="sm" onClick={start} className="h-7 text-xs">
          <PlayCircle className="mr-1 h-3.5 w-3.5" /> Simulate ambulance
        </Button>
      )}
    </div>
  );
}
