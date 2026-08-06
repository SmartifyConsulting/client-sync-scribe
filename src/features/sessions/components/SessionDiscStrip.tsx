import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface Props {
  patientId?: string;
  /** Inline mode renders a single chip row with no card frame (used at the top of Patient Overview). */
  inline?: boolean;
}


type Dim = "dominance" | "influence" | "steadiness" | "conscientiousness";

const DIMS: {
  key: Dim;
  letter: string;
  label: string;
  chip: string;
  high: string[];
  moderate: string[];
}[] = [
  {
    key: "dominance",
    letter: "D",
    label: "Dominance",
    chip: "bg-red-500/10 text-red-700 border-red-500/30",
    high: ["decisive", "direct", "results-driven", "impatient"],
    moderate: ["assertive", "goal-focused"],
  },
  {
    key: "influence",
    letter: "I",
    label: "Influence",
    chip: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    high: ["expressive", "sociable", "optimistic", "talkative"],
    moderate: ["engaging", "open"],
  },
  {
    key: "steadiness",
    letter: "S",
    label: "Steadiness",
    chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    high: ["calm", "patient", "cooperative", "reserved"],
    moderate: ["steady", "agreeable"],
  },
  {
    key: "conscientiousness",
    letter: "C",
    label: "Conscientiousness",
    chip: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    high: ["precise", "analytical", "cautious", "detail-focused"],
    moderate: ["methodical", "questioning"],
  },
];

/**
 * Compact DISC personality reminder for the live session screen.
 * Shows scores plus adjectives only — no rationale paragraphs.
 */
export function SessionDiscStrip({ patientId }: Props) {
  const { isDoctor } = useUserRole();
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isDoctor || !patientId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("patient_disc_profiles")
        .select("*")
        .eq("patient_id", patientId)
        .maybeSingle();
      if (!cancelled) {
        setProfile(data ?? null);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, isDoctor]);

  if (!isDoctor || !patientId) return null;

  return (
    <div className="rounded-xl border border-primary bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-primary/5">
        <Brain className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-medium text-foreground">Personality (DISC)</p>
        {profile?.primary_trait && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            {profile.primary_trait}
            {profile.secondary_trait ? ` / ${profile.secondary_trait}` : ""}
          </span>
        )}
      </div>
      <div className="p-3">
        {!profile ? (
          <p className="text-xs text-muted-foreground">
            {loaded ? "No personality profile yet." : "Loading…"}
          </p>
        ) : (
          <div className="space-y-1.5">
            {DIMS.map((d) => {
              const score = Number(profile[d.key] ?? 0);
              const words = score >= 60 ? d.high : score >= 40 ? d.moderate : [];
              return (
                <div key={d.key} className="flex items-start gap-2">
                  <span
                    className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${d.chip}`}
                  >
                    {d.letter} {score}
                  </span>
                  <div className="min-w-0 flex-1 flex flex-wrap gap-1">
                    {words.length ? (
                      words.map((w) => (
                        <span
                          key={w}
                          className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground"
                        >
                          {w}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground">low</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
