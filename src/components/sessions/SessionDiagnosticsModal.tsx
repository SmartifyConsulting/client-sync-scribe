import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, AlertTriangle, ArrowRight, PenLine } from "lucide-react";

interface SessionDiagnosticsModalProps {
  open: boolean;
  /** Full AI clinician diagnosis (non-binding decision support). */
  fullDiagnosis?: string | null;
  diagnosisLoading?: boolean;
  patientName?: string;
  sessionDate?: string;
  onClose: () => void;
  /** Continue to the document review sequence. */
  onProgressComplete?: () => void;
  /** Open the doctor's own findings note before continuing. */
  onEditFindings?: () => void;
}

type Block =
  | { kind: "heading"; text: string }
  | { kind: "bullet"; items: string[] }
  | { kind: "paragraph"; text: string };

const HEADING_RE = /^(?:\*\*)?\s*(?:\d+[.)]\s*)?([A-Z][A-Za-z /&'-]{2,60})\s*:?\s*(?:\*\*)?$/;

function isHeading(line: string) {
  const clean = line.replace(/\*\*/g, "").trim();
  if (!clean) return false;
  if (clean.length > 70) return false;
  if (clean.endsWith(":")) return true;
  if (clean === clean.toUpperCase() && /[A-Z]/.test(clean)) return true;
  return HEADING_RE.test(clean) && /^(?:\d+[.)]\s*)?[A-Z]/.test(clean) && !clean.endsWith(".");
}

/** Parse plain AI text into report blocks (headings, bullet lists, paragraphs). */
export function parseReport(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split(/\r?\n/);
  let para: string[] = [];
  let bullets: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: "paragraph", text: para.join(" ").trim() });
      para = [];
    }
  };
  const flushBullets = () => {
    if (bullets.length) {
      blocks.push({ kind: "bullet", items: bullets });
      bullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushBullets();
      flushPara();
      continue;
    }
    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      flushPara();
      bullets.push(bulletMatch[1].replace(/\*\*/g, "").trim());
      continue;
    }
    if (isHeading(line)) {
      flushBullets();
      flushPara();
      blocks.push({
        kind: "heading",
        text: line.replace(/\*\*/g, "").replace(/:$/, "").trim(),
      });
      continue;
    }
    flushBullets();
    para.push(line.replace(/\*\*/g, ""));
  }
  flushBullets();
  flushPara();
  return blocks;
}

export function ClinicalReport({ text }: { text: string }) {
  const blocks = React.useMemo(() => parseReport(text), [text]);
  return (
    <div className="space-y-3 text-[12px] leading-relaxed text-foreground">
      {blocks.map((b, i) => {
        if (b.kind === "heading") {
          return (
            <div key={i} className="pt-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary">
                {b.text}
              </h4>
              <div className="mt-1 h-px w-full bg-border" />
            </div>
          );
        }
        if (b.kind === "bullet") {
          return (
            <ul key={i} className="space-y-1 pl-1">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-[12px] text-muted-foreground">
                  <span className="text-primary font-semibold leading-5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-[12px] text-muted-foreground text-justify">
            {b.text}
          </p>
        );
      })}
    </div>
  );
}

export function SessionDiagnosticsModal({
  open,
  fullDiagnosis,
  diagnosisLoading,
  patientName,
  sessionDate,
  onClose,
  onProgressComplete,
  onEditFindings,
}: SessionDiagnosticsModalProps) {
  const waiting = !!diagnosisLoading && !fullDiagnosis;

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-4xl max-h-[85vh] overflow-y-auto [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <DialogTitle className="text-base">AI Clinical Assessment</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Clinical decision support report — review before documents are generated
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Report letterhead line */}
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
            <p className="text-[12px] font-semibold text-foreground">
              {patientName || "Patient"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {sessionDate || new Date().toLocaleDateString()}
            </p>
          </div>

          {waiting ? (
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Completing the full assessment from the finished transcript...
            </div>
          ) : fullDiagnosis ? (
            <ClinicalReport text={fullDiagnosis} />
          ) : (
            <p className="text-[12px] text-muted-foreground">
              No full assessment available for this session.
            </p>
          )}

          <div className="flex gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-base text-muted-foreground leading-relaxed">
              This AI-generated assessment is clinical decision support only. It is
              <strong className="text-foreground"> not binding</strong>, is not a diagnosis, and
              must be validated by your own clinical judgement before acting on it.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onEditFindings?.()}
            >
              <PenLine className="h-4 w-4" />
              Edit Findings
            </Button>
            <Button
              size="sm"
              className="gap-2"
              disabled={waiting}
              onClick={() => {
                onClose();
                onProgressComplete?.();
              }}
            >
              {waiting && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue — Generate Documents
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
