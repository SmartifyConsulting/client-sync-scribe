import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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
      const [{ data: hosp }, { data: amb }, { data: hospMem }, { data: ambMem }] = await Promise.all([
        supabase.from("holarchelp_hospitals" as any).select("id").eq("owner_id", user.id).maybeSingle(),
        supabase.from("holarchelp_ambulance_providers" as any).select("id").eq("owner_id", user.id).maybeSingle(),
        supabase.from("holarchelp_hospital_members" as any).select("hospital_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("holarchelp_ambulance_members" as any).select("provider_id").eq("user_id", user.id).maybeSingle(),
      ]);
      if ((hosp as any)?.id) {
        setProviderType("hospital");
        setProviderId((hosp as any).id);
      } else if ((amb as any)?.id) {
        setProviderType("ambulance");
        setProviderId((amb as any).id);
      } else if ((hospMem as any)?.hospital_id) {
        setProviderType("hospital");
        setProviderId((hospMem as any).hospital_id);
      } else if ((ambMem as any)?.provider_id) {
        setProviderType("ambulance");
        setProviderId((ambMem as any).provider_id);
      }
      setLoading(false);
    })();
  }, [user, authLoading]);

  return { providerType, providerId, loading };
}

export function ProviderGate({ children }: { children: React.ReactNode }) {
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
        <h1 className="mt-4 text-2xl font-extrabold">HolarcHelp Provider Portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This portal is for approved hospitals and ER providers in the HolarcHelp network.
        </p>
        <div className="mt-6 rounded-2xl border bg-card p-4 text-left text-sm">
          <p className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" /> Not a provider yet</p>
          <p className="mt-1 text-muted-foreground">
            Your account isn't linked to a hospital or ambulance service. If you started signing up
            but didn't finish, complete your application below — an administrator will activate your
            organisation before you can access the dispatch portal.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => navigate("/provider-signup")}>Complete provider sign-up</Button>
          <Button variant="outline" onClick={() => navigate("/")}>Go home</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
