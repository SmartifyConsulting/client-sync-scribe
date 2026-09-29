import { useEffect, useState } from "react";
import { Handshake, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RelationshipAssessmentDetails } from "./RelationshipAssessmentDetails";
import { useRelationshipEvidence } from "@/features/patients/relationship/useRelationshipEvidence";
import {
  ETHICAL_TOOLTIP,
  buildAssessment,
} from "@/features/patients/relationship/insights";



/**
 * "How to work with this patient" — a compact rapport aid shown to clinicians
 * alongside the DISC card. Never displays the underlying pattern, type or score.
 */
export function RelationshipInsightCard({ patientId }: { patientId: string }) {
  const { isDoctor, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<any | null>(null);
  const { evidence } = useRelationshipEvidence(isDoctor ? patientId : null);


  useEffect(() => {
    if (!isDoctor || !patientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("patient_relationship_profiles" as any)
        .select("*")
        .eq("patient_id", patientId)
        .maybeSingle();
      if (!cancelled) {
        setRow((data as any) ?? null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId, isDoctor]);

  if (roleLoading || !isDoctor) return null;

  const assessment = buildAssessment(row?.pattern ?? null, row?.confidence ?? null, row?.responses, evidence);

  return (
    <div className="rounded-xl border border-primary/40 bg-card p-5 h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Handshake className="h-4 w-4 text-primary" />
          <h4 className="font-medium text-foreground">How to work with this client</h4>
          {/* TESTING ONLY — internal pattern number */}
          {assessment && (
            <span className="rounded-full border border-amber-400/60 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
              Type {assessment.pattern}
            </span>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="About this insight" className="text-muted-foreground hover:text-foreground">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs leading-relaxed">
              {ETHICAL_TOOLTIP}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : !assessment ? (
        <p className="text-sm text-muted-foreground italic">
          {row?.status === "insufficient_information"
            ? "The patient felt none of the descriptions fitted. Consider exploring communication preferences directly."
            : row?.status === "incomplete"
            ? "The patient has started the short About Me exercise but not yet finished it."
            : "Available once the patient completes the short About Me exercise on their profile."}
        </p>
      ) : (
        <RelationshipAssessmentDetails assessment={assessment} />
      )}
    </div>
  );
}
