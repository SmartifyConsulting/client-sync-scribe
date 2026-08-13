import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmotionalJournal } from "@/features/patients/components/overview/EmotionalJournal";

/**
 * Emotional State inside Biolog. Resolves the patient record for the Biolog
 * owner and renders the very same journal used on the patient profile, so an
 * entry captured in either place is one and the same record.
 */
export function BiologEmotionalState({ ownerUserId }: { ownerUserId?: string }) {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let uid = ownerUserId;
      if (!uid) {
        const { data: auth } = await supabase.auth.getUser();
        uid = auth?.user?.id;
      }
      if (!uid) {
        if (!cancelled) { setPatientId(null); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from("patients")
        .select("id")
        .eq("patient_user_id", uid)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setPatientId((data as any)?.id ?? null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ownerUserId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!patientId) {
    return (
      <p className="text-sm text-muted-foreground italic py-6">
        No patient record linked yet, so emotional state entries can't be saved here.
      </p>
    );
  }

  return <EmotionalJournal patientId={patientId} />;
}
