import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const WIDTH = 320;
const formats = { original: "Original", wide: "Wide", square: "Square" } as const;
type Format = keyof typeof formats;
type Offset = { x: number; y: number };

export function LogoCropDialog({ file, title, onClose, onSave }: {
  file: File; title: string; onClose: () => void; onSave: (file: File) => Promise<void>;
}) {
  const [src, setSrc] = useState("");
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [format, setFormat] = useState<Format>("original");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; offset: Offset }>();
  const ratio = format === "wide" ? 3 : format === "square" ? 1 : size.width && size.height ? size.width / size.height : 2;
  const width = Math.min(WIDTH, 240 * ratio);
  const height = width / ratio;
  const base = size.width ? Math.max(width / size.width, height / size.height) : 1;
  const renderedWidth = size.width * base * zoom;
  const renderedHeight = size.height * base * zoom;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function constrain(position: Offset, nextZoom = zoom): Offset {
    const limit = (value: number, edge: number) => Math.max(-edge, Math.min(edge, value));
    return {
      x: limit(position.x, Math.max(0, (size.width * base * nextZoom - width) / 2)),
      y: limit(position.y, Math.max(0, (size.height * base * nextZoom - height) / 2)),
    };
  }

  function reset(nextFormat: Format = "original") {
    setFormat(nextFormat);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  async function save() {
    if (!image.current || !size.width || saving) return;
    setError("");
    setSaving(true);
    try {
      if (format === "original" && zoom === 1) {
        await onSave(file);
      } else {
        const canvas = document.createElement("canvas");
        const outputScale = Math.min(700 / Math.max(width, height), 1 / (base * zoom));
        canvas.width = Math.max(1, Math.round(width * outputScale));
        canvas.height = Math.max(1, Math.round(height * outputScale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("This browser couldn’t prepare the crop.");
        const scaleX = canvas.width / width;
        const scaleY = canvas.height / height;
        context.drawImage(image.current, ((width - renderedWidth) / 2 + offset.x) * scaleX,
          ((height - renderedHeight) / 2 + offset.y) * scaleY, renderedWidth * scaleX, renderedHeight * scaleY);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("This browser couldn’t export the crop.");
        await onSave(new File([blob], "cropped-logo.png", { type: "image/png" }));
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save the logo. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Crop {title.toLowerCase()}</DialogTitle>
        <DialogDescription>Choose a shape, zoom in, then drag the logo to position it. The preview shows what will be saved.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(formats) as Format[]).map(value => <Button key={value} type="button" size="sm"
          variant={format === value ? "default" : "outline"} aria-pressed={format === value} disabled={saving}
          onClick={() => reset(value)}>{formats[value]}</Button>)}
      </div>
      <div tabIndex={0} role="group" aria-label="Logo crop preview. Drag or use arrow keys to reposition."
        className="relative mx-auto max-w-full touch-none cursor-move overflow-hidden rounded-md border border-border bg-muted"
        style={{ width, aspectRatio: ratio, backgroundImage: "conic-gradient(#dfe4ea 25%, #fff 0 50%, #dfe4ea 0 75%, #fff 0)", backgroundSize: "16px 16px" }}
        onPointerDown={e => {
          if (saving || !size.width || e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY, offset };
        }}
        onPointerMove={e => {
          const start = drag.current;
          if (!start || start.pointer !== e.pointerId || saving) return;
          const factor = width / e.currentTarget.getBoundingClientRect().width;
          setOffset(constrain({ x: start.offset.x + (e.clientX - start.x) * factor, y: start.offset.y + (e.clientY - start.y) * factor }));
        }}
        onLostPointerCapture={() => { drag.current = undefined; }}
        onKeyDown={e => {
          const directions: Record<string, Offset> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
          const direction = directions[e.key];
          if (!direction || saving) return;
          e.preventDefault();
          setOffset(constrain({ x: offset.x + direction.x * 5, y: offset.y + direction.y * 5 }));
        }}>
        {src && <img ref={image} src={src} alt="Logo crop" draggable={false} className="absolute max-w-none"
          style={{ width: `${renderedWidth / width * 100}%`, height: `${renderedHeight / height * 100}%`,
            left: `${50 + offset.x / width * 100}%`, top: `${50 + offset.y / height * 100}%`, transform: "translate(-50%, -50%)" }}
          onLoad={e => setSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
          onError={() => setError("This image couldn’t be opened. Choose a PNG, JPG or SVG logo.")} />}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium">Zoom · {Math.round(zoom * 100)}%</p>
        <Slider thumbLabel="Zoom" min={1} max={4} step={0.01} value={[zoom]} disabled={saving || !size.width}
          onValueChange={([value]) => { setZoom(value); setOffset(constrain(offset, value)); }} />
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="ghost" disabled={saving} onClick={() => reset()}>Reset</Button>
        <Button variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
        <Button disabled={saving || !size.width} onClick={() => void save()}>{saving ? "Saving…" : "Save logo"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
