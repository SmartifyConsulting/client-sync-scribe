import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Loader2, RefreshCw, Check, X, Sun, MoveHorizontal, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PillBaselineCaptureProps {
  open: boolean;
  onClose: () => void;
  onCaptured: () => void;
  prescriptionId: string;
  patientId: string;
  medicationName: string;
  dosage: string;
}

type QualityCheck = {
  brightness: "ok" | "dark" | "bright";
  sharpness: "ok" | "blurry";
  size: "ok" | "small" | "large";
};

export function PillBaselineCapture({
  open,
  onClose,
  onCaptured,
  prescriptionId,
  patientId,
  medicationName,
  dosage,
}: PillBaselineCaptureProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [quality, setQuality] = useState<QualityCheck>({ brightness: "dark", sharpness: "blurry", size: "small" });
  const [allClearSince, setAllClearSince] = useState<number | null>(null);
  const [canCapture, setCanCapture] = useState(false);
  const [captured, setCaptured] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(ms);
      if (videoRef.current) videoRef.current.srcObject = ms;
    } catch {
      toast({ title: "Camera error", description: "Could not access camera.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if (open && !captured) startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Live quality analysis every 500ms
  useEffect(() => {
    if (!stream || captured) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.readyState < 2) return;
      const w = 100;
      const h = 100;
      const cv = previewCanvasRef.current ?? document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h).data;

      // Brightness — average luma
      let lumaSum = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        lumaSum += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
      }
      const avgLuma = lumaSum / (w * h);
      const brightness: QualityCheck["brightness"] = avgLuma < 60 ? "dark" : avgLuma > 220 ? "bright" : "ok";

      // Sharpness — variance of grayscale on 50x50 centre crop (rough proxy for Laplacian)
      let mean = 0;
      const samples: number[] = [];
      const cropStart = 25;
      const cropEnd = 75;
      for (let y = cropStart; y < cropEnd; y++) {
        for (let x = cropStart; x < cropEnd; x++) {
          const idx = (y * w + x) * 4;
          const g = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
          samples.push(g);
          mean += g;
        }
      }
      mean /= samples.length;
      let variance = 0;
      for (const s of samples) variance += (s - mean) * (s - mean);
      variance /= samples.length;
      const sharpness: QualityCheck["sharpness"] = variance > 250 ? "ok" : "blurry";

      // Subject size — count pixels in centre that differ enough from corner background
      const corner = (0.299 * imgData[0] + 0.587 * imgData[1] + 0.114 * imgData[2]);
      let subjectPixels = 0;
      const centreStart = 30;
      const centreEnd = 70;
      const centreArea = (centreEnd - centreStart) * (centreEnd - centreStart);
      for (let y = centreStart; y < centreEnd; y++) {
        for (let x = centreStart; x < centreEnd; x++) {
          const idx = (y * w + x) * 4;
          const g = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
          if (Math.abs(g - corner) > 25) subjectPixels++;
        }
      }
      const subjectRatio = subjectPixels / centreArea;
      const size: QualityCheck["size"] = subjectRatio < 0.08 ? "small" : subjectRatio > 0.85 ? "large" : "ok";

      const next = { brightness, sharpness, size };
      setQuality(next);

      const allOk = brightness === "ok" && sharpness === "ok" && size === "ok";
      setAllClearSince((prev) => {
        if (allOk) return prev ?? Date.now();
        return null;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [stream, captured]);

  // Continuous-clear gate (~600ms)
  useEffect(() => {
    if (!allClearSince) {
      setCanCapture(false);
      return;
    }
    const t = setTimeout(() => setCanCapture(true), 600);
    return () => clearTimeout(t);
  }, [allClearSince]);

  const guidance = (() => {
    if (quality.brightness === "dark") return { text: "Move to better light", icon: Sun };
    if (quality.brightness === "bright") return { text: "Reduce glare or move into softer light", icon: Sun };
    if (quality.sharpness === "blurry") return { text: "Hold steady — image is blurry", icon: Hand };
    if (quality.size === "small") return { text: "Move closer to the pill", icon: MoveHorizontal };
    if (quality.size === "large") return { text: "Move further away", icon: MoveHorizontal };
    return { text: "Looks great — tap Capture", icon: Check };
  })();

  const handleCapture = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 720;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (b) => {
        if (!b) return;
        setCaptured(b);
        setPreviewUrl(URL.createObjectURL(b));
        stream?.getTracks().forEach((t) => t.stop());
        setStream(null);
      },
      "image/jpeg",
      0.9,
    );
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCaptured(null);
    setAllClearSince(null);
    setCanCapture(false);
    startCamera();
  };

  const handleConfirm = async () => {
    if (!captured) return;
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ts = Date.now();
      const filePath = `pill-references/${user.id}/${prescriptionId}-${ts}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("patient-media")
        .upload(filePath, captured, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("patient-media").getPublicUrl(filePath);

      // Ask edge function to describe the pill
      let observedDescription = "";
      try {
        const { data } = await supabase.functions.invoke("validate-medication-video", {
          body: { mode: "baseline_capture", imageUrl: urlData.publicUrl, prescriptionId },
        });
        observedDescription = data?.observedDescription || "";
      } catch (e) {
        console.warn("baseline describe failed, saving without description", e);
      }

      // Upsert reference row (the edge function may already have written it; this guarantees a row exists)
      await supabase.from("prescription_pill_references").upsert(
        {
          prescription_id: prescriptionId,
          patient_id: patientId,
          reference_image_url: urlData.publicUrl,
          observed_description: observedDescription || null,
          medication_snapshot: medicationName,
          dosage_snapshot: dosage,
        },
        { onConflict: "prescription_id" },
      );

      toast({ title: "Reference saved", description: "We'll use this to verify future doses." });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setCaptured(null);
      onCaptured();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Could not save reference", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCaptured(null);
    setAllClearSince(null);
    setCanCapture(false);
    onClose();
  };

  const ringColor = canCapture ? "ring-green-500" : "ring-yellow-400/60";
  const GuidanceIcon = guidance.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" /> Capture pill reference photo
          </DialogTitle>
          <DialogDescription>
            One-time setup for <strong>{medicationName}</strong>. We'll use this photo to confirm future doses match.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black">
            {previewUrl ? (
              <img src={previewUrl} alt="Captured pill" className="w-full h-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            {/* Circular framing guide */}
            {!previewUrl && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`w-3/5 aspect-square rounded-full ring-4 ${ringColor} transition-colors duration-200`}
                />
              </div>
            )}
          </div>

          {!previewUrl && (
            <div
              className={
                "flex items-center gap-2 rounded-lg border p-2.5 text-sm " +
                (canCapture
                  ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
                  : "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400")
              }
            >
              <GuidanceIcon className="h-4 w-4 shrink-0" />
              <span>{guidance.text}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {previewUrl ? (
              <>
                <Button variant="outline" onClick={handleRetake} disabled={isUploading} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Retake
                </Button>
                <Button onClick={handleConfirm} disabled={isUploading} className="gap-2">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Use this photo
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={handleClose} className="gap-2">
                  <X className="h-4 w-4" /> Cancel
                </Button>
                <Button onClick={handleCapture} disabled={!canCapture} className="gap-2">
                  <Camera className="h-4 w-4" /> Capture
                </Button>
              </>
            )}
          </div>
        </div>
        <canvas ref={previewCanvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
