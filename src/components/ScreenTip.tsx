import { useEffect, useRef } from "react";
import { Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  body: string;
  onDismiss: () => void;
  autoDismissMs?: number;
}

/**
 * Small floating tip card shown on first visit to a screen.
 * Auto-dismisses after `autoDismissMs` (default 8s).
 */
export function ScreenTip({ title, body, onDismiss, autoDismissMs = 8000 }: Props) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setTimeout(onDismiss, autoDismissMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [onDismiss, autoDismissMs]);

  return (
    <div
      role="dialog"
      aria-label={`Tip: ${title}`}
      className="fixed z-[60] bottom-28 md:bottom-6 right-4 md:right-6 max-w-[320px] animate-fade-in"
    >
      <div className="rounded-lg border-2 border-primary bg-card shadow-xl p-3 flex gap-2.5">
        <div className="shrink-0 mt-0.5">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
            <button
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground -mt-0.5 -mr-1 p-0.5"
              aria-label="Dismiss tip"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-snug">{body}</p>
          <div className="mt-2 flex justify-end">
            <Button size="sm" className="h-7 text-sm px-3" onClick={onDismiss}>
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

