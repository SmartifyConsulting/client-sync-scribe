import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PracticePerson {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

/**
 * Practice Management Assistant (PMA) context.
 *
 * A PMA is a `practice_members` row with role = 'assistant'. They keep their
 * own patient profile — this hook only exposes the extra practice-admin
 * capability so the sidebar and task tools can adapt.
 */
export function usePracticeAssistant() {
  const { user } = useAuth();
  const [isAssistant, setIsAssistant] = useState(false);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  /** Everyone in my practice except me. */
  const [colleagues, setColleagues] = useState<PracticePerson[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setIsAssistant(false);
      setPracticeId(null);
      setColleagues([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: mine } = await supabase
        .from("practice_members")
        .select("practice_id, role")
        .eq("doctor_id", user.id)
        .limit(1);

      const row = mine?.[0];
      if (!row) {
        setIsAssistant(false);
        setPracticeId(null);
        setColleagues([]);
        return;
      }

      setPracticeId(row.practice_id);
      setIsAssistant(row.role === "assistant");

      const { data: all } = await supabase
        .from("practice_members")
        .select("doctor_id, role")
        .eq("practice_id", row.practice_id);

      const others = (all || []).filter((m: any) => m.doctor_id !== user.id);
      if (!others.length) {
        setColleagues([]);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", others.map((m: any) => m.doctor_id));
      const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      setColleagues(
        others.map((m: any) => ({
          user_id: m.doctor_id,
          full_name: pMap.get(m.doctor_id)?.full_name ?? null,
          avatar_url: pMap.get(m.doctor_id)?.avatar_url ?? null,
          role: m.role,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    isAssistant,
    practiceId,
    colleagues,
    doctors: colleagues.filter((c) => c.role !== "assistant"),
    assistants: colleagues.filter((c) => c.role === "assistant"),
    loading,
    refresh: load,
  };
}
