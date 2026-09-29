import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Check, Flame } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SuccessCelebrationProps {
  open: boolean;
  onClose: () => void;
  vulasEarned?: number;
  streak?: number;
  medicationName?: string;
}

export function SuccessCelebration({
  open,
  onClose,
  vulasEarned = 5,
  streak = 0,
  medicationName,
}: SuccessCelebrationProps) {
  useEffect(() => {
    if (!open) return;

    // Fire confetti for ~2s from the centre
    const duration = 2000;
    const end = Date.now() + duration;
    const colors = ["#3B82F6", "#14B8A6", "#22C55E", "#FBBF24"];

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 65,
        origin: { x: 0.2, y: 0.6 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 65,
        origin: { x: 0.8, y: 0.6 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    // Auto-close after 3s
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm text-center py-8">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-20 w-20 rounded-full bg-sky-500/15 flex items-center justify-center animate-in zoom-in-50 duration-500"
          >
            <Check className="h-10 w-10 text-primary" strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-teal-500 bg-clip-text text-transparent">
            Great job!
          </h2>
          {medicationName && (
            <p className="text-sm text-muted-foreground -mt-2">{medicationName} confirmed</p>
          )}
          <div className="flex items-center gap-3 text-base">
            <span className="font-semibold text-foreground">+{vulasEarned} Vulas</span>
            {streak > 0 && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="flex items-center gap-1 text-foreground">
                  <Flame className="h-4 w-4 text-orange-500" />
                  {streak}-day streak
                </span>
              </>
            )}
          </div>
          <Button onClick={onClose} className="mt-2 w-full">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
