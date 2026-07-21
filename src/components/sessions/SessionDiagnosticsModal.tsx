import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { X, Brain, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionDiagnosticsModalProps {
  open: boolean;
  summary?: string;
  actionPoints?: string[];
  onClose: () => void;
  onProgressComplete?: () => void;
}

type ProgressStage = "modal" | "prescription" | "documents" | "complete";

export function SessionDiagnosticsModal({
  open,
  summary,
  actionPoints = [],
  onClose,
  onProgressComplete,
}: SessionDiagnosticsModalProps) {
  const [stage, setStage] = useState<ProgressStage>("modal");
  const [progress, setProgress] = useState(0);

  // Auto-progress through stages
  useEffect(() => {
    if (stage === "prescription") {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setStage("documents");
            setProgress(0);
            return 0;
          }
          return prev + Math.random() * 30;
        });
      }, 300);
      return () => clearInterval(interval);
    }

    if (stage === "documents") {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setStage("complete");
            setProgress(100);
            setTimeout(() => {
              onProgressComplete?.();
              onClose();
            }, 1000);
            return 100;
          }
          return prev + Math.random() * 30;
        });
      }, 300);
      return () => clearInterval(interval);
    }
  }, [stage, onClose, onProgressComplete]);

  return (
    <Dialog open={open && stage === "modal"} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-teal-500" />
            <DialogTitle>AI Diagnostic Summary</DialogTitle>
          </div>
          <DialogDescription>
            Session analysis and recommended actions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary Section */}
          {summary && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-foreground">
                Session Summary
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {summary}
              </p>
            </div>
          )}

          {/* Action Points Section */}
          {actionPoints.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-foreground">
                Action Points ({actionPoints.length})
              </h3>
              <ul className="space-y-2">
                {actionPoints.map((point, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 text-sm text-muted-foreground"
                  >
                    <span className="text-teal-500 font-semibold">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStage("prescription")}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Close & Generate Documents
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Progress Overlay */}
      {(stage === "prescription" || stage === "documents") && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-card rounded-lg p-8 shadow-lg max-w-sm">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground">
                {stage === "prescription"
                  ? "⏳ Generating prescription..."
                  : "⏳ Generating all documents..."}
              </h3>

              <Progress value={progress} className="h-2" />

              <p className="text-sm text-muted-foreground">
                {Math.round(progress)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completion Message */}
      {stage === "complete" && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-card rounded-lg p-8 shadow-lg max-w-sm text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h3 className="font-semibold text-lg text-foreground">
              ✅ All documents generated!
            </h3>
            <p className="text-sm text-muted-foreground">
              Ready for review and submission
            </p>
          </div>
        </div>
      )}
    </Dialog>
  );
}
