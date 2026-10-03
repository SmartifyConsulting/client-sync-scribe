import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Suppliers = { short_term: string[]; life: string[]; investments: string[]; health: string[] };
export type PracticeInfo = Record<string, any> & {
  user_id: string;
  fsca_categories: string[];
  product_suppliers: Suppliers;
  top_suppliers: { name: string; percent: number | null }[];
};

export function usePracticeInfo(userId?: string | null) {
  return useQuery({
    queryKey: ["wealth-practice-info", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("wealth_practice_info").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as PracticeInfo | null;
    },
  });
}

export function useSavePracticeInfo(userId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<PracticeInfo>) => {
      const { error } = await (supabase as any).from("wealth_practice_info").upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wealth-practice-info", userId] }),
  });
}
