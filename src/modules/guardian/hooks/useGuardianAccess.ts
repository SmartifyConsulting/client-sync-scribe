import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns whether the Guardian module is enabled for the current user.
 * Combines:
 *  - global app_modules.guardian.enabled (admin kill-switch)
 *  - per-user profiles.guardian_enabled (admin-toggled subscription flag)
 */
export function useGuardianAccess() {
  const { user, loading: authLoading } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setEnabled(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: mod }, { data: prof }] = await Promise.all([
        supabase.from("app_modules" as any).select("enabled").eq("module_key", "guardian").maybeSingle(),
        supabase.from("profiles").select("guardian_enabled" as any).eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const globalOn = (mod as any)?.enabled !== false;
      const userOn = !!(prof as any)?.guardian_enabled;
      setEnabled(globalOn && userOn);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { enabled, loading };
}
