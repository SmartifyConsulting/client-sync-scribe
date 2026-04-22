import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CloudRain, X } from "lucide-react";
import vulaVouchersLogo from "@/assets/vula-vouchers-logo-v2.png";

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
        <div className="relative bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-6 pb-5 text-white">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 rounded-full bg-white/20 p-1 hover:bg-white/30 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center text-center">
            <img
              src={vulaVouchersLogo}
              alt="Vula Vouchers"
              className="h-20 w-auto object-contain drop-shadow-lg"
            />
            <h2 className="mt-3 text-xl font-bold tracking-tight">
              Welcome to Vula Vouchers
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="space-y-3 text-sm text-foreground leading-relaxed">
            <p>
              <span className="font-semibold text-primary">Vula</span> means rain in isiZulu and isiXhosa — something you can't always predict, but always need.
            </p>
            <p>
              Vulas reward real-world actions — caring, helping, sharing, contributing, and following through.
            </p>
            <p>
              It's how we show up for each other.
            </p>
            <p>
              The way we earn and exchange value is changing.
            </p>
            <p>
              Vulas are a simple way to start building value that grows with you.
            </p>
          </div>

          <p className="text-center text-sm font-bold bg-gradient-to-r from-blue-500 to-teal-500 bg-clip-text text-transparent">
            Earn them. Use them. Keep them.
          </p>

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
