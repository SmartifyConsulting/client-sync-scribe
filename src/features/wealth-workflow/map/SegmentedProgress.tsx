import { useEffect, useState } from "react";

/** Each group of four squares is one confirmed checkpoint; time never fills the bar. */
export function SegmentedProgress({ completed, total = 4, label, active = false, activeUntil }: { completed: number; total?: number; label: string; active?: boolean; activeUntil?: number }) {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    setExpired(false);
    if (!active || activeUntil === undefined) return;
    const remaining = activeUntil - Date.now();
    if (remaining <= 0) { setExpired(true); return; }
    const timer = setTimeout(() => setExpired(true), remaining);
    return () => clearTimeout(timer);
  }, [active, activeUntil]);
  const blocks = 16;
  const filled = Math.max(0, Math.min(blocks, Math.floor(completed / total * blocks)));
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed}
    aria-valuetext={`${completed} of ${total} checkpoints confirmed${active && !expired ? " · working" : ""}`} className="flex w-full max-w-64 gap-0.5 py-1" title="Solid squares show confirmed checkpoints; the moving highlight shows current activity">
    {Array.from({ length: blocks }, (_, i) => <span key={i} aria-hidden="true" style={{ borderRadius: 0, animationDelay: `${Math.max(0, i - filled) * 90}ms` }}
      className={`aspect-square min-w-0 flex-1 border border-foreground ${i < filled ? "bg-foreground" : "bg-background"} ${active && !expired && i >= filled ? "quote-segment-working" : ""}`} />)}
  </div>;
}
