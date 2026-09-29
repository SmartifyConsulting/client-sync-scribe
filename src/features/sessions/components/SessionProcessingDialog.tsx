import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
}

/**
 * Single centred progress box shown while the session is being analysed.
 * Replaces the transcription toast and the old top-of-screen status strip.
 */
export function SessionProcessingDialog({ open }: Props) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-sm text-center [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Analysing consultation</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Generating summary, action points and documents…
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
