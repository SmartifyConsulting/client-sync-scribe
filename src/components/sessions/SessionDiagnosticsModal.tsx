import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, AlertTriangle, ArrowRight } from "lucide-react";

interface SessionDiagnosticsModalProps {
  open: boolean;
  summary?: string;
  actionPoints?: string[];
  /** Full AI clinician diagnosis (non-binding decision support). */
  fullDiagnosis?: string | null;
  diagnosisLoading?: boolean;
  onClose: () => void;
  /** Continue to the document review sequence. */
  onProgressComplete?: () => void;
}

export function SessionDiagnosticsModal({
  open,
  summary,
  actionPoints = [],
  fullDiagnosis,
  diagnosisLoading,
  onClose,
  onProgressComplete,
}: SessionDiagnosticsModalProps) {
  const dismiss = () => onClose();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <DialogTitle>AI Diagnostic Summary</DialogTitle>
          </div>
          <DialogDescription>
            Session analysis and recommended actions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {summary && (
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-foreground">Session Summary</h3>
              <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {summary}
              </p>
            </div>
          )}

          {actionPoints.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-foreground">
                Action Points ({actionPoints.length})
              </h3>
              <ul className="space-y-1.5">
                {actionPoints.map((point, idx) => (
                  <li key={idx} className="flex gap-2 text-base text-muted-foreground">
                    <span className="text-primary font-semibold">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full AI clinical diagnosis */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">Full AI Clinical Assessment</h3>
            {diagnosisLoading && !fullDiagnosis ? (
              <div className="flex items-center gap-2 text-base text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Completing the full assessment from the finished transcript...
              </div>
            ) : fullDiagnosis ? (
              <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {fullDiagnosis}
              </p>
            ) : (
              <p className="text-base text-muted-foreground">
                No full assessment available for this session.
              </p>
            )}
          </div>

          <div className="flex gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              This AI-generated assessment is clinical decision support only. It is
              <strong className="text-foreground"> not binding</strong>, is not a diagnosis, and
              must be validated by your own clinical judgement before acting on it.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={dismiss}>
              Close
            </Button>
            <Button
              size="sm"
              className="gap-2"
              disabled={diagnosisLoading && !fullDiagnosis}
              onClick={() => {
                onClose();
                onProgressComplete?.();
              }}
            >
              OK — Review Documents
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
