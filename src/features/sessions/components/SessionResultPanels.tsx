import type { ReactNode } from "react";
import { AlertCircle, Brain, CheckCircle, Sparkles, ShieldAlert } from "lucide-react";
import { SessionTranscriptAccordion } from "./SessionTranscriptAccordion";

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
  /** Extra controls in the AI Summary header (e.g. language select). */
  summaryActions?: ReactNode;
  /** Shown when action points were pushed to the to-do list. */
  showTodoHint?: boolean;
}

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
  actionPoints = [],
  clinicianNotes,
  clinicianActions,
  summaryActions,
  showTodoHint = true,
}: SessionResultPanelsProps) {
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
      <div className="rounded-xl border border-primary/30 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">AI Clinician</h3>
              <p className="text-sm text-muted-foreground">
                Get AI-powered diagnostic recommendations based on patient history
              </p>
            </div>
          </div>
          {clinicianActions}
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
          <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            <strong>For Clinical Decision Support Only:</strong> This AI analysis is confidential and intended to
            assist physician judgment. It is not a diagnosis and should not be shared with patients. Always apply
            clinical expertise.
          </p>
        </div>

        {clinicianNotes ? (
          <div className="p-4 rounded-lg bg-muted/50 border border-border max-h-[400px] overflow-y-auto">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {clinicianNotes}
            </pre>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No AI Clinician notes recorded for this session.</p>
        )}
      </div>
    </div>
  );
}
