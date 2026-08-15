import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Version 2.0 demo gate. Features still in v2 development (Biolog, Ask Angel,
 * the Enneagram relationship profile) are only visible to accounts whose
 * profile has `v2_demo` switched on by an admin.
 */
export function useV2Demo() {
  const { data: v2Demo = false, isLoading } = useQuery({
    queryKey: ["v2-demo-flag"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase
        .from("profiles")
        .select("v2_demo")
        .eq("id", user.id)
        .maybeSingle();
      return !!(data as any)?.v2_demo;
    },
    staleTime: 5 * 60 * 1000,
  });
  return { v2Demo, isLoading };
}
