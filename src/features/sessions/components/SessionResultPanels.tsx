import type { ReactNode } from "react";
import { AlertCircle, Brain, CheckCircle, Sparkles, Volume2 } from "lucide-react";
import { SessionTranscriptAccordion } from "./SessionTranscriptAccordion";
import { ClinicianNotesAccordion } from "./ClinicianNotesAccordion";


interface SessionResultPanelsProps {
  /** Finalised transcript — rendered in a collapsed accordion when present. */
  transcript?: string | null;
  doctorName?: string;
  summary?: string | null;
  /** Playable (signed) audio URL for the recording. */
  audioUrl?: string | null;
  actionPoints?: string[];
  /** AI Clinician decision-support write-up. */
  clinicianNotes?: string | null;
  /** Buttons rendered inside the AI Clinician header (translate / narrate). */
  clinicianActions?: ReactNode;
  /** Controls rendered directly beneath the audio player (e.g. downloads). */
  audioActions?: ReactNode;
  /** Extra controls in the AI Summary header (e.g. language select). */
  summaryActions?: ReactNode;
  /** Shown when action points were pushed to the to-do list. */
  showTodoHint?: boolean;
  /** Session start date — clinician notes are only shown for 7 days after this. */
  sessionDate?: string | Date | null;
  /** Shows the 7-day recording retention line under the audio player. */
  showRetentionNotice?: boolean;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The shared "session results" layout — transcript, AI summary, action points and
 * AI Clinician notes. Used both on the live Session screen after a recording ends
 * and when opening a past session, so both look identical.
 */
export function SessionResultPanels({
  transcript,
  doctorName,
  summary,
  audioUrl,
  audioActions,
  actionPoints = [],
  clinicianNotes,
  clinicianActions,
  summaryActions,
  showTodoHint = true,
  sessionDate,
  showRetentionNotice = false,
}: SessionResultPanelsProps) {
  const notesExpired = sessionDate
    ? Date.now() - new Date(sessionDate).getTime() > SEVEN_DAYS_MS
    : false;

  return (
    <div className="space-y-6">
      {transcript ? (
        <div className="rounded-xl border border-primary bg-card shadow-sm overflow-hidden">
          <SessionTranscriptAccordion transcript={transcript} doctorName={doctorName} />
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {/* AI Summary */}
        <div className="rounded-xl border border-primary bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">AI Summary</h3>
            {summaryActions && <div className="ml-auto flex items-center gap-2">{summaryActions}</div>}
          </div>
          <div className="max-h-[150px] overflow-y-auto">
            <p className="text-sm text-foreground leading-relaxed">
              {summary || "No summary generated for this session."}
            </p>
          </div>
          {audioUrl && (
            <div className="mt-2 pt-2 border-t border-border">
              <audio controls className="w-full h-8" src={audioUrl}>
                Your browser does not support audio playback.
              </audio>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {audioActions}
                {showRetentionNotice && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    Voice recordings and transcriptions are automatically deleted after 7 days. AI
                    summaries remain permanently.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>


        {/* Action Points */}
        <div className="rounded-xl border border-primary bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            <h3 className="font-semibold text-sm text-foreground">Action Points</h3>
          </div>
          <div className="max-h-[150px] overflow-y-auto">
            {actionPoints.length > 0 ? (
              <ul className="space-y-1.5">
                {actionPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No action points generated.</p>
            )}
          </div>
          {actionPoints.length > 0 && showTodoHint && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Added to To-Do List
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AI Clinician Decision Support */}
      <div className="rounded-xl border border-primary/30 bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">AI Clinician Notes</h3>
          </div>
          {clinicianActions}
        </div>

        <div>
          {notesExpired ? (
            <p className="text-xs text-muted-foreground">
              AI Clinician notes are retained for 7 days and are no longer displayed for this
              session.
            </p>
          ) : (
            <ClinicianNotesAccordion notes={clinicianNotes} />
          )}
        </div>


      </div>
    </div>
  );
}
