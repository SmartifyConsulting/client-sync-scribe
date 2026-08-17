import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TEST_PROFILES } from "./testProfiles";

/**
 * Live names for the seeded switch-profile accounts.
 *
 * The hardcoded `name` in testProfiles.ts is only a fallback — renaming an
 * account (e.g. Dean Allie -> Dean Peterson) must show up in the switcher
 * without a code change, so we read `profiles.full_name` from the database.
 */
export function useSeededProfileNames() {
  const { data } = useQuery({
    queryKey: ["seeded-profile-names"],
    queryFn: async () => {
      const emails = TEST_PROFILES.map((p) => p.email);
      const { data, error } = await (supabase.rpc as any)("get_seeded_profile_names", { _emails: emails });
      if (error) return {} as Record<string, string>;
      const map: Record<string, string> = {};
      ((data || []) as any[]).forEach((r) => {
        if (r.email && r.full_name) map[String(r.email).toLowerCase()] = String(r.full_name);
      });
      return map;
    },
    staleTime: 60 * 1000,
  });
  return data ?? {};
}
