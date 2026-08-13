import { useEffect, useState } from "react";
import { Handshake, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ETHICAL_TOOLTIP,
  LOW_CONFIDENCE_NOTE,
  toOverviewInsight,
} from "@/features/patients/relationship/insights";

/**
 * "How to work with this patient" — a compact rapport aid shown to clinicians
 * alongside the DISC card. Never displays the underlying pattern, type or score.
 */
export function RelationshipInsightCard({ patientId }: { patientId: string }) {
  const { isDoctor, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<any | null>(null);

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

  const insight = row?.pattern ? toOverviewInsight(row.pattern) : null;
  const confidence = row?.confidence as string | null;

  const Line = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-xs font-bold text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{value}</p>
    </div>
  );

  return (
    <div className="rounded-xl border border-primary/40 bg-card p-5 h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Handshake className="h-4 w-4 text-primary" />
          <h4 className="font-medium text-foreground">How to work with this patient</h4>
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
      ) : !insight ? (
        <p className="text-sm text-muted-foreground italic">
          {row?.status === "insufficient_information"
            ? "The patient felt none of the descriptions fitted. Consider exploring communication preferences directly."
            : row?.status === "incomplete"
            ? "The patient has started the short About Me exercise but not yet finished it."
            : "Available once the patient completes the short About Me exercise on their profile."}
        </p>
      ) : (
        <div className="space-y-3">
          <Line label="What may motivate them" value={insight.motivates} />
          <Line label="Communication" value={insight.communication} />
          <Line label="Builds trust" value={insight.trust} />
          <Line label="Be mindful of" value={insight.mindful} />
          <Line label="Useful approach" value={insight.approach} />
          {confidence && (
            <p className="text-xs text-muted-foreground pt-1">
              Profile confidence: {confidence}
              {confidence === "Emerging" ? ` · ${LOW_CONFIDENCE_NOTE}` : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
