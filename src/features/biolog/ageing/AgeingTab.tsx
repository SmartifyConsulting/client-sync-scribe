import { useMemo, useState, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Plus, Dna, Activity, FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useBiologEntries } from "../useBiolog";
import { useAgeingAssessments, useAgeingConfig, useOwnerDob, signedReportUrl } from "./useAgeing";
import { AddAssessmentDialog } from "./AddAssessmentDialog";
import { AgeingTrajectoryChart } from "./AgeingTrajectoryChart";
import { AgeingStory } from "./AgeingStory";
import { computeAlongsideChanges } from "./alongsideChanges";
import {
  ageDifferenceCaption,
  assessmentQuality,
  chronologicalAge,
  daysBetween,
  latestAssessment,
  paceBand,
  paceLabel,
  previousAssessment,
  sinceLastAssessment,
  sortByDateDesc,
  trajectoryLabel,
  trajectoryState,
} from "./ageingMath";
import { AGEING_MARKER_FIELDS, DEFAULT_AGEING_CONFIG } from "./types";

const TIPS = {
  chronological: "Your age in calendar years, worked out from your date of birth.",
  biological: "An estimate of how old your body appears biologically, taken from your most recent assessment report.",
  pace: "How quickly you are ageing right now, compared with the reference pace used by the testing provider.",
};

