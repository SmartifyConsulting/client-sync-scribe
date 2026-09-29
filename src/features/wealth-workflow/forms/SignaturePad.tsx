import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

/** Finger/mouse signature pad. Calls onChange with a PNG data URL, or null when cleared. */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const c = ref.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio; c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio); ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.strokeStyle = getComputedStyle(c).color;
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const down = (e: React.PointerEvent) => {
    drawing.current = true; ref.current!.setPointerCapture(e.pointerId);
    const ctx = ref.current!.getContext("2d")!; ctx.beginPath(); ctx.moveTo(...pos(e));
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext("2d")!; ctx.lineTo(...pos(e)); ctx.stroke(); dirty.current = true;
  };
  const up = () => {
    if (!drawing.current) return; drawing.current = false;
    if (dirty.current) onChange(ref.current!.toDataURL("image/png"));
  };
  const clear = () => {
    const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    dirty.current = false; onChange(null);
  };

  return (
    <div className="space-y-1">
      <canvas ref={ref} className="w-full h-28 rounded-md border border-input bg-background text-foreground touch-none"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} aria-label="Signature area" />
      <Button type="button" variant="ghost" size="sm" onClick={clear}>Clear</Button>
    </div>
  );
}
