import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Send, Loader2 } from "lucide-react";

export interface DocumentDeliveryTarget {
  label: string;
  documentId?: string | null;
  recipientEmail?: string | null;
  recipientName?: string | null;
}

interface Props {
  target: DocumentDeliveryTarget | null;
  /** Called with true when the document was sent, false when just generated. */
  onFinish: (sent: boolean) => void;
  onSend?: (target: DocumentDeliveryTarget) => Promise<boolean>;
}

type Stage = "generating" | "generated" | "sending" | "sent";

export function DocumentDeliveryProgress({ target, onFinish, onSend }: Props) {
  const [stage, setStage] = useState<Stage>("generating");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!target) return;
    setStage("generating");
    setProgress(8);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setStage("generated");
          return 100;
        }
        return Math.min(100, p + 18 + Math.random() * 14);
      });
    }, 180);
    return () => clearInterval(interval);
  }, [target]);

  if (!target) return null;

  const canSend = Boolean(onSend && target.documentId && target.recipientEmail);

  const handleSend = async () => {
    setStage("sending");
    setProgress(10);
    const interval = setInterval(() => {
      setProgress((p) => Math.min(95, p + 12 + Math.random() * 10));
    }, 180);
    let ok = false;
    try {
      ok = onSend ? await onSend(target) : false;
    } finally {
      clearInterval(interval);
      setProgress(100);
      setStage("sent");
      setTimeout(() => onFinish(ok), 900);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v && (stage === "generated" || stage === "sent")) onFinish(false); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{target.label}</DialogTitle>
          <DialogDescription>
            {stage === "generating" && "Generating document..."}
            {stage === "generated" && "Generated — ready to send."}
            {stage === "sending" && `Sending to ${target.recipientEmail}...`}
            {stage === "sent" && "Sent."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {(stage === "generating" || stage === "sending") && <Loader2 className="h-4 w-4 animate-spin" />}
            {(stage === "generated" || stage === "sent") && <CheckCircle2 className="h-4 w-4 text-primary" />}
            <span>
              {stage === "generating" && `${Math.round(progress)}%`}
              {stage === "generated" && "Generated"}
              {stage === "sending" && `${Math.round(progress)}%`}
              {stage === "sent" && "Sent"}
            </span>
          </div>

          {stage === "generated" && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => onFinish(false)}>
                Close
              </Button>
              {canSend && (
                <Button size="sm" className="gap-1.5" onClick={handleSend}>
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
