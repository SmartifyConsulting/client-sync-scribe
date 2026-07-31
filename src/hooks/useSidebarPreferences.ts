import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const db = supabase as any;

export interface SidebarPreferences {
  item_order: string[];
  hidden_items: string[];
}

/** Per-user, persisted sidebar customisation — section order and hidden nav items. */
export function useSidebarPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["sidebar-preferences", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await db
        .from("sidebar_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as SidebarPreferences | null) ?? { item_order: [], hidden_items: [] };
    },
  });

  const save = useMutation({
    mutationFn: async (prefs: SidebarPreferences) => {
      if (!user?.id) return;
      const { error } = await db
        .from("sidebar_preferences")
        .upsert({ user_id: user.id, ...prefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onMutate: async (prefs: SidebarPreferences) => {
      qc.setQueryData(["sidebar-preferences", user?.id], prefs);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sidebar-preferences", user?.id] }),
  });

  return {
    preferences: query.data ?? { item_order: [], hidden_items: [] },
    isLoading: query.isLoading,
    savePreferences: save.mutate,
  };
}
