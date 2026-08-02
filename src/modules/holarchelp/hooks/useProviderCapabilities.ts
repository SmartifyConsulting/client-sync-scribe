import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../components/ProviderGate";

export interface ProviderCapabilities {
  /** Hospital operates an emergency department. */
  hasEmergencyDepartment: boolean;
  /** Hospital accepts patients brought in by ambulances. */
  acceptsAmbulanceTransfers: boolean;
  /** Hospital runs its own ambulance fleet (gains Ambulance Services). */
  operatesOwnAmbulanceFleet: boolean;
}

export const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  hasEmergencyDepartment: true,
  acceptsAmbulanceTransfers: true,
  operatesOwnAmbulanceFleet: false,
};

const cache = new Map<string, ProviderCapabilities>();

/**
 * Capability flags for the current provider organisation. Navigation,
 * route access and feature visibility are all derived from these — never
 * from hard-coded provider type checks.
 */
export function useProviderCapabilities() {
  const { providerType, providerId, loading: accessLoading } = useProviderAccess();
  const cached = providerId ? cache.get(providerId) : undefined;
  const [capabilities, setCapabilities] = useState<ProviderCapabilities>(cached ?? DEFAULT_CAPABILITIES);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    if (accessLoading) return;
    if (!providerId || providerType !== "hospital") {
      setCapabilities(DEFAULT_CAPABILITIES);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("holarchelp_hospitals" as any)
        .select("has_emergency_department, accepts_ambulance_transfers, operates_own_ambulance_fleet")
        .eq("id", providerId)
        .maybeSingle();
      if (cancelled) return;
      const row = data as any;
      const caps: ProviderCapabilities = {
        hasEmergencyDepartment: row?.has_emergency_department ?? true,
        acceptsAmbulanceTransfers: row?.accepts_ambulance_transfers ?? true,
        operatesOwnAmbulanceFleet: row?.operates_own_ambulance_fleet ?? false,
      };
      cache.set(providerId, caps);
      setCapabilities(caps);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [providerId, providerType, accessLoading]);

  return { capabilities, loading: loading || accessLoading, providerType, providerId };
}

/** Clear the cache after a settings save so the sidebar updates immediately. */
export function invalidateProviderCapabilities(providerId?: string | null) {
  if (providerId) cache.delete(providerId);
  else cache.clear();
}
