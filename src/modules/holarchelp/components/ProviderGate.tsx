import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export type ProviderType = "hospital" | "ambulance" | null;

export function useProviderAccess() {
  const { user, loading: authLoading } = useAuth();
  const [providerType, setProviderType] = useState<ProviderType>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProviderType(null);
      setProviderId(null);
      setLoading(false);
      return;
    }
    (async () => {
      const [{ data: hosp }, { data: amb }, { data: hospMem }, { data: ambMem }, { data: roles }, { data: nurseRow }] = await Promise.all([
        supabase.from("holarchelp_hospitals" as any).select("id").eq("owner_id", user.id).maybeSingle(),
        supabase.from("holarchelp_ambulance_providers" as any).select("id").eq("owner_id", user.id).maybeSingle(),
        supabase.from("holarchelp_hospital_members" as any).select("hospital_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("holarchelp_ambulance_members" as any).select("provider_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        // Rostered nurses reach the hospital module through their nurse record.
        supabase.from("hospital_nurses" as any).select("hospital_id").eq("linked_user_id", user.id).limit(1).maybeSingle(),
      ]);

      const hospId = (hosp as any)?.id ?? (hospMem as any)?.hospital_id ?? (nurseRow as any)?.hospital_id ?? null;
      const ambId = (amb as any)?.id ?? (ambMem as any)?.provider_id ?? null;
      const roleSet = new Set(((roles as any[]) ?? []).map((r) => r.role as string));
      const isHospitalRole = roleSet.has("hospital_staff");
      const isAmbulanceRole = roleSet.has("ambulance_staff");

      // Prefer the side the user is explicitly roled for when they happen to
      // be linked to both kinds of providers.
      let pickHospital = false;
      let pickAmbulance = false;
      if (hospId && ambId) {
        if (isHospitalRole && !isAmbulanceRole) pickHospital = true;
        else if (isAmbulanceRole && !isHospitalRole) pickAmbulance = true;
        else pickHospital = true; // tie-break: hospital first (matches prior owner-first order)
      } else if (hospId) {
        pickHospital = true;
      } else if (ambId) {
        pickAmbulance = true;
      }

      if (pickHospital && hospId) {
        setProviderType("hospital");
        setProviderId(hospId);
      } else if (pickAmbulance && ambId) {
        setProviderType("ambulance");
        setProviderId(ambId);
      }
      setLoading(false);
    })();
  }, [user, authLoading]);

  return { providerType, providerId, loading, userId: user?.id ?? null };
}

export function ProviderGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { providerType, loading } = useProviderAccess();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!providerType) {
    return (
      <div className="mx-auto max-w-md px-5 pt-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold">{t("providerGate.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("providerGate.description")}
        </p>
        <div className="mt-6 rounded-2xl border bg-card p-4 text-left text-sm">
          <p className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" /> {t("providerGate.notProvider")}</p>
          <p className="mt-1 text-muted-foreground">
            {t("providerGate.notProviderBody")}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => navigate("/provider-signup")}>{t("providerGate.completeSignup")}</Button>
          <Button variant="outline" onClick={() => navigate("/")}>{t("providerGate.goHome")}</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
