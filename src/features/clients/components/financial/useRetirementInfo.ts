import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inferRetired } from "./retirement";

export function useRetirementInfo(clientId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["client-retirement-info", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("dob,employer,occupation").eq("id", clientId).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 0,
  });
  useEffect(() => {
    const channel = supabase.channel(`retirement-info-${clientId}`).on("postgres_changes", {
      event: "UPDATE", schema: "public", table: "clients", filter: `id=eq.${clientId}`,
    }, () => { qc.invalidateQueries({ queryKey: ["client-retirement-info", clientId] }); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [clientId, qc]);
  return { ...query, retired: inferRetired(query.data) };
}
