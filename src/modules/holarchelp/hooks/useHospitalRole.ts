import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type HospitalRole = "hospital_admin" | "coordinator" | "doctor" | "nurse" | "owner" | null;

export interface HospitalCapabilities {
  manage: boolean;   // hospital_admin only — settings, members
  dispatch: boolean; // hospital_admin or coordinator — accept incoming, capacity edits
  clinical: boolean; // doctor / nurse / admin / coordinator — view patient context
}

export function useHospitalRole(hospitalId: string | null | undefined) {
  const { user } = useAuth();
  const [role, setRole] = useState<HospitalRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!hospitalId || !user) {
      setRole(null); setLoading(false); return;
    }
    setLoading(true);
    (async () => {
      const [{ data: owner }, { data: mem }] = await Promise.all([
        supabase.from("holarchelp_hospitals" as any).select("id").eq("id", hospitalId).eq("owner_id", user.id).maybeSingle(),
        supabase.from("holarchelp_hospital_members" as any).select("role").eq("hospital_id", hospitalId).eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      if (owner) setRole("owner");
      else setRole(((mem as any)?.role ?? null) as HospitalRole);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [hospitalId, user?.id]);

  const isAdmin = role === "owner" || role === "hospital_admin";
  const can: HospitalCapabilities = {
    manage: isAdmin,
    dispatch: isAdmin || role === "coordinator",
    clinical: isAdmin || role === "coordinator" || role === "doctor" || role === "nurse",
  };

  return { role, can, loading };
}

export const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  hospital_admin: "Hospital Admin",
  coordinator: "Coordinator",
  doctor: "Doctor",
  nurse: "Nurse",
};

export const ROLE_TONE: Record<string, string> = {
  owner: "bg-primary/15 text-primary border-primary/40",
  hospital_admin: "bg-primary/15 text-primary border-primary/40",
  coordinator: "bg-warning/15 text-warning border-warning/40",
  doctor: "bg-blue-500/15 text-blue-600 border-blue-500/40",
  nurse: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40",
};
