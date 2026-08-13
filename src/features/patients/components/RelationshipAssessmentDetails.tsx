import { StructuredAssessment, LOW_CONFIDENCE_NOTE } from "@/features/patients/relationship/insights";

/**
 * Clinician-facing structured result for the About Me exercise.
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
  const { pattern, secondary, confidence, evidence1, evidence2, confirm, insight } = assessment;

  const Line = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-xs font-bold text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{value}</p>
    </div>
  );

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

      {evidence1 && <Line label="Evidence — first selection" value={`“${evidence1}”`} />}
      {evidence2 && <Line label="Evidence — second selection" value={`“${evidence2}”`} />}

      {insight && (
        <>
          <Line label="What may motivate them" value={insight.motivates} />
          <Line label="Communication" value={insight.communication} />
          <Line label="Builds trust" value={insight.trust} />
          <Line label="Be mindful of" value={insight.mindful} />
          <Line label="Useful approach" value={insight.approach} />
        </>
      )}

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

      <p className="text-xs text-muted-foreground pt-1">
        Profile confidence: {confidence}
        {confidence === "Emerging" ? ` · ${LOW_CONFIDENCE_NOTE}` : ""}
      </p>
    </div>
  );
}
