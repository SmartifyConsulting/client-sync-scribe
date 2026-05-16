import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Fetches the Google Maps browser API key (cached for the session). */
export function useGoogleMapsKey() {
  return useQuery({
    queryKey: ["google-maps-key"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("maps-config");
      if (error) throw error;
      return (data as any)?.apiKey as string | undefined;
    },
  });
}
