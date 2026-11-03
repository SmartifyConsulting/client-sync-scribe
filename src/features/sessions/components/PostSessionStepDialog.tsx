import { Brain, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FollowUpAppointmentDialog } from "./FollowUpAppointmentDialog";

export type PostSessionStepType = "summary" | "schedule";

/** First step of the queue — the AI summary and action points. */
function SummaryStepDialog({
  summary,
  actionPoints,
  clientName,
  onAdvance,
}: {
  summary?: string | null;
  actionPoints?: string[];
  clientName?: string;
  onAdvance: () => void;
}) {
  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Summary
          </DialogTitle>
          <DialogDescription>
            {clientName ? `Consultation summary for ${clientName}.` : "Consultation summary."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto text-sm leading-relaxed text-foreground">
          <p className="whitespace-pre-wrap">{summary?.trim() || "No summary was produced for this session."}</p>
          {(actionPoints || []).length > 0 && (
            <div className="space-y-1.5">
              <p className="font-semibold">Action points</p>
              <ul className="list-disc pl-5 space-y-1">
                {(actionPoints || []).map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onAdvance}>
            <Check className="mr-2 h-4 w-4" />
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PostSessionQueueDialogProps {
  /** Ordered post-session steps to run, one at a time. */
  queue: PostSessionStepType[];
  index: number;
  onAdvance: () => void;
  onFinish: () => void;
  currentPatient: { id: string; name: string; patient_user_id: string | null } | null;
  advisorId: string;
  advisorName?: string;
  extractedFollowUp?: { follow_up_date?: string; follow_up_time?: string; notes?: string } | null;
  clientName?: string;
  /** AI summary + action points shown as the first step of the queue. */
  summary?: string | null;
  actionPoints?: string[];
}

/**
 * Drives the sequential post-session queue: the AI summary step, then
 * scheduling a follow-up.
 */
export function PostSessionStepDialog({
  queue,
  index,
  onAdvance,
  onFinish,
  currentPatient,
  advisorId,
  advisorName,
  extractedFollowUp,
  clientName,
  summary,
  actionPoints,
}: PostSessionQueueDialogProps) {
  const step = queue[index];
  if (!step) return null;

  if (step === "summary") {
    return (
      <SummaryStepDialog
        summary={summary}
        actionPoints={actionPoints}
        clientName={clientName || currentPatient?.name}
        onAdvance={onAdvance}
      />
    );
  }

  if (step === "schedule") {
    if (!currentPatient || !advisorId) {
      return null;
    }
    return (
      <FollowUpAppointmentDialog
        open
        onOpenChange={(o) => {
          if (!o) onAdvance();
        }}
        advisorId={advisorId}
        advisorName={advisorName}
        clientId={currentPatient.id}
        patientUserId={currentPatient.patient_user_id}
        clientName={clientName || currentPatient.name}
        suggestedDate={extractedFollowUp?.follow_up_date}
        suggestedTime={extractedFollowUp?.follow_up_time}
        onDone={onAdvance}
      />
    );
  }

  return null;
}
