import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Loader2, RefreshCw, Check, X, Video, Square, Info, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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

type Step = "intro" | "method" | "record" | "processing";

const INTAKE_METHODS: { value: string; label: string; helper: string }[] = [
  { value: "swallow", label: "Swallow whole (with or without water)", helper: "Most tablets and capsules" },
  { value: "chew", label: "Chew", helper: "Chewable tablets" },
  { value: "crush", label: "Crush and mix", helper: "Crushed into food or water" },
  { value: "dissolve", label: "Dissolve in liquid", helper: "Dissolves in water before drinking" },
  { value: "gummy", label: "Gummy / soft chew", helper: "Vitamin gummies, soft pastilles" },
];

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [step, setStep] = useState<Step>("intro");
  const [intakeMethod, setIntakeMethod] = useState<string>("swallow");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(ms);
      if (videoRef.current) videoRef.current.srcObject = ms;
    } catch {
      toast({ title: "Camera error", description: "Could not access camera.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if (open && step === "record" && !recordedBlob) startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [stream]);

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => setRecordedBlob(new Blob(chunksRef.current, { type: "video/webm" }));
    mr.start();
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setCountdown(30);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          mr.stop();
          setIsRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Extract N evenly-spaced JPEG frames + the sharpest "tablet close-up" frame
  // from the early portion of the clip
  const extractFramesAndCloseup = async (
    blob: Blob,
    sequenceCount = 5,
  ): Promise<{ frames: Blob[]; closeup: Blob }> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      const cleanup = () => URL.revokeObjectURL(url);

      video.onloadedmetadata = async () => {
        const duration = isFinite(video.duration) && video.duration > 0 ? video.duration : 5;
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          cleanup();
          reject(new Error("Canvas context unavailable"));
          return;
        }

        const seekTo = (t: number) =>
          new Promise<void>((res) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              res();
            };
            video.addEventListener("seeked", onSeeked);
            video.currentTime = t;
          });

        const blobFromCanvas = (q: number) =>
          new Promise<Blob>((res, rej) =>
            canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", q),
          );

        const sharpnessScore = () => {
          const cw = 100;
          const ch = 100;
          const cx = (w - cw) / 2;
          const cy = (h - ch) / 2;
          const data = ctx.getImageData(cx, cy, cw, ch).data;
          let mean = 0;
          const samples: number[] = [];
          for (let i = 0; i < data.length; i += 4) {
            const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            samples.push(g);
            mean += g;
          }
          mean /= samples.length;
          let variance = 0;
          for (const s of samples) variance += (s - mean) * (s - mean);
          return variance / samples.length;
        };

        try {
          // Find sharpest frame in first 25% — this becomes the tablet close-up
          const earlyEnd = Math.max(duration * 0.25, 0.5);
          const earlySamples = 5;
          let bestFrame: Blob | null = null;
          let bestScore = -1;
          for (let i = 0; i < earlySamples; i++) {
            const t = (earlyEnd * (i + 1)) / (earlySamples + 1);
            await seekTo(Math.min(t, duration - 0.05));
            ctx.drawImage(video, 0, 0, w, h);
            const score = sharpnessScore();
            if (score > bestScore) {
              bestScore = score;
              bestFrame = await blobFromCanvas(0.9);
            }
          }
          if (!bestFrame) throw new Error("Could not extract close-up frame");

          // Sequence frames at 10/30/50/70/90%
          const fractions = Array.from(
            { length: sequenceCount },
            (_, i) => 0.1 + (i * 0.8) / Math.max(sequenceCount - 1, 1),
          );
          const frames: Blob[] = [];
          for (const f of fractions) {
            const t = Math.min(duration * f, Math.max(duration - 0.05, 0));
            await seekTo(t);
            ctx.drawImage(video, 0, 0, w, h);
            frames.push(await blobFromCanvas(0.85));
          }

          cleanup();
          resolve({ frames, closeup: bestFrame });
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      video.onerror = () => {
        cleanup();
        reject(new Error("Failed to load video for frame extraction"));
      };
    });
  };

  const handleProcess = async () => {
    if (!recordedBlob) return;
    setIsProcessing(true);
    setStep("processing");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { frames, closeup } = await extractFramesAndCloseup(recordedBlob, 5);

      const ts = Date.now();
      // Upload close-up still (kept) + sequence frames (deleted by edge fn after AI call)
      const closeupPath = `pill-references/${user.id}/${prescriptionId}-${ts}-tablet.jpg`;
      const { error: cuErr } = await supabase.storage
        .from("patient-media")
        .upload(closeupPath, closeup, { contentType: "image/jpeg", upsert: true });
      if (cuErr) throw cuErr;
      const { data: cuUrl } = supabase.storage.from("patient-media").getPublicUrl(closeupPath);

      const sequenceUploads = await Promise.all(
        frames.map(async (frame, i) => {
          const filePath = `pill-references/${user.id}/${prescriptionId}-${ts}-seq-${i}.jpg`;
          const { error } = await supabase.storage
            .from("patient-media")
            .upload(filePath, frame, { contentType: "image/jpeg", upsert: true });
          if (error) throw error;
          const { data: urlData } = supabase.storage.from("patient-media").getPublicUrl(filePath);
          return { url: urlData.publicUrl, path: filePath };
        }),
      );

      // Discard the video blob client-side — never written to storage
      setRecordedBlob(null);

      const { data, error } = await supabase.functions.invoke("validate-medication-video", {
        body: {
          mode: "baseline_capture",
          closeupImageUrl: cuUrl.publicUrl,
          sequenceImageUrls: sequenceUploads.map((u) => u.url),
          sequenceFilePaths: sequenceUploads.map((u) => u.path),
          intakeMethod,
          prescriptionId,
        },
      });
      if (error) throw error;

      // Safety net: ensure row exists with our chosen method even if function failed silently
      await supabase.from("prescription_pill_references").upsert(
        {
          prescription_id: prescriptionId,
          patient_id: patientId,
          reference_image_url: cuUrl.publicUrl,
          observed_description: data?.observedDescription || null,
          baseline_pattern_summary: data?.baselinePatternSummary || null,
          intake_method: intakeMethod,
          medication_snapshot: medicationName,
          dosage_snapshot: dosage,
        },
        { onConflict: "prescription_id" },
      );

      toast({
        title: "Baseline saved",
        description: "We'll use this routine to recognise your future doses.",
      });
      onCaptured();
      handleClose();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Could not save baseline",
        description: e.message || "Please try again.",
        variant: "destructive",
      });
      setStep("record");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setRecordedBlob(null);
    setCountdown(30);
    startCamera();
  };

  const handleClose = () => {
    stopCamera();
    setRecordedBlob(null);
    setIsRecording(false);
    setCountdown(30);
    setStep("intro");
    setIntakeMethod("swallow");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Set up <strong className="ml-1">{medicationName}</strong>
          </DialogTitle>
          <DialogDescription>
            One-time baseline so we can recognise your routine.
          </DialogDescription>
        </DialogHeader>

        {/* STEP: intro */}
        {step === "intro" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
              <p className="font-medium mb-1">We'll record your first dose as a baseline.</p>
              <p className="text-muted-foreground">
                This helps us recognise your routine over time. The video is{" "}
                <strong className="text-foreground">not stored</strong> — only a short text
                description and a snapshot of the tablet are kept.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button onClick={() => setStep("method")}>Next</Button>
            </div>
          </div>
        )}

        {/* STEP: intake method */}
        {step === "method" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">How will you take this medication?</h3>
              <RadioGroup value={intakeMethod} onValueChange={setIntakeMethod} className="gap-2">
                {INTAKE_METHODS.map((m) => (
                  <label
                    key={m.value}
                    htmlFor={`im-${m.value}`}
                    className={
                      "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors " +
                      (intakeMethod === m.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40")
                    }
                  >
                    <RadioGroupItem id={`im-${m.value}`} value={m.value} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium leading-tight">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.helper}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Most tablets and capsules should be swallowed whole. If you're unsure, check with
                your doctor or pharmacist before changing how you take this medicine.
              </p>
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep("intro")}>Back</Button>
              <Button onClick={() => setStep("record")}>Next</Button>
            </div>
          </div>
        )}

        {/* STEP: record */}
        {step === "record" && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              {recordedBlob ? (
                <video
                  src={URL.createObjectURL(recordedBlob)}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
              {isRecording && (
                <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                  REC {countdown}s
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground text-center italic">
              Your video isn't saved. We only keep a short text description and a single still of the tablet.
            </p>

            <div className="flex justify-between gap-2">
              {!recordedBlob ? (
                <>
                  <Button variant="ghost" onClick={() => setStep("method")} disabled={isRecording}>
                    Back
                  </Button>
                  {!isRecording ? (
                    <Button onClick={startRecording} disabled={!stream} className="gap-2">
                      <Video className="h-4 w-4" /> Start recording
                    </Button>
                  ) : (
                    <Button onClick={stopRecording} variant="destructive" className="gap-2">
                      <Square className="h-4 w-4" /> Stop
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleRetake} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Retake
                  </Button>
                  <Button onClick={handleProcess} disabled={isProcessing} className="gap-2">
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Use this baseline
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP: processing */}
        {step === "processing" && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">
              Saving your baseline and learning your routine...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
