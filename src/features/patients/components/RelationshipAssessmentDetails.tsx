import { Quote } from "lucide-react";
import { StructuredAssessment, LOW_CONFIDENCE_NOTE } from "@/features/patients/relationship/insights";

/**
 * Clinician-facing structured result for the About Me exercise, laid out in two
 * columns with the transcript-derived evidence beneath.
 *
 * NOTE (TESTING ONLY): the `Probable pattern / Confidence / Secondary
 * possibilities` block below exposes the internal pattern numbers. It is a
 * temporary testing affordance — delete the block marked TESTING to remove it.
 */
export function RelationshipAssessmentDetails({
  assessment,
  compact = false,
}: {
  assessment: StructuredAssessment;
  compact?: boolean;
}) {
  const {
    pattern,
    secondary,
    confidence,
    evidence1,
    evidence2,
    confirm,
    insight,
    sessionEvidence,
    corroboratingSessions,
  } = assessment;

  const Line = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-xs font-bold text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{value}</p>
    </div>
  );

  // Group transcript evidence by session, newest first.
  const grouped = sessionEvidence.reduce<Record<string, typeof sessionEvidence>>((acc, e) => {
    const key = e.session_id ?? e.session_date;
    (acc[key] ||= []).push(e);
    return acc;
  }, {});

  return (
    <div className={compact ? "space-y-2.5" : "space-y-3"}>
      {/* TESTING ONLY — internal pattern numbers */}
      <div className="rounded-lg border border-dashed border-amber-400/60 bg-amber-50/60 dark:bg-amber-500/10 p-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          Testing view
        </p>
        <p className="text-xs text-foreground">Probable pattern: Type {pattern}</p>
        <p className="text-xs text-foreground">Confidence: {confidence}</p>
        {secondary.length > 0 && (
          <p className="text-xs text-foreground">
            Secondary possibilities: {secondary.map((s) => `Type ${s}`).join(" / ")}
          </p>
        )}
      </div>
      {/* END TESTING ONLY */}

      <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
        <div className="space-y-3">
          {evidence1 && <Line label="Evidence — first selection" value={`“${evidence1}”`} />}
          {insight && <Line label="What may motivate them" value={insight.motivates} />}
          {insight && <Line label="Communication" value={insight.communication} />}
          {insight && <Line label="Builds trust" value={insight.trust} />}
        </div>
        <div className="space-y-3">
          {evidence2 && <Line label="Evidence — second selection" value={`“${evidence2}”`} />}
          {insight && <Line label="Be mindful of" value={insight.mindful} />}
          {insight && <Line label="Useful approach" value={insight.approach} />}
          {confirm.length > 0 && (
            <div>
              <p className="text-xs font-bold text-foreground">Areas requiring confirmation</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {confirm.map((c) => (
                  <li key={c} className="text-sm text-muted-foreground leading-relaxed">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {sessionEvidence.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs font-bold text-foreground mb-2">Evidence from sessions</p>
          <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
            {Object.entries(grouped).map(([key, items]) => (
              <div key={key} className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {new Date(items[0].session_date).toLocaleDateString()}
                </p>
                {items.map((e) => (
                  <div key={e.id} className="flex gap-2">
                    <Quote className="h-3 w-3 mt-1 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm text-foreground leading-relaxed">“{e.quote}”</p>
                      <p className="text-xs text-muted-foreground">{e.signal_label}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground pt-1">
        Profile confidence: {confidence}
        {corroboratingSessions > 0
          ? ` · corroborated in ${corroboratingSessions} session${corroboratingSessions === 1 ? "" : "s"}`
          : ""}
        {confidence === "Emerging" ? ` · ${LOW_CONFIDENCE_NOTE}` : ""}
      </p>
    </div>
  );
}
