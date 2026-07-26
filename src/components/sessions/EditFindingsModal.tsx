import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, PenLine, Loader2 } from "lucide-react";
import { ClinicalReport } from "./SessionDiagnosticsModal";

interface EditFindingsModalProps {
  open: boolean;
  fullDiagnosis?: string | null;
  value: string;
  onChange: (v: string) => void;
  /** Return to the assessment modal, keeping the typed note. */
  onCancel: () => void;
  /** Save the note and continue into the document review sequence. */
  onContinue: () => void | Promise<void>;
}

export function EditFindingsModal({
  open,
  fullDiagnosis,
  value,
  onChange,
  onCancel,
  onContinue,
}: EditFindingsModalProps) {
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-4xl max-h-[85vh] overflow-y-auto [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-primary" />
            <DialogTitle className="text-base">Edit Findings</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Record what you are reconsidering and how you are changing the course of therapy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {fullDiagnosis && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 max-h-56 overflow-y-auto">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                AI Clinical Assessment (read-only)
              </p>
              <ClinicalReport text={fullDiagnosis} />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Your findings</label>
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={8}
              placeholder="e.g. Reconsidering the antibiotic choice given the allergy history; stepping down the analgesia and adding physiotherapy over 4 weeks."
              className="text-[12px]"
            />
            <p className="text-[11px] text-muted-foreground">
              These notes are saved with the session and carried into the document review steps,
              where you can amend the prescription or therapy strategy.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
              Back to assessment
            </Button>
            <Button
              size="sm"
              className="gap-2"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onContinue();
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue — Review Documents
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
