import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RelationshipAssessmentDetails } from "./RelationshipAssessmentDetails";
import {
  Choice,
  ENGINE_VERSION,
  NONE_LABEL,
  QUESTION_SETS,
  buildAssessment,

  derive,
} from "@/features/patients/relationship/insights";

interface Row {
  id: string;
  responses: Record<string, Choice>;
  status: string;
  pattern: number | null;
  confidence: string | null;
  version: string;
  completed_at: string | null;
}

const INTRO =
  "There are no right or wrong answers. These questions simply help us understand how you tend to approach things and how we can communicate with you in a way that feels natural.";
const INTRO_2 = "Don't overthink your answers. Choose the description that feels most like you.";
const PRIVACY =
  "Your responses are used to help your care team understand how best to communicate with you. They are not a medical or psychological diagnosis.";

/**
 * "Help us understand you" — a short, warm two-part exercise inside About Me.
 * The patient never sees any derived result: only a thank-you.
 */
export function RelationshipProfileExercise({ patientId }: { patientId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [row, setRow] = useState<Row | null>(null);
  const [answers, setAnswers] = useState<Partial<Record<string, Choice>>>({});
  const [editing, setEditing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const { evidence } = useRelationshipEvidence(patientId);


  const load = async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      const { data: pat } = await supabase
        .from("patients")
        .select("patient_user_id")
        .eq("id", patientId)
        .maybeSingle();
      setIsOwner(!!uid && (pat as any)?.patient_user_id === uid);

      const { data } = await supabase
        .from("patient_relationship_profiles" as any)
        .select("*")
        .eq("patient_id", patientId)
        .maybeSingle();
      const r = (data as any) ?? null;
      setRow(r);
      setAnswers(r?.responses ?? {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const persist = async (next: Partial<Record<string, Choice>>) => {
    setSaving(true);
    try {
      const d = derive(next);
      const payload = {
        patient_id: patientId,
        responses: next,
        status: d.status,
        pattern: d.pattern,
        confidence: d.confidence,
        version: ENGINE_VERSION,
        completed_at:
          d.status === "completed" || d.status === "insufficient_information"
            ? new Date().toISOString()
            : null,
      };

      if (row) {
        // Preserve the previous completed result before overwriting it.
        if (row.status === "completed" || row.status === "insufficient_information") {
          await supabase.from("patient_relationship_profile_history" as any).insert({
            patient_id: patientId,
            responses: row.responses,
            status: row.status,
            pattern: row.pattern,
            confidence: row.confidence,
            version: row.version,
            completed_at: row.completed_at,
          });
        }
        const { data, error } = await supabase
          .from("patient_relationship_profiles" as any)
          .update(payload)
          .eq("id", row.id)
          .select()
          .maybeSingle();
        if (error) throw error;
        setRow((data as any) ?? null);
      } else {
        const { data, error } = await supabase
          .from("patient_relationship_profiles" as any)
          .insert(payload)
          .select()
          .maybeSingle();
        if (error) throw error;
        setRow((data as any) ?? null);
      }

      if (d.status === "completed" || d.status === "insufficient_information") {
        setEditing(false);
        setJustFinished(true);
      }
    } catch (e: any) {
      toast({
        title: "Couldn't save your answer",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const choose = (setId: string, key: Choice) => {
    const next = { ...answers, [setId]: key };
    setAnswers(next);
    persist(next);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const completed = row?.status === "completed" || row?.status === "insufficient_information";

  // ---- Clinician view: status + structured summary, no exercise ----
  if (!isOwner) {
    const assessment = buildAssessment(
      row?.pattern ?? null,
      (row?.confidence as any) ?? null,
      row?.responses,
      evidence,
    );

    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <p className="text-xs font-bold text-foreground">Help us understand you</p>
        <p className="text-xs text-muted-foreground">
          {completed
            ? row?.status === "insufficient_information"
              ? "Completed — the patient felt none of the descriptions fitted."
              : `Completed${row?.completed_at ? ` on ${new Date(row.completed_at).toLocaleDateString()}` : ""}.`
            : row?.status === "incomplete"
            ? "Started but not yet finished."
            : "Not started yet — the patient can complete this from their own profile."}
        </p>
        {assessment && <RelationshipAssessmentDetails assessment={assessment} compact />}
      </div>
    );
  }


  // ---- Patient view ----
  if (completed && !editing) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Your responses</p>
        </div>
        {justFinished && (
          <p className="text-sm text-foreground">
            That's all we need. This helps your care team understand how best to work with you.
          </p>
        )}
        <p className="text-xs text-muted-foreground">You've completed this short exercise.</p>

        {reviewing && (
          <div className="space-y-2 pt-1">
            {QUESTION_SETS.map((qs, idx) => {
              const key = answers[qs.id];
              const label =
                key === "none"
                  ? NONE_LABEL
                  : qs.options.find((o) => o.key === key)?.title ?? "—";
              return (
                <div key={qs.id} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{qs.heading}</p>
                  <p className="text-sm text-foreground mt-0.5">{label}</p>
                  {idx === 0 ? null : null}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setReviewing((v) => !v)}>
            {reviewing ? "Hide responses" : "Review responses"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setAnswers({});
              setJustFinished(false);
              setReviewing(false);
              setEditing(true);
            }}
          >
            Retake
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{PRIVACY}</p>
      </div>
    );
  }

  const showSecond = !!answers.question_set_1;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-5">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Help us understand you</h4>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{INTRO}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{INTRO_2}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">{PRIVACY}</p>
      </div>

      {QUESTION_SETS.map((qs, idx) => {
        if (idx === 1 && !showSecond) return null;
        const selected = answers[qs.id];
        return (
          <div key={qs.id} className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{qs.heading}</p>
              <p className="text-xs text-muted-foreground">{qs.subheading}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {qs.options.map((opt) => {
                const active = selected === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={saving}
                    onClick={() => choose(qs.id, opt.key)}
                    className={`text-left rounded-xl border p-4 transition-colors ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground leading-snug">{opt.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-2">{opt.body}</p>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => choose(qs.id, "none")}
              className={`text-xs underline-offset-2 hover:underline ${
                selected === "none" ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              {NONE_LABEL}
            </button>
          </div>
        );
      })}

      {saving && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
        </p>
      )}
    </div>
  );
}
