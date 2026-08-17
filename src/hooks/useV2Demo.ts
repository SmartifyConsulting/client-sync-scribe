import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SYSTEM_ADMIN_EMAILS } from "@/components/layout/testProfiles";

/**
 * Version 2.0 demo gate. Features still in v2 development (Biolog, Ask Holarc,
 * the Enneagram relationship profile) are visible to everyone as a greyed-out
 * preview, but only usable by the two system admin accounts.
 */
export function useV2Demo() {
  const { data: v2Demo = false, isLoading } = useQuery({
    queryKey: ["v2-demo-flag"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return !!user?.email && SYSTEM_ADMIN_EMAILS.includes(user.email);
    },
    staleTime: 5 * 60 * 1000,
  });
  return { v2Demo, isLoading };
}
