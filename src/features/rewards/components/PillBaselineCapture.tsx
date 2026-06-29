import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Loader2, RefreshCw, Check, Video, Square, Info, Pill, Package, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { mapCameraError } from "@/lib/cameraErrors";



interface PillBaselineCaptureProps {
  open: boolean;
  onClose: () => void;
  onCaptured: () => void;
  prescriptionId: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  quantity?: number;
}

type Step = "intro" | "method" | "packaging" | "tablet" | "ingest" | "processing";

const INTAKE_METHODS: { value: string; label: string; helper: string }[] = [
  { value: "swallow", label: "Swallow whole (with or without water)", helper: "Most tablets and capsules" },
  { value: "chew", label: "Chew", helper: "Chewable tablets" },
  { value: "crush", label: "Crush and mix", helper: "Crushed into food or water" },
  { value: "dissolve", label: "Dissolve in liquid", helper: "Dissolves in water before drinking" },
  { value: "gummy", label: "Gummy / soft chew", helper: "Vitamin gummies, soft pastilles" },
];

const INGEST_SECONDS = 15;

export function PillBaselineCapture({
  open,
  onClose,
  onCaptured,
  prescriptionId,
  patientId,
  medicationName,
  dosage,
  quantity = 1,
}: PillBaselineCaptureProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [step, setStep] = useState<Step>("intro");
  const [intakeMethod, setIntakeMethod] = useState<string>("swallow");
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Skip-notify (who to alert if this medication is missed)
  const [skipNotifyTarget, setSkipNotifyTarget] = useState<"emergency" | "nok" | "none">("emergency");
  const [patientContacts, setPatientContacts] = useState<{
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    next_of_kin_name: string | null;
    next_of_kin_phone: string | null;
  } | null>(null);
  const [overrideContact, setOverrideContact] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // Load patient emergency/NOK contacts when dialog opens
  useEffect(() => {
    if (!open || !patientId) return;
    (async () => {
      const { data } = await supabase
        .from("patients")
        .select("emergency_contact_name, emergency_contact_phone, next_of_kin_name, next_of_kin_phone")
        .eq("id", patientId)
        .maybeSingle();
      if (data) setPatientContacts(data as any);
    })();
  }, [open, patientId]);


  // Stills (packaging + tablet close-up)
  const [packagingBlob, setPackagingBlob] = useState<Blob | null>(null);
  const [tabletBlob, setTabletBlob] = useState<Blob | null>(null);
  const [tabletWarning, setTabletWarning] = useState<string | null>(null);
  const [checkingMarkings, setCheckingMarkings] = useState(false);

  // Ingestion video
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(INGEST_SECONDS);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedMime, setRecordedMime] = useState<string>("video/webm");

  const [isProcessing, setIsProcessing] = useState(false);

  // Manage replay object URL lifecycle
  useEffect(() => {
    if (!recordedBlob) { setRecordedUrl(null); return; }
    const url = URL.createObjectURL(recordedBlob);
    setRecordedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recordedBlob]);

  // Pick the best supported MediaRecorder mime type
  const pickRecorderMime = (): string | undefined => {
    const candidates = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && (MediaRecorder as any).isTypeSupported?.(c)) return c;
    }
    return undefined;
  };

  // ----- Camera lifecycle -----
  // packaging + tablet steps use rear camera; ingest uses front
  const desiredFacing = step === "ingest" ? "user" : "environment";

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    try {
      // Stop any current stream first to free the device
      stream?.getTracks().forEach((t) => t.stop());
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(ms);
      if (videoRef.current) videoRef.current.srcObject = ms;
    } catch (err) {
      const friendly = mapCameraError(err);
      toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [stream]);

  // (Re)start camera whenever we enter a capture step and we don't already have a captured asset
  useEffect(() => {
    if (!open) return;
    if (step === "packaging" && !packagingBlob) startCamera("environment");
    else if (step === "tablet" && !tabletBlob) startCamera("environment");
    else if (step === "ingest" && !recordedBlob) startCamera("user");
    return () => {
      // only stop on unmount / dialog close — handled in handleClose
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  // Capture a still from the live preview
  const captureStill = async (): Promise<Blob | null> => {
    if (!videoRef.current || !stream) return null;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    return new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.9),
    );
  };

  const handleCapturePackaging = async () => {
    const b = await captureStill();
    if (b) {
      setPackagingBlob(b);
      stream?.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  const handleCaptureTablet = async () => {
    const b = await captureStill();
    if (!b) return;
    setTabletBlob(b);
    setTabletWarning(null);
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);

    // Quick AI sanity check that pill markings are visible (skip for gummy/dissolve)
    if (intakeMethod === "gummy" || intakeMethod === "dissolve") return;
    try {
      setCheckingMarkings(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ts = Date.now();
      const path = `pill-references/${user.id}/${prescriptionId}-${ts}-marking-check.jpg`;
      const { error: upErr } = await supabase.storage.from("patient-media").upload(path, b, { contentType: "image/jpeg", upsert: true });
      if (upErr) return;
      const { data: urlData } = supabase.storage.from("patient-media").getPublicUrl(path);
      const { data } = await supabase.functions.invoke("validate-medication-video", {
        body: { mode: "baseline_tablet_check", imageUrl: urlData.publicUrl, expectedQuantity: quantity },
      });
      // Best-effort cleanup of the marking-check still
      supabase.storage.from("patient-media").remove([path]).catch(() => {});
      if (data && data.markingsVisible === false) {
        setTabletWarning(data.suggestion || "We can't see any printed letters, numbers or score lines. Try flipping the tablet and retaking.");
      }
    } catch (e) {
      console.error("markings check failed", e);
    } finally {
      setCheckingMarkings(false);
    }
  };

  // ----- Ingestion video recorder -----
  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const mime = pickRecorderMime();
    const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const finalMime = mr.mimeType || mime || "video/webm";
    setRecordedMime(finalMime);
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => setRecordedBlob(new Blob(chunksRef.current, { type: finalMime }));
    mr.start();
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setCountdown(INGEST_SECONDS);
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

  // Extract N evenly-spaced JPEG frames from the ingest clip
  const extractFrames = async (blob: Blob, count = 5): Promise<Blob[]> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const v = document.createElement("video");
      v.src = url;
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      const cleanup = () => URL.revokeObjectURL(url);

      v.onloadedmetadata = async () => {
        const duration = isFinite(v.duration) && v.duration > 0 ? v.duration : INGEST_SECONDS;
        const w = v.videoWidth || 640;
        const h = v.videoHeight || 480;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { cleanup(); reject(new Error("Canvas context unavailable")); return; }

        const seekTo = (t: number) =>
          new Promise<void>((res) => {
            const onSeeked = () => {
              v.removeEventListener("seeked", onSeeked);
              res();
            };
            v.addEventListener("seeked", onSeeked);
            v.currentTime = t;
          });

        const blobFromCanvas = (q: number) =>
          new Promise<Blob>((res, rej) =>
            canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", q),
          );

        try {
          const fractions = Array.from(
            { length: count },
            (_, i) => 0.1 + (i * 0.8) / Math.max(count - 1, 1),
          );
          const frames: Blob[] = [];
          for (const f of fractions) {
            const t = Math.min(duration * f, Math.max(duration - 0.05, 0));
            await seekTo(t);
            ctx.drawImage(v, 0, 0, w, h);
            frames.push(await blobFromCanvas(0.85));
          }
          cleanup();
          resolve(frames);
        } catch (err) {
          cleanup();
          reject(err);
        }
      };
      v.onerror = () => { cleanup(); reject(new Error("Failed to load video for frame extraction")); };
    });
  };

  // ----- Final upload + edge function -----
  const handleProcess = async () => {
    if (!packagingBlob || !tabletBlob || !recordedBlob) return;
    setIsProcessing(true);
    setStep("processing");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ts = Date.now();

      // 1) Packaging still
      const packPath = `pill-references/${user.id}/${prescriptionId}-${ts}-pack.jpg`;
      const { error: packErr } = await supabase.storage
        .from("patient-media")
        .upload(packPath, packagingBlob, { contentType: "image/jpeg", upsert: true });
      if (packErr) throw packErr;
      const { data: packUrl } = supabase.storage.from("patient-media").getPublicUrl(packPath);

      // 2) Tablet close-up still
      const tabletPath = `pill-references/${user.id}/${prescriptionId}-${ts}-tablet.jpg`;
      const { error: tabErr } = await supabase.storage
        .from("patient-media")
        .upload(tabletPath, tabletBlob, { contentType: "image/jpeg", upsert: true });
      if (tabErr) throw tabErr;
      const { data: tabletUrl } = supabase.storage.from("patient-media").getPublicUrl(tabletPath);

      // 3) Sequence frames extracted from the ingest video
      const frames = await extractFrames(recordedBlob, 5);
      const sequenceUploads = await Promise.all(
        frames.map(async (frame, i) => {
          const filePath = `pill-references/${user.id}/${prescriptionId}-${ts}-seq-${i}.jpg`;
          const { error } = await supabase.storage
            .from("patient-media")
            .upload(filePath, frame, { contentType: "image/jpeg", upsert: false });
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
          packagingImageUrl: packUrl.publicUrl,
          closeupImageUrl: tabletUrl.publicUrl,
          sequenceImageUrls: sequenceUploads.map((u) => u.url),
          sequenceFilePaths: sequenceUploads.map((u) => u.path),
          intakeMethod,
          prescriptionId,
          expectedMedication: medicationName,
          expectedDosage: dosage,
          expectedQuantity: quantity,
        },
      });
      if (error) throw error;

      // Safety net — ensure row exists with our chosen artefacts even if function failed silently
      await supabase.from("prescription_pill_references").upsert(
        {
          prescription_id: prescriptionId,
          patient_id: patientId,
          reference_image_url: tabletUrl.publicUrl,
          packaging_image_url: packUrl.publicUrl,
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

      // Soft warning if AI couldn't match the packaging
      if (data?.packagingMatch && data.packagingMatch.ok === false && data.packagingMatch.message) {
        toast({
          title: "Packaging looks different",
          description: data.packagingMatch.message,
        });
      }

      onCaptured();
      handleClose();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Could not save baseline",
        description: e.message || "Please try again.",
        variant: "destructive",
      });
      setStep("ingest");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setPackagingBlob(null);
    setTabletBlob(null);
    setRecordedBlob(null);
    setIsRecording(false);
    setCountdown(INGEST_SECONDS);
    setStep("intro");
    setIntakeMethod("swallow");
    onClose();
  };

  // Step indicator
  const StepDot = ({ active, label, n }: { active: boolean; label: string; n: number }) => (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {n}
      </span>
      <span className={cn("text-[11px]", active ? "text-foreground font-medium" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );

  const stepIndex = step === "packaging" ? 1 : step === "tablet" ? 2 : step === "ingest" ? 3 : 0;
  const showStepIndicator = step === "packaging" || step === "tablet" || step === "ingest";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Teach the app how you take <strong className="ml-1">{medicationName}</strong>
          </DialogTitle>
          <DialogDescription>
            A <strong>baseline</strong> is a quick one-time setup. Show us the packet, the tablet, and how you take it.
            From then on the app recognises your routine and you only need a short daily clip to earn your Vula reward —
            you won't have to do this setup again.
          </DialogDescription>
        </DialogHeader>


        {showStepIndicator && (
          <div className="flex items-center justify-between gap-2 px-1">
            <StepDot n={1} label="Packaging" active={stepIndex === 1} />
            <span className="h-px flex-1 bg-border" />
            <StepDot n={2} label="Tablet" active={stepIndex === 2} />
            <span className="h-px flex-1 bg-border" />
            <StepDot n={3} label="Take it" active={stepIndex === 3} />
          </div>
        )}

        {/* STEP: intro */}
        {step === "intro" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-teal-500/40 bg-teal-50/60 p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold text-foreground mb-1.5">
                <Info className="h-4 w-4 text-teal-600" />
                What is a baseline?
              </p>
              <p className="text-muted-foreground leading-relaxed mb-2">
                A baseline is a one-time recording that teaches our AI what <strong className="text-foreground">your
                medication</strong> looks like and <strong className="text-foreground">how you take it</strong>. After
                this setup we'll recognise your tablet and your routine automatically — every future dose is just a
                quick check-in.
              </p>
              <ul className="text-muted-foreground list-disc list-inside space-y-0.5 text-xs">
                <li>Helps the AI learn what your medication looks like.</li>
                <li>Confirms the right tablet is being taken.</li>
                <li>Done once per medication — never repeated.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
              <p className="font-medium mb-1">Three quick steps</p>
              <ol className="text-muted-foreground list-decimal list-inside space-y-1">
                <li>A photo of the <strong className="text-foreground">packaging</strong> (box, blister or label)</li>
                <li>A photo of the <strong className="text-foreground">tablet</strong> on your palm or a flat surface</li>
                <li>A short video of you <strong className="text-foreground">taking the dose</strong> ({INGEST_SECONDS}s, not stored)</li>
              </ol>
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
              <Button onClick={() => setStep("packaging")}>Next</Button>
            </div>
          </div>
        )}

        {/* STEP: packaging still */}
        {step === "packaging" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Package className="h-4 w-4 text-primary" />
              Hold the box or blister so the medicine name and strength are readable.
            </div>
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              {packagingBlob ? (
                <img
                  src={URL.createObjectURL(packagingBlob)}
                  alt="Packaging preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex justify-between gap-2">
              {!packagingBlob ? (
                <>
                  <Button variant="ghost" onClick={() => setStep("method")}>Back</Button>
                  <Button onClick={handleCapturePackaging} disabled={!stream} className="gap-2">
                    <Camera className="h-4 w-4" /> Capture
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => { setPackagingBlob(null); startCamera("environment"); }} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Retake
                  </Button>
                  <Button onClick={() => setStep("tablet")} className="gap-2">
                    <Check className="h-4 w-4" /> Use photo
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP: tablet close-up */}
        {step === "tablet" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Pill className="h-4 w-4 text-primary" />
              {quantity > 1
                ? `Show all ${quantity} tablets together with any printed letters, numbers or score lines facing the camera.`
                : "Place the tablet on your palm and turn it so any printed letters, numbers or score lines are clearly visible."}
            </div>
            {quantity > 1 && (
              <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                Show {quantity} tablets
              </div>
            )}
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              {tabletBlob ? (
                <img
                  src={URL.createObjectURL(tabletBlob)}
                  alt="Tablet preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              )}
            </div>
            {tabletBlob && tabletWarning && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{tabletWarning}</p>
              </div>
            )}
            <div className="flex justify-between gap-2">
              {!tabletBlob ? (
                <>
                  <Button variant="ghost" onClick={() => setStep("packaging")}>Back</Button>
                  <Button onClick={handleCaptureTablet} disabled={!stream} className="gap-2">
                    <Camera className="h-4 w-4" /> Capture
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => { setTabletBlob(null); setTabletWarning(null); startCamera("environment"); }} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Retake
                  </Button>
                  <Button onClick={() => setStep("ingest")} disabled={checkingMarkings} className="gap-2">
                    <Check className="h-4 w-4" /> {tabletWarning ? "Use anyway" : "Use photo"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP: ingest video */}
        {step === "ingest" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Video className="h-4 w-4 text-primary" />
              Record yourself taking the dose. {INGEST_SECONDS} seconds, front camera. Video isn't saved.
            </div>
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              {recordedBlob && recordedUrl ? (
                <video
                  src={recordedUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain bg-black"
                  onError={() =>
                    toast({
                      title: "Replay not supported on this device",
                      description: "Don't worry — your baseline will still be processed.",
                    })
                  }
                />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
              )}
              {isRecording && (
                <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                  REC {countdown}s
                </div>
              )}
            </div>
            <div className="flex justify-between gap-2">
              {!recordedBlob ? (
                <>
                  <Button variant="ghost" onClick={() => setStep("tablet")} disabled={isRecording}>Back</Button>
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
                  <Button
                    variant="outline"
                    onClick={() => { setRecordedBlob(null); setCountdown(INGEST_SECONDS); startCamera("user"); }}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" /> Retake
                  </Button>
                  <Button onClick={handleProcess} disabled={isProcessing} className="gap-2">
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save baseline
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
