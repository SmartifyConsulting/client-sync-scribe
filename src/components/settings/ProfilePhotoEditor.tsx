import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SIZE = 240;
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

export function ProfilePhotoEditor({ file, busy, onCancel, onSave }: {
  file: File | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (file: File) => Promise<void>;
}) {
  const [src, setSrc] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; startX: number; startY: number } | null>(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url); setZoom(1); setOffset({ x: 0, y: 0 });
    setDimensions({ width: 0, height: 0 }); setError("");
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const scale = dimensions.width ? Math.max(SIZE / dimensions.width, SIZE / dimensions.height) * zoom : 1;
  const width = dimensions.width * scale, height = dimensions.height * scale;
  const constrain = (x: number, y: number, nextZoom = zoom) => {
    const ratio = nextZoom / zoom;
    return { x: clamp(x, Math.max(0, (width * ratio - SIZE) / 2)), y: clamp(y, Math.max(0, (height * ratio - SIZE) / 2)) };
  };
  const saving = busy || preparing;
  const save = async () => {
    if (!image.current || !dimensions.width || saving) return;
    setPreparing(true); setError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Couldn't prepare your photo. Please try again.");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 512, 512);
      const factor = 512 / SIZE;
      ctx.drawImage(image.current, ((SIZE - width) / 2 + offset.x) * factor, ((SIZE - height) / 2 + offset.y) * factor, width * factor, height * factor);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Couldn't prepare your photo.")), "image/jpeg", 0.92));
      await onSave(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save your photo. Please try again."); }
    finally { setPreparing(false); }
  };
  return <Dialog open={!!file} onOpenChange={open => { if (!open && !saving) onCancel(); }}>
    <DialogContent className="settings-scope sm:max-w-sm" onInteractOutside={e => { if (saving) e.preventDefault(); }} onEscapeKeyDown={e => { if (saving) e.preventDefault(); }}>
      <DialogHeader>
        <DialogTitle className="text-sm">Adjust your photo</DialogTitle>
        <DialogDescription className="text-xs">Drag to reposition. Use Zoom to resize your photo.</DialogDescription>
      </DialogHeader>
      <div className="mx-auto relative overflow-hidden rounded-full bg-muted border border-border touch-none select-none focus-visible:ring-2 focus-visible:ring-primary" style={{ width: SIZE, height: SIZE, cursor: saving ? "wait" : "grab" }}
        tabIndex={0} role="group" aria-label="Photo crop preview. Drag or use arrow keys to reposition."
        onKeyDown={e => { const moves: Record<string, [number, number]> = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }; const move = moves[e.key]; if (move && !saving) { e.preventDefault(); setOffset(constrain(offset.x + move[0], offset.y + move[1])); } }}
        onPointerDown={e => { if (saving || !dimensions.width) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: offset.x, startY: offset.y }; }}
        onPointerMove={e => { const d = drag.current; if (!d || d.id !== e.pointerId || saving) return; setOffset(constrain(d.startX + e.clientX - d.x, d.startY + e.clientY - d.y)); }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
        {src && <img ref={image} src={src} alt="Your photo crop" draggable={false} onLoad={e => setDimensions({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })} onError={() => setError("This image couldn't be opened. Please choose a JPG, PNG or WebP photo.")}
          style={{ position: "absolute", maxWidth: "none", width, height, left: (SIZE - width) / 2 + offset.x, top: (SIZE - height) / 2 + offset.y }} />}
      </div>
      <div className="space-y-3"><p id="photo-zoom-label" className="text-xs font-medium">Zoom</p>
        <Slider aria-labelledby="photo-zoom-label" min={1} max={3} step={0.01} value={[zoom]} disabled={saving || !dimensions.width} onValueChange={([next]) => { setOffset(constrain(offset.x, offset.y, next)); setZoom(next); }} />
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={onCancel}>Cancel</Button>
        <Button aria-label={saving ? "Uploading…" : "Save photo"} disabled={saving || !dimensions.width} onClick={save}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}<span role="status">{saving ? "Uploading…" : "Save photo"}</span></Button>
      </div>
    </DialogContent>
  </Dialog>;
}
