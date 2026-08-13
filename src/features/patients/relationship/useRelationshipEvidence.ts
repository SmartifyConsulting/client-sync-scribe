import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SessionEvidence } from "./insights";

/** Loads rapport evidence quoted from the patient's session transcripts. */
export function useRelationshipEvidence(patientId?: string | null) {
  const [evidence, setEvidence] = useState<SessionEvidence[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setEvidence([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("patient_relationship_evidence" as any)
        .select("id, quote, signal_label, supports_pattern, session_id, session_date")
        .eq("patient_id", patientId)
        .order("session_date", { ascending: false })
        .limit(60);
      if (!cancelled) {
        setEvidence(((data as any[]) ?? []) as SessionEvidence[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  return { evidence, loading };
}
