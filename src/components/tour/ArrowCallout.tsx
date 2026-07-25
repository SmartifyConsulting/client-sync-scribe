import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Props {
  targetEl: HTMLElement;
  title: string;
  message: string;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function ArrowCallout({ targetEl, title, message, stepIndex, totalSteps, onNext, onSkip }: Props) {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const update = () => {
      const r = targetEl.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    update();
    targetEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const id = window.setInterval(update, 500);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(id);
    };
  }, [targetEl]);

  if (!rect) return null;

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  // Decide placement: prefer right of target if room, else left, else below
  const cardWidth = Math.min(300, viewportW - 24);
  const cardHeight = 170;
  const gap = 16;

  let placement: "right" | "left" | "bottom" | "top" = "right";
  if (rect.left + rect.width + gap + cardWidth < viewportW) placement = "right";
  else if (rect.left - gap - cardWidth > 0) placement = "left";
  else if (rect.top + rect.height + gap + cardHeight < viewportH) placement = "bottom";
  else placement = "top";

  let cardTop = 0,
    cardLeft = 0,
    arrowTop = 0,
    arrowLeft = 0,
    arrowAxis: "x" | "y" = "x",
    arrowDir: 1 | -1 = 1;

  switch (placement) {
    case "right":
      cardLeft = rect.left + rect.width + gap + 16;
      cardTop = Math.max(8, Math.min(viewportH - cardHeight - 8, rect.top + rect.height / 2 - cardHeight / 2));
      arrowLeft = rect.left + rect.width + 4;
      arrowTop = rect.top + rect.height / 2 - 12;
      arrowAxis = "x";
      arrowDir = 1; // pointing left into target
      break;
    case "left":
      cardLeft = rect.left - gap - cardWidth - 16;
      cardTop = Math.max(8, Math.min(viewportH - cardHeight - 8, rect.top + rect.height / 2 - cardHeight / 2));
      arrowLeft = rect.left - 28;
      arrowTop = rect.top + rect.height / 2 - 12;
      arrowAxis = "x";
      arrowDir = -1;
      break;
    case "bottom":
      cardTop = rect.top + rect.height + gap + 16;
      cardLeft = Math.max(8, Math.min(viewportW - cardWidth - 8, rect.left + rect.width / 2 - cardWidth / 2));
      arrowTop = rect.top + rect.height + 4;
      arrowLeft = rect.left + rect.width / 2 - 12;
      arrowAxis = "y";
      arrowDir = 1;
      break;
    case "top":
      cardTop = rect.top - gap - cardHeight - 16;
      cardLeft = Math.max(8, Math.min(viewportW - cardWidth - 8, rect.left + rect.width / 2 - cardWidth / 2));
      arrowTop = rect.top - 28;
      arrowLeft = rect.left + rect.width / 2 - 12;
      arrowAxis = "y";
      arrowDir = -1;
      break;
  }

  const arrowChar = placement === "right" ? "â†" : placement === "left" ? "â†’" : placement === "bottom" ? "â†‘" : "â†“";

  return (
    <>
      {/* Spotlight ring around target */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed pointer-events-none rounded-xl border-4 border-primary shadow-[0_0_0_4px_rgba(20,184,166,0.25),0_0_40px_rgba(20,184,166,0.55)] z-[9998]"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
      />

      {/* Animated bouncing arrow */}
      <motion.div
        className="fixed z-[9999] pointer-events-none text-primary text-3xl font-bold drop-shadow-lg"
        style={{ top: arrowTop, left: arrowLeft }}
        animate={
          arrowAxis === "x"
            ? { x: [0, 10 * arrowDir, 0] }
            : { y: [0, 10 * arrowDir, 0] }
        }
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      >
        {arrowChar}
      </motion.div>

      {/* Callout card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed z-[9999] w-[300px] max-w-[calc(100vw-16px)] rounded-xl border border-primary bg-card p-4 shadow-2xl"
        style={{ top: cardTop, left: cardLeft }}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{message}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm uppercase tracking-wide text-muted-foreground">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onSkip} className="h-7 text-sm">
              Skip
            </Button>
            <Button size="sm" onClick={onNext} className="h-7 text-sm">
              {stepIndex + 1 === totalSteps ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