function LabelWithTip({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground">
      {label}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">{tip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}

const qualityTone: Record<string, string> = {
  high: "bg-primary/10 text-primary",
  moderate: "bg-amber-100 text-amber-800",
  limited: "bg-muted text-muted-foreground",
};

export function AgeingTab({ ownerUserId, readOnly = false }: { ownerUserId?: string; readOnly?: boolean }) {
  const { assessments, isOwn, addAssessment } = useAgeingAssessments(ownerUserId);
  const { data: config } = useAgeingConfig();
  const { data: dob } = useOwnerDob(ownerUserId);
  const { data: entries } = useBiologEntries(ownerUserId, 400);
  const [dialogOpen, setDialogOpen] = useState(false);

  const cfg = config || DEFAULT_AGEING_CONFIG;
  const canEdit = isOwn && !readOnly;

  const latest = latestAssessment(assessments);
  const prior = previousAssessment(assessments);
  const since = sinceLastAssessment(assessments);
  const chrono = chronologicalAge(dob);
  const band = paceBand(latest?.ageing_pace ?? null, cfg);
  const state = trajectoryState(assessments, cfg);

  const alongside = useMemo(() => {
    if (!latest || !prior) return { positive: [], watch: [], hasEnoughData: false };
    return computeAlongsideChanges(
      entries || [],
      prior.assessment_date,
      latest.assessment_date,
      cfg.min_daily_entries_for_insights,
    );
  }, [entries, latest, prior, cfg.min_daily_entries_for_insights]);

  const openReport = async (path: string) => {
    const url = await signedReportUrl(path);
    if (url) window.open(url, "_blank", "noopener");
  };

  const addButton = canEdit ? (
    <Button size="sm" className="h-8 text-xs" onClick={() => setDialogOpen(true)}>
      <Plus className="h-3.5 w-3.5" /> Add biological-age assessment
    </Button>
  ) : null;

  return (
    <div className="space-y-4">
      {/* 1 — Trajectory header */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Your Ageing Trajectory</p>
          {addButton}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <LabelWithTip label="Chronological age" tip={TIPS.chronological} />
            <p className="text-xl font-semibold text-foreground">
              {chrono !== null ? `${chrono} yrs` : <span className="text-sm text-muted-foreground">Not yet available</span>}
            </p>
          </div>
          <div className="space-y-1">
            <LabelWithTip label="Biological age" tip={TIPS.biological} />
            <p className="text-xl font-semibold text-foreground">
              {latest?.biological_age != null ? (
                `${Number(latest.biological_age).toFixed(1)} yrs`
              ) : (
                <span className="text-sm text-muted-foreground">Not yet available</span>
              )}
            </p>
          </div>
          <div className="space-y-1">
            <LabelWithTip label="Ageing pace" tip={TIPS.pace} />
            <p className="text-xl font-semibold text-foreground">
              {latest?.ageing_pace != null ? (
                Number(latest.ageing_pace).toFixed(2)
              ) : (
                <span className="text-sm text-muted-foreground">Not yet available</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 2 & 3 — Biological age and pace cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-bold text-foreground">Biological Age</p>
          <p className="mt-1 text-4xl font-semibold text-primary">
            {latest?.biological_age != null ? Number(latest.biological_age).toFixed(1) : "—"}
          </p>
          <p className="mt-1 text-sm text-foreground">
            {ageDifferenceCaption(
              latest?.biological_age != null && chrono !== null
                ? Number(latest.biological_age) - chrono
                : latest?.age_difference != null
                  ? Number(latest.age_difference)
                  : null,
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Based on your most recent biological-age assessment.</p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-bold text-foreground">Ageing Pace</p>
          <p className="mt-1 text-4xl font-semibold text-primary">
            {latest?.ageing_pace != null ? Number(latest.ageing_pace).toFixed(2) : "—"}
          </p>
          <p className="mt-1 text-sm text-foreground">{paceLabel(band)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Interpreted against the reference bands configured for Holarc Health.
          </p>
        </div>
      </div>

      {/* 4 — Since your last assessment */}
      <div className="rounded-lg border bg-card p-4">
        <p className="mb-2 text-sm font-semibold text-foreground">Since your last assessment</p>
        {!since ? (
          <p className="text-xs text-muted-foreground">
            {assessments.length === 1
              ? "Your trajectory is just beginning — a second assessment will show how things are moving."
              : "Not yet available."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs font-bold text-foreground">Biological age change</p>
              <p>{since.biologicalAgeChange !== null ? `${since.biologicalAgeChange > 0 ? "+" : ""}${since.biologicalAgeChange.toFixed(1)} yrs` : "—"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Pace change</p>
              <p>{since.paceChange !== null ? `${since.paceChange > 0 ? "+" : ""}${since.paceChange.toFixed(2)}` : "—"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Interval</p>
              <p>{since.intervalDays !== null ? `${since.intervalDays} days` : "—"}</p>
            </div>
          </div>
        )}
      </div>

      {/* 5 — Chart */}
      <AgeingTrajectoryChart assessments={assessments} />

      {/* 6 — Alongside changes */}
      <div className="rounded-lg border bg-card p-4">
        <p className="mb-2 text-sm font-semibold text-foreground">
          What&apos;s changing alongside your ageing trajectory?
        </p>
        {!alongside.hasEnoughData ? (
          <p className="text-xs text-muted-foreground">
            More data will strengthen your insights — keep logging daily and add another assessment.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold text-foreground">Potentially positive patterns</p>
              <ul className="mt-1 space-y-1">
                {alongside.positive.length === 0 && <li className="text-xs text-muted-foreground">None identified.</li>}
                {alongside.positive.map((c) => (
                  <li key={c.label} className="text-xs text-foreground">
                    <span className="font-semibold">{c.label}</span> — {c.detail}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Areas to watch</p>
              <ul className="mt-1 space-y-1">
                {alongside.watch.length === 0 && <li className="text-xs text-muted-foreground">None identified.</li>}
                {alongside.watch.map((c) => (
                  <li key={c.label} className="text-xs text-foreground">
                    <span className="font-semibold">{c.label}</span> — {c.detail}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 7 — AI story */}
      <AgeingStory assessments={assessments} entries={entries || []} readOnly={!canEdit} />

      {/* 8 — DNA methylation */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">
              <Dna className="mr-1 inline h-4 w-4 text-primary" /> DNA Methylation
            </p>
            <p className="text-xs text-muted-foreground">A molecular view of ageing</p>
          </div>
          {addButton}
        </div>
        <p className="mt-2 text-xs text-foreground">
          DNA methylation testing reads chemical marks on your DNA that change gradually through life. Laboratories use
          validated models to translate those marks into a biological-age estimate and, in some tests, a pace of ageing.
          Holarc Health stores the result exactly as your provider reported it.
        </p>

        {assessments.filter((a) => a.assessment_type === "dna_methylation").length === 0 ? (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">Not measured yet.</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {sortByDateDesc(assessments.filter((a) => a.assessment_type === "dna_methylation")).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs">
                <span className="font-semibold text-foreground">{a.assessment_date}</span>
                <span>{a.model_name || "Model not recorded"}</span>
                <span>{a.laboratory_name || "Laboratory not recorded"}</span>
                <span>{a.biological_age != null ? `${Number(a.biological_age).toFixed(1)} yrs` : "—"}</span>
                {a.report_path && (
                  <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => openReport(a.report_path!)}>
                    <FileText className="h-3 w-3" /> Report
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 9 — Assessments table */}
      <div className="rounded-lg border bg-card p-4">
        <p className="mb-2 text-sm font-semibold text-foreground">Biological Assessments</p>
        {assessments.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-6 w-6" />}
            title="No assessments recorded yet"
            description="Add your first biological-age assessment to start your trajectory."
            action={addButton ?? undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3 font-bold">Date</th>
                  <th className="py-1 pr-3 font-bold">Biological</th>
                  <th className="py-1 pr-3 font-bold">Chronological</th>
                  <th className="py-1 pr-3 font-bold">Difference</th>
                  <th className="py-1 pr-3 font-bold">Pace</th>
                  <th className="py-1 pr-3 font-bold">Type</th>
                  <th className="py-1 pr-3 font-bold">Provider</th>
                  <th className="py-1 font-bold">Data quality</th>
                </tr>
              </thead>
              <tbody>
                {sortByDateDesc(assessments).map((a, i, arr) => {
                  const q = assessmentQuality(a, assessments, cfg);
                  const priorRow = arr[i + 1] || null;
                  const transition =
                    priorRow && a.model_name && priorRow.model_name && a.model_name !== priorRow.model_name;
                  const markerEntries = Object.entries((a.markers ?? {}) as Record<string, string>).filter(
                    ([, v]) => String(v).trim() !== "",
                  );
                  return (
                    <Fragment key={a.id}>
                    <tr className="border-t">
                      <td className="py-1.5 pr-3">{a.assessment_date}</td>
                      <td className="py-1.5 pr-3">{a.biological_age != null ? Number(a.biological_age).toFixed(1) : "—"}</td>
                      <td className="py-1.5 pr-3">{a.chronological_age != null ? Number(a.chronological_age).toFixed(1) : "—"}</td>
                      <td className="py-1.5 pr-3">{a.age_difference != null ? Number(a.age_difference).toFixed(1) : "—"}</td>
                      <td className="py-1.5 pr-3">{a.ageing_pace != null ? Number(a.ageing_pace).toFixed(2) : "—"}</td>
                      <td className="py-1.5 pr-3">
                        {a.assessment_type === "dna_methylation" ? "DNA methylation" : a.assessment_type}
                        {transition && <span className="ml-1 text-[10px] text-amber-700">method changed</span>}
                      </td>
                      <td className="py-1.5 pr-3">{a.provider_name || a.laboratory_name || "—"}</td>
                      <td className="py-1.5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className={`${qualityTone[q.quality]} border-0 text-[10px] capitalize`}>
                                {q.quality}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">
                              {q.reasons.length ? q.reasons.join(". ") : "Comparable with your previous assessment."}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    </tr>
                    {markerEntries.length > 0 && (
                      <tr className="border-t-0">
                        <td colSpan={8} className="pb-2 pr-3">
                          <div className="flex flex-wrap gap-1.5">
                            {markerEntries.map(([key, value]) => {
                              const field = AGEING_MARKER_FIELDS.find((f) => f.key === key);
                              return (
                                <span
                                  key={key}
                                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground"
                                  title={field?.reflects}
                                >
                                  <span className="font-bold">{field?.label ?? key}</span> {value}
                                  {field?.unit ? ` ${field.unit}` : ""}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 10 — Healthspan */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Healthspan</p>
        <p className="text-xs text-muted-foreground">How well are you ageing?</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge className="border-0 bg-primary/10 text-primary text-xs">{trajectoryLabel(state)}</Badge>
          {since?.intervalDays != null && (
            <span className="text-xs text-muted-foreground">
              over the last {since.intervalDays} days between assessments
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-foreground">
          This read combines your physical function, metabolic markers, sleep, mental wellbeing, activity, nutrition,
          medication adherence, symptoms and biological-age trend as recorded in your Biolog. It is a direction of
          travel, not a precision score.
        </p>
        {(!entries || entries.length < cfg.min_daily_entries_for_insights) && (
          <p className="mt-2 text-xs text-muted-foreground">More data will strengthen your insights.</p>
        )}
      </div>

      {canEdit && (
        <AddAssessmentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          dob={dob}
          onSave={async (payload) => {
            await addAssessment.mutateAsync(payload);
          }}
        />
      )}
    </div>
  );
}

export { daysBetween };
