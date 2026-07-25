import { useEffect, useState } from "react";
import { Brain, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useTranslation } from "react-i18next";

interface DiscProfile {
  dominance: number;
  influence: number;
  steadiness: number;
  conscientiousness: number;
  primary_trait: string | null;
  secondary_trait: string | null;
  dominance_rationale: string | null;
  influence_rationale: string | null;
  steadiness_rationale: string | null;
  conscientiousness_rationale: string | null;
  sessions_analyzed: number;
  generated_at: string;
}

interface Props {
  patientId: string;
  hasSessions: boolean;
}

const TILES = [
  { key: "dominance", letter: "D", label: "Dominance", barClass: "bg-red-500" },
  { key: "influence", letter: "I", label: "Influence", barClass: "bg-amber-500" },
  { key: "steadiness", letter: "S", label: "Steadiness", barClass: "bg-emerald-500" },
  { key: "conscientiousness", letter: "C", label: "Conscientiousness", barClass: "bg-blue-500" },
] as const;

export function DiscPersonalityCard({ patientId, hasSessions }: Props) {
  const { isDoctor, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<DiscProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!isDoctor || !patientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("patient_disc_profiles")
        .select("*")
        .eq("patient_id", patientId)
        .maybeSingle();
      if (!cancelled) {
        setProfile((data as DiscProfile) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, isDoctor]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-patient-disc", {
        body: { patient_id: patientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setProfile(data.profile as DiscProfile);
      toast({ title: "DISC profile updated" });
    } catch (e: any) {
      toast({
        title: "Couldn't build DISC profile",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (roleLoading || !isDoctor) return null;

  return (
    <div className="rounded-xl border border-primary/40 bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h4 className="font-medium text-foreground">DISC Personality Profile</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={generate}
          disabled={generating || !hasSessions}
          className="h-7 gap-1.5"
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="text-sm">{profile ? "Refresh" : "Generate"}</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading profileâ€¦
        </div>
      ) : !profile ? (
        <p className="text-sm text-muted-foreground italic">
          {hasSessions
            ? "No DISC profile yet â€” click Generate to build one from this patient's sessions."
            : "DISC profile will generate after the patient's first completed consultation."}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-3">
            Primary:{" "}
            <span className="font-medium text-foreground">{profile.primary_trait}</span>
            {profile.secondary_trait ? (
              <>
                {" Â· "}Secondary:{" "}
                <span className="font-medium text-foreground">{profile.secondary_trait}</span>
              </>
            ) : null}
          </p>

          <div className="grid gap-4 grid-cols-2">
            {TILES.map((tile) => {
              const score = (profile as any)[tile.key] as number;
              const rationale = (profile as any)[`${tile.key}_rationale`] as string | null;
              return (
                <div
                  key={tile.key}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-semibold text-foreground">
                      {tile.letter} â€” {tile.label}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground tabular-nums">
                      {score}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
                    <div
                      className={`h-full ${tile.barClass}`}
                      style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                    />
                  </div>
                  {rationale ? (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {rationale}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Based on {profile.sessions_analyzed} session
            {profile.sessions_analyzed === 1 ? "" : "s"} Â· updated{" "}
            {new Date(profile.generated_at).toLocaleDateString()}
          </p>
        </>
      )}
    </div>
  );
}

