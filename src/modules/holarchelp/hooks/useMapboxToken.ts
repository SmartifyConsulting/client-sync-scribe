import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Fetches the Mapbox public access token (cached for the session). */
export function useMapboxToken() {
  return useQuery({
    queryKey: ["mapbox-token"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("mapbox-config");
      if (error) throw error;
      return (data as any)?.token as string | undefined;
    },
  });
}
