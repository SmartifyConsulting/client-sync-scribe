import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CloudRain, Sparkles, TrendingUp, X } from "lucide-react";
import vulaExplainer from "@/assets/vula-explainer.png";

interface VulaExplainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCta?: () => void;
}

export function VulaExplainerDialog({ open, onOpenChange, onCta }: VulaExplainerDialogProps) {
  const handleCta = () => {
    if (onCta) onCta();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 gap-0 bg-card">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-6 pb-4 text-white">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 rounded-full bg-white/20 p-1 hover:bg-white/30 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center text-center">
            <img
              src={vulaExplainer}
              alt="Vula Vouchers — rain that nourishes"
              className="h-32 w-auto object-contain drop-shadow-lg"
            />
            <h2 className="mt-3 text-xl font-bold tracking-tight">
              Welcome to Vula Vouchers
            </h2>
            <p className="mt-1 text-xs text-white/90 italic">
              "Vula" means rain in isiZulu and isiXhosa
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-foreground leading-relaxed">
            Just as rain nourishes the earth, <span className="font-semibold text-primary">Vulas</span> nourish your wellbeing. They're our way of celebrating the small, real-world actions that build a healthier life.
          </p>

          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2 shrink-0">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Vulas reward real-world actions</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Attending appointments, taking your medication, completing health tasks — every step counts.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2 shrink-0">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">A simple way to start building value</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vulas grow with you and can be transferred to partner apps for real benefits.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleCta}
            className="w-full bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white gap-2 shadow-md"
            size="lg"
          >
            <CloudRain className="h-4 w-4" />
            Earn Vulas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
