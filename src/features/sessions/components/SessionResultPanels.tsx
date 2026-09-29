import { useEffect, useState, type ReactNode } from "react";
import { AlertCircle, Brain, CheckCircle, Sparkles, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { SessionTranscriptAccordion } from "./SessionTranscriptAccordion";
import { ClinicianNotesColumns } from "./ClinicianNotesAccordion";


interface SessionResultPanelsProps {
  /** Finalised transcript — rendered in a collapsed accordion when present. */
  transcript?: string | null;
  doctorName?: string;
  summary?: string | null;
  /** Playable (signed) audio URL for the recording. */
  audioUrl?: string | null;
  actionPoints?: string[];
  /** Session id — used to look up whether each action point's linked to-do is done. */
  sessionId?: string | null;
  /** Shown as the assignee for action points whose linked to-do is assigned to the patient. */
  patientName?: string | null;
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

/** The "AI Summary" card content, extracted so it can be placed independently
 *  of the shared results grid (e.g. merged into SessionDetail's top-left card). */
export function AISummaryCard({
  summary,
  audioUrl,
  audioActions,
  summaryActions,
  showRetentionNotice = false,
}: Pick<SessionResultPanelsProps, "summary" | "audioUrl" | "audioActions" | "summaryActions" | "showRetentionNotice">) {
  return (
    <div>
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
          <div className="flex items-center gap-2">
            <audio controls className="w-full h-8" src={audioUrl}>
              Your browser does not support audio playback.
            </audio>
            {audioActions}
          </div>
          {showRetentionNotice && (
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5 text-primary shrink-0" />
              Voice recordings and transcriptions are automatically deleted after 7 days. AI
              summaries remain permanently.
            </p>
          )}
        </div>
      )}
    </div>
  );
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
  audioActions,
  actionPoints = [],
  sessionId,
  patientName,
  clinicianNotes,
  clinicianActions,
  summaryActions,
  showTodoHint = true,
  sessionDate,
  showRetentionNotice = false,
  hideSummary = false,
  leftSlot,
}: SessionResultPanelsProps & {
  /** Omit the AI Summary card — used when the caller renders it elsewhere itself. */
  hideSummary?: boolean;
  /** Content to render in AI Summary's old grid position (paired with Action Points) when hideSummary is set. */
  leftSlot?: ReactNode;
}) {
  const notesExpired = sessionDate
    ? Date.now() - new Date(sessionDate).getTime() > SEVEN_DAYS_MS
    : false;

  // Done status per action point: only an exact title match to a linked
  // to-do counts, since an AI rewrite step can reword titles and a
  // position-based guess could show "Done" for the wrong task. The to-do's
  // own RLS only lets its assignee mark it completed, so an exact match's
  // "completed" status already reflects it being done by the assignee.
  const [sessionTodos, setSessionTodos] = useState<{ title: string; status: string; assignee: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!sessionId) { setSessionTodos([]); return; }
    supabase
      .from("todos")
      .select("title, status, assignee")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (!cancelled) setSessionTodos((data || []) as any); });
    return () => { cancelled = true; };
  }, [sessionId]);

  const matchedTodo = (point: string) => sessionTodos.find((t) => t.title === point);
  const isPointDone = (point: string) => matchedTodo(point)?.status === "completed";
  const assigneeLabel = (point: string) => {
    const todo = matchedTodo(point);
    if (!todo) return null;
    if (todo.assignee === "patient") return patientName || "Patient";
    return doctorName || "Doctor";
  };

  return (
    <div className="space-y-6">
      {transcript ? (
        <SessionTranscriptAccordion transcript={transcript} doctorName={doctorName} />
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {/* AI Summary (or leftSlot replacement, e.g. Private Notes) */}
        {hideSummary ? (
          leftSlot
        ) : (
        <div className="rounded-xl border border-primary bg-card p-3 shadow-sm">
          <AISummaryCard
            summary={summary}
            audioUrl={audioUrl}
            audioActions={audioActions}
            summaryActions={summaryActions}
            showRetentionNotice={showRetentionNotice}
          />
        </div>
        )}


        {/* Action Points */}
        <div className="rounded-xl border border-primary bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            <h3 className="font-semibold text-sm text-foreground">Action Points</h3>
          </div>
          <div className="max-h-[150px] overflow-y-auto">
            {actionPoints.length > 0 ? (
              <ul className="space-y-1.5">
                {actionPoints.map((point, index) => {
                  const assignee = assigneeLabel(point);
                  return (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <span className="text-foreground flex-1">
                        {point}
                        {assignee && <span className="ml-1.5 text-xs text-muted-foreground">— {assignee}</span>}
                      </span>
                      {isPointDone(point) && (
                        <Badge className="bg-success text-success-foreground text-[10px] px-1.5 py-0 shrink-0">Done</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No action points generated.</p>
            )}
          </div>
          {actionPoints.length > 0 && showTodoHint && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs text-primary flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Added to To-Do List
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AI Clinician Decision Support */}
      {(clinicianNotes || clinicianActions) && (
      <div className="rounded-xl border border-primary/30 bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">AI Wealth Manager Notes</h3>
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
            <ClinicianNotesColumns notes={clinicianNotes} />
          )}
        </div>


      </div>
      )}
    </div>
  );
}
