import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Shift = {
  id: string;
  user_id: string;
  provider_id: string;
  ambulance_id: string;
  status: "available" | "busy" | "off_shift";
  current_incident_id: string | null;
  started_at: string;
  ended_at: string | null;
};

export function useParamedicShift() {
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async (uid?: string) => {
    const u = uid ?? userId;
    if (!u) return;
    const { data } = await supabase
      .from("paramedic_shifts" as any)
      .select("*")
      .eq("user_id", u)
      .is("ended_at", null)
      .maybeSingle();
    setShift((data as any) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) load(uid);
      else setLoading(false);
    });
    return () => { mounted = false; };
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`shift-${userId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "paramedic_shifts", filter: `user_id=eq.${userId}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, load]);

  const startShift = useCallback(async (ambulance_id: string) => {
    const { error } = await supabase.rpc("holarchelp_start_shift" as any, { _ambulance_id: ambulance_id });
    if (error) throw error;
    await load();
  }, [load]);

  const endShift = useCallback(async () => {
    const { error } = await supabase.rpc("holarchelp_end_shift" as any);
    if (error) throw error;
    await load();
  }, [load]);

  return { shift, loading, startShift, endShift, refresh: () => load() };
}
