import { useState, useRef, useCallback, useEffect } from "react";
import { Wallet as Pill, Video, Flame, Check, Clock, AlertCircle, Loader2, Square, Camera, RefreshCw, Sparkles, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { SuccessCelebration } from "./SuccessCelebration";
import { PillBaselineCapture } from "./PillBaselineCapture";

type Stage = "pill_check" | "ingestion";

interface PillCheckResult {
  isPillVisible: boolean;
  isMatch: boolean;
  matchReason: string;
  observedDescription?: string;
  detectedCount?: number;
  expectedCount?: number;
}

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  status: string;
  quantity_per_dose?: number | null;
}

// Pick the best supported MediaRecorder mime type for cross-browser playback
function pickRecorderMime(): string | undefined {
  const candidates = [
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && (MediaRecorder as any).isTypeSupported?.(c)) return c;
  }
  return undefined;
}

// Parse "2 tablets", "two capsules", "1 tab", etc. Returns 1 if not parseable.
function parseQuantity(dosage?: string | null, fallback = 1): number {
  if (!dosage) return fallback;
  const s = dosage.toLowerCase();
  const num = s.match(/(\d+)\s*(tab|tabs|tablet|tablets|cap|caps|capsule|capsules|pill|pills|x)/);
  if (num) return Math.max(1, parseInt(num[1], 10));
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
  for (const [w, n] of Object.entries(words)) {
    if (new RegExp(`\\b${w}\\b\\s*(tab|cap|pill)`).test(s)) return n;
  }
  return fallback;
}

interface AdherenceRecord {
  id: string;
  prescription_id: string;
  scheduled_date: string;
  status: string;
  taken_at: string | null;
  proof_url: string | null;
  confidence_score: number | null;
  auto_approved_at: string | null;
}

interface PillReference {
  prescription_id: string;
  intake_method: string | null;
  baseline_pattern_summary: string | null;
  observed_description: string | null;
  reference_image_url: string | null;
  packaging_image_url: string | null;
  updated_at: string;
}

interface MedicationAdherenceTabProps {
  patientId: string;
  focusRxId?: string | null;
  onFocusHandled?: () => void;
}

export function MedicationAdherenceTab({ patientId, focusRxId, onFocusHandled }: MedicationAdherenceTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recordingPrescriptionId, setRecordingPrescriptionId] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("pill_check");
  const [pillCheckResult, setPillCheckResult] = useState<PillCheckResult | null>(null);
  const [isCheckingPill, setIsCheckingPill] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedMime, setRecordedMime] = useState<string>("video/webm");
  const [isUploading, setIsUploading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [celebration, setCelebration] = useState<{ open: boolean; vulasEarned: number; streak: number; medicationName: string }>({
    open: false, vulasEarned: 0, streak: 0, medicationName: "",
  });
  const [baselineCapture, setBaselineCapture] = useState<{ open: boolean; rxId: string; medication: string; dosage: string }>({
    open: false, rxId: "", medication: "", dosage: "",
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");


  // Manage replay object URL: create when blob set, revoke when replaced/unmounted
  useEffect(() => {
    if (!recordedBlob) {
      setRecordedUrl(null);
      return;
    }
    const url = URL.createObjectURL(recordedBlob);
    setRecordedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recordedBlob]);

  const { data: prescriptions = [], isLoading: prescriptionsLoading } = useQuery({
    queryKey: ["chronic-prescriptions", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("id, medication, dosage, frequency, status, quantity_per_dose")
        .eq("patient_id", patientId)
        .eq("status", "active");
      if (error) throw error;
      return (data || []) as Prescription[];
    },
  });

  // Detect chronic meds in patient profile that haven't been synced into prescriptions yet
  // (typically because the patient has no connected doctor to attribute prescriptions to).
  const { data: profileChronicState } = useQuery({
    queryKey: ["profile-chronic-state", patientId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { hasUnsyncedChronic: false };
      const { data: patient } = await supabase
        .from("patients")
        .select("current_medications, patient_user_id")
        .eq("id", patientId)
        .maybeSingle();
      const meds = Array.isArray(patient?.current_medications)
        ? (patient!.current_medications as any[])
        : [];
      const chronicCount = meds.filter((m) => m?.is_chronic && (m?.name || "").trim()).length;
      if (chronicCount === 0) return { hasUnsyncedChronic: false };
      // Check if patient has any active doctor connection
      const { data: access } = await supabase
        .from("doctor_patient_access")
        .select("doctor_id")
        .eq("patient_user_id", patient?.patient_user_id || user.id)
        .eq("is_active", true)
        .limit(1);
      const hasDoctor = (access?.length ?? 0) > 0;
      return { hasUnsyncedChronic: !hasDoctor && chronicCount > 0 };
    },
  });

  // Fetch adherence records for last 30 days
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const { data: adherenceRecords = [], isLoading: adherenceLoading } = useQuery({
    queryKey: ["medication-adherence", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_adherence")
        .select("*")
        .eq("patient_id", patientId)
        .gte("scheduled_date", thirtyDaysAgo)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return (data || []) as AdherenceRecord[];
    },
  });

  // Fetch pill references for these prescriptions
  const { data: pillReferences = [] } = useQuery({
    queryKey: ["pill-references", patientId, prescriptions.map((p) => p.id).join(",")],
    queryFn: async () => {
      if (prescriptions.length === 0) return [] as PillReference[];
      const { data, error } = await supabase
        .from("prescription_pill_references")
        .select("prescription_id, intake_method, baseline_pattern_summary, observed_description, reference_image_url, packaging_image_url, updated_at")
        .in("prescription_id", prescriptions.map((p) => p.id));
      if (error) throw error;
      return (data || []) as PillReference[];
    },
    enabled: prescriptions.length > 0,
  });

  const getReference = (rxId: string) => pillReferences.find((r) => r.prescription_id === rxId);
  const needsBaseline = (rxId: string) => {
    const ref = getReference(rxId);
    return !ref || !ref.intake_method || !ref.baseline_pattern_summary || !ref.reference_image_url;
  };


  // Auto-create today's pending records
  useEffect(() => {
    if (prescriptions.length === 0) return;
    const createTodayRecords = async () => {
      for (const rx of prescriptions) {
        const exists = adherenceRecords.some(
          (r) => r.prescription_id === rx.id && r.scheduled_date === today
        );
        if (!exists) {
          await supabase.from("medication_adherence").insert({
            patient_id: patientId,
            prescription_id: rx.id,
            scheduled_date: today,
            status: "pending",
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["medication-adherence", patientId] });
    };
    createTodayRecords();
  }, [prescriptions.length, today]);

  // Skipped/missed doses no longer notify doctors — only the patient and their
  // emergency contacts / next of kin are notified (see check-missed-medications
  // edge function), based on the patient's own preference.


  // Honour ?focus={rxId} from the Overview "Take Medication" button:
  // scroll the matching card into view and auto-open the recorder/baseline.
  useEffect(() => {
    if (!focusRxId || prescriptions.length === 0) return;
    const rx = prescriptions.find((p) => p.id === focusRxId);
    if (!rx) return;
    const el = document.getElementById(`rx-card-${focusRxId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Defer trigger so the card scroll completes first
    const t = setTimeout(() => {
      const todayRecord = adherenceRecords.find(
        (r) => r.prescription_id === focusRxId && r.scheduled_date === today,
      );
      if (todayRecord && todayRecord.status !== "pending") {
        // already done — just leave the card focused
      } else if (needsBaseline(focusRxId)) {
        setBaselineCapture({ open: true, rxId: rx.id, medication: rx.medication, dosage: rx.dosage });
      } else {
        setRecordingPrescriptionId(rx.id);
      }
      onFocusHandled?.();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRxId, prescriptions.length, pillReferences.length, adherenceRecords.length]);

  // Calculate streak for a prescription
  const getStreak = (prescriptionId: string) => {
    const records = adherenceRecords
      .filter((r) => r.prescription_id === prescriptionId && r.status === "completed")
      .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
    if (records.length === 0) return 0;
    let streak = 0;
    let checkDate = new Date();
    // If today isn't completed yet, start from yesterday
    const todayCompleted = records.some((r) => r.scheduled_date === today);
    if (!todayCompleted) checkDate = subDays(checkDate, 1);
    
    for (let i = 0; i < 365; i++) {
      const dateStr = format(checkDate, "yyyy-MM-dd");
      const found = records.some((r) => r.scheduled_date === dateStr);
      if (found) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else break;
    }
    return streak;
  };

  const getTodayStatus = (prescriptionId: string) => {
    const record = adherenceRecords.find(
      (r) => r.prescription_id === prescriptionId && r.scheduled_date === today
    );
    return record?.status || "pending";
  };

  // Camera functions
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch {
      toast({ title: "Camera Error", description: "Could not access camera.", variant: "destructive" });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [stream]);

  useEffect(() => {
    if (recordingPrescriptionId) startCamera();
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, [recordingPrescriptionId]);

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
    setCountdown(30);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { mr.stop(); setIsRecording(false); if (timerRef.current) clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Extract N evenly-spaced JPEG frames from the recorded webm blob
  const extractFrames = async (blob: Blob, count = 5): Promise<Blob[]> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      const frames: Blob[] = [];

      const cleanup = () => URL.revokeObjectURL(url);

      video.onloadedmetadata = async () => {
        const duration = isFinite(video.duration) && video.duration > 0 ? video.duration : 5;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          reject(new Error("Canvas context unavailable"));
          return;
        }

        // Sample at 10%, 30%, 50%, 70%, 90%
        const fractions = Array.from({ length: count }, (_, i) => 0.1 + (i * 0.8) / Math.max(count - 1, 1));

        try {
          for (const f of fractions) {
            const t = Math.min(duration * f, Math.max(duration - 0.05, 0));
            await new Promise<void>((res) => {
              const onSeeked = () => {
                video.removeEventListener("seeked", onSeeked);
                res();
              };
              video.addEventListener("seeked", onSeeked);
              video.currentTime = t;
            });
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frameBlob: Blob = await new Promise((res, rej) =>
              canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.85)
            );
            frames.push(frameBlob);
          }
          cleanup();
          resolve(frames);
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

  // STAGE 1 — Capture a single still and verify the pill matches the prescription
  const capturePillImage = async () => {
    if (!stream || !videoRef.current || !recordingPrescriptionId) return;
    setIsCheckingPill(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.85)
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ts = Date.now();
      const filePath = `medication-proof/${user.id}/${ts}-pill.jpg`;
      const { error: upErr } = await supabase.storage
        .from("patient-media")
        .upload(filePath, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("patient-media").getPublicUrl(filePath);

      const rxForCheck = prescriptions.find((p) => p.id === recordingPrescriptionId);
      const expectedQuantity = Math.max(
        1,
        Number(rxForCheck?.quantity_per_dose) || parseQuantity(rxForCheck?.dosage),
      );

      const { data, error: fnError } = await supabase.functions.invoke("validate-medication-video", {
        body: {
          mode: "pill_check",
          imageUrl: urlData.publicUrl,
          prescriptionId: recordingPrescriptionId,
          expectedQuantity,
        },
      });
      if (fnError) throw fnError;

      // Best-effort cleanup of the pill image
      supabase.storage.from("patient-media").remove([filePath]).catch(() => {});

      const result: PillCheckResult = {
        isPillVisible: !!data?.isPillVisible,
        isMatch: !!data?.isMatch,
        matchReason: data?.matchReason || "",
        observedDescription: data?.observedDescription,
        detectedCount: typeof data?.detectedTabletCount === "number" ? data.detectedTabletCount : undefined,
        expectedCount: expectedQuantity,
      };
      setPillCheckResult(result);
    } catch (e: any) {
      console.error("pill check error", e);
      toast({ title: "Pill check failed", description: e.message || "Could not analyse the image.", variant: "destructive" });
    } finally {
      setIsCheckingPill(false);
    }
  };

  const proceedToIngestion = () => {
    if (!pillCheckResult?.isMatch) return;
    setPillCheckResult(null);
    setStage("ingestion");
  };

  const retryPillCheck = () => {
    setPillCheckResult(null);
  };

  const handleSubmitProof = async () => {
    if (!recordedBlob || !recordingPrescriptionId) return;

    // Check 5MB limit
    if (recordedBlob.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Recording must be under 5MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Extract still JPEG frames client-side (Gemini accepts only image formats)
      const frames = await extractFrames(recordedBlob, 5);
      if (frames.length === 0) throw new Error("Could not extract frames from recording");

      // 2. Upload frames in parallel
      const ts = Date.now();
      const uploads = await Promise.all(
        frames.map(async (frame, i) => {
          const filePath = `medication-proof/${user.id}/${ts}-frame-${i}.jpg`;
          const { error } = await supabase.storage
            .from("patient-media")
            .upload(filePath, frame, { contentType: "image/jpeg" });
          if (error) throw error;
          const { data: urlData } = supabase.storage.from("patient-media").getPublicUrl(filePath);
          return { url: urlData.publicUrl, path: filePath };
        })
      );
      const imageUrls = uploads.map((u) => u.url);
      const filePaths = uploads.map((u) => u.path);

      // 3. Call AI validation edge function
      const rxObj = prescriptions.find((p) => p.id === recordingPrescriptionId);
      const rxName = rxObj?.medication || "";
      const expectedQuantity = Math.max(1, Number(rxObj?.quantity_per_dose) || parseQuantity(rxObj?.dosage));
      const { data, error: fnError } = await supabase.functions.invoke(
        "validate-medication-video",
        {
          body: {
            imageUrls,
            filePaths,
            prescriptionId: recordingPrescriptionId,
            patientId,
            expectedQuantity,
            tabletTotal: expectedQuantity,
            tabletIndex: expectedQuantity,
          },
        }
      );

      if (fnError) throw fnError;

      const validation = data?.validation;

      if (validation?.isValid) {
        const earnedStreak = data?.streak ?? 0;
        handleCloseRecording();
        queryClient.invalidateQueries({ queryKey: ["medication-adherence", patientId] });
        queryClient.invalidateQueries({ queryKey: ["my-rewards"] });
        setCelebration({ open: true, vulasEarned: data?.molesAwarded ?? 5, streak: earnedStreak, medicationName: rxName });
      } else if (data?.provisional) {
        toast({
          title: `Confidence ${Math.round(data.confidence ?? 0)}% — provisional`,
          description: "Vulas added now. We'll confirm at month-end if your monthly average stays above 50%.",
        });
        handleCloseRecording();
        queryClient.invalidateQueries({ queryKey: ["medication-adherence", patientId] });
        queryClient.invalidateQueries({ queryKey: ["my-rewards"] });
      } else if (data?.fallback) {
        toast({
          title: "Recorded for end-of-month review",
          description: "We couldn't fully verify how you took your medication. It will be reviewed automatically at month-end.",
        });
        handleCloseRecording();
        queryClient.invalidateQueries({ queryKey: ["medication-adherence", patientId] });
      } else {
        const reason = validation?.description || "Could not confirm medication ingestion.";
        toast({
          title: "Verification failed",
          description: `${reason} Your medication intake was logged but not auto-confirmed — please contact your doctor if this was an error.`,
          variant: "destructive",
        });
        handleCloseRecording();
        queryClient.invalidateQueries({ queryKey: ["medication-adherence", patientId] });
      }

    } catch (error: any) {
      console.error(error);
      toast({ title: "Validation failed", description: error.message || "Could not validate proof.", variant: "destructive" });
    }
    setIsUploading(false);
  };

  const handleCloseRecording = () => {
    stopCamera();
    setRecordingPrescriptionId(null);
    setRecordedBlob(null);
    setIsRecording(false);
    setCountdown(30);
    setStage("pill_check");
    setPillCheckResult(null);
    setIsCheckingPill(false);
  };


  if (prescriptionsLoading || adherenceLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Pill className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No active chronic prescriptions found.</p>
          {profileChronicState?.hasUnsyncedChronic ? (
            <>
              <p className="text-sm text-muted-foreground mt-1">
                Some of your chronic meds aren't tracked yet — add your doctor under My Healthcare so we can set up baseline capture.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => { window.location.href = "/patient/details?section=care"; }}
              >
                Add my doctor
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">When your doctor prescribes chronic medication, it will appear here for daily tracking.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Daily Medication Tracker
          </CardTitle>
          <CardDescription>
            Film yourself taking each medication daily to earn Vulas and build streaks
          </CardDescription>
        </CardHeader>
      </Card>

      {prescriptions.map((rx) => {
        const todayStatus = getTodayStatus(rx.id);
        const streak = getStreak(rx.id);
        const completedDays = adherenceRecords.filter(
          (r) => r.prescription_id === rx.id && r.status === "completed"
        ).length;
        const totalDays = adherenceRecords.filter(
          (r) => r.prescription_id === rx.id
        ).length;
        const adherenceRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

        return (
          <Card key={rx.id} id={`rx-card-${rx.id}`} className={todayStatus === "completed" ? "border-primary/40" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{rx.medication}</h3>
                    {todayStatus === "completed" ? (
                      <Badge className="bg-sky-500/15 text-primary dark:text-primary border-primary/40">
                        <Check className="h-4 w-4 mr-1" /> Taken Today
                      </Badge>
                    ) : todayStatus === "missed" ? (
                      <Badge variant="destructive">
                        <AlertCircle className="h-4 w-4 mr-1" /> Missed
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="h-4 w-4 mr-1" /> Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{rx.dosage?.trim() || "—"} • {rx.frequency?.trim() || "once daily"}</p>

                  {(() => {
                    const ref = getReference(rx.id);
                    if (!ref || needsBaseline(rx.id)) return null;
                    const methodLabel = ref.intake_method ? `${ref.intake_method}-method` : "";
                    const captured = ref.updated_at ? format(new Date(ref.updated_at), "MMM d, yyyy") : "";
                    return (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          {ref.packaging_image_url && (
                            <img
                              src={ref.packaging_image_url}
                              alt="Packaging reference"
                              className="h-10 w-10 rounded-md object-cover border border-border"
                            />
                          )}
                          {ref.reference_image_url && (
                            <img
                              src={ref.reference_image_url}
                              alt="Tablet reference"
                              className="h-10 w-10 rounded-md object-cover border border-border"
                            />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Reference: {ref.observed_description?.split(/[,.]/)[0] || "tablet"}
                          {methodLabel ? ` · ${methodLabel}` : ""}
                          {captured ? ` · captured ${captured}` : ""}
                          {" · "}
                          <button
                            type="button"
                            className="underline hover:text-foreground"
                            onClick={() => setBaselineCapture({ open: true, rxId: rx.id, medication: rx.medication, dosage: rx.dosage })}
                          >
                            Recapture reference
                          </button>
                        </p>
                      </div>
                    );
                  })()}

                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">{streak}-day streak</span>
                    </div>
                    <div className="flex-1 max-w-[200px]">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Adherence</span>
                        <span>{adherenceRate}%</span>
                      </div>
                      <Progress value={adherenceRate} className="h-2" />
                    </div>
                  </div>
                </div>

                {todayStatus === "pending" && (
                  needsBaseline(rx.id) ? (
                    <Button
                      onClick={() => setBaselineCapture({ open: true, rxId: rx.id, medication: rx.medication, dosage: rx.dosage })}
                      variant="outline"
                      className="gap-2 shrink-0"
                    >
                      <Camera className="h-4 w-4" />
                      Set up baseline
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setRecordingPrescriptionId(rx.id)}
                      className="gap-2 shrink-0"
                    >
                      <Video className="h-4 w-4" />
                      Take Medication
                    </Button>
                  )
                )}
                {todayStatus === "provisional" && (
                  <Badge variant="secondary" className="shrink-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
                    <Sparkles className="h-4 w-4 mr-1" /> Provisional
                  </Badge>
                )}
                {todayStatus === "pending_review" && (
                  <Badge variant="secondary" className="shrink-0">
                    <Clock className="h-4 w-4 mr-1" /> Pending review
                  </Badge>
                )}
                {todayStatus === "failed_verification" && (
                  <Badge variant="destructive" className="shrink-0">
                    <AlertCircle className="h-4 w-4 mr-1" /> Not verified
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Recording Dialog — two stages: pill_check, then ingestion */}
      <Dialog open={!!recordingPrescriptionId} onOpenChange={(open) => { if (!open) handleCloseRecording(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {stage === "pill_check" ? (
                <><Camera className="h-5 w-5 text-primary" /> Step 1: Show your pill</>
              ) : (
                <><Video className="h-5 w-5 text-primary" /> Step 2: Take your medication</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const rxNow = prescriptions.find((p) => p.id === recordingPrescriptionId);
              const expectedQty = Math.max(1, Number(rxNow?.quantity_per_dose) || parseQuantity(rxNow?.dosage));
              if (stage === "pill_check" && expectedQty > 1) {
                return (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-2 text-xs text-foreground flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    Show <strong>all {expectedQty} tablets</strong> together in the frame.
                  </div>
                );
              }
              return null;
            })()}
            <p className="text-sm text-muted-foreground">
              {stage === "pill_check"
                ? "Hold your pill close to the camera so we can confirm it matches your prescription."
                : "Film yourself taking your medication. Max 30 seconds."}
            </p>
            <p className="text-sm text-muted-foreground italic">
              Your video isn't saved. We only keep a short text description and a single still of the tablet.
            </p>

            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              {recordedBlob && recordedUrl ? (
                <video
                  src={recordedUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain bg-black"
                  onError={() =>
                    toast({
                      title: "Replay not supported on this device",
                      description: "Don't worry — the recording was sent for verification.",
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

            {/* STAGE 1 — Pill capture */}
            {stage === "pill_check" && (
              <>
                {pillCheckResult && (
                  <div
                    className={
                      "rounded-xl border p-3 text-sm " +
                      (!pillCheckResult.isPillVisible
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : pillCheckResult.isMatch
                        ? "border-primary/40 bg-sky-500/10 text-primary dark:text-primary"
                        : "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400")
                    }
                  >
                    <div className="flex items-start gap-2">
                      {!pillCheckResult.isPillVisible ? (
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      ) : pillCheckResult.isMatch ? (
                        <Check className="h-4 w-4 mt-0.5 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">
                          {!pillCheckResult.isPillVisible
                            ? "No pill detected"
                            : pillCheckResult.expectedCount && pillCheckResult.detectedCount !== undefined && pillCheckResult.detectedCount < pillCheckResult.expectedCount
                            ? `We saw ${pillCheckResult.detectedCount} of ${pillCheckResult.expectedCount} tablets — please show them all`
                            : pillCheckResult.isMatch
                            ? "Looks right — proceed to take it"
                            : "This does not match your prescribed medication. You cannot record intake until the correct pill is shown."}
                        </p>
                        <p className="opacity-80 mt-0.5">{pillCheckResult.matchReason}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-center">
                  {!pillCheckResult ? (
                    <>
                      <Button variant="outline" onClick={handleCloseRecording} disabled={isCheckingPill}>
                        Cancel
                      </Button>
                      <Button onClick={capturePillImage} disabled={!stream || isCheckingPill} className="gap-2">
                        {isCheckingPill ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        Capture Pill
                      </Button>
                    </>
                  ) : !pillCheckResult.isPillVisible || !pillCheckResult.isMatch ? (
                    <>
                      <Button variant="outline" onClick={handleCloseRecording}>Cancel</Button>
                      <Button onClick={retryPillCheck} className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Try again
                      </Button>
                    </>
                  ) : pillCheckResult.expectedCount && pillCheckResult.detectedCount !== undefined && pillCheckResult.detectedCount < pillCheckResult.expectedCount ? (
                    <>
                      <Button variant="outline" onClick={handleCloseRecording}>Cancel</Button>
                      <Button onClick={retryPillCheck} className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Retake with all tablets
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={retryPillCheck}>Retake pill photo</Button>
                      <Button onClick={proceedToIngestion} className="gap-2">
                        <Video className="h-4 w-4" /> Proceed
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}

            {/* STAGE 2 — Ingestion recording */}
            {stage === "ingestion" && (
              <div className="flex gap-2 justify-center">
                {!recordedBlob ? (
                  !isRecording ? (
                    <Button onClick={startRecording} disabled={!stream} className="gap-2">
                      <Video className="h-4 w-4" /> Start Recording
                    </Button>
                  ) : (
                    <Button onClick={stopRecording} variant="destructive" className="gap-2">
                      <Square className="h-4 w-4" /> Stop
                    </Button>
                  )
                ) : (
                  <>
                    <Button variant="outline" onClick={handleCloseRecording} disabled={isUploading}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmitProof} disabled={isUploading} className="gap-2">
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Submit Proof
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Success celebration */}
      <SuccessCelebration
        open={celebration.open}
        onClose={() => setCelebration((c) => ({ ...c, open: false }))}
        vulasEarned={celebration.vulasEarned}
        streak={celebration.streak}
        medicationName={celebration.medicationName}
      />

      {/* Baseline capture wizard */}
      {baselineCapture.open && (
        <PillBaselineCapture
          open={baselineCapture.open}
          onClose={() => setBaselineCapture({ open: false, rxId: "", medication: "", dosage: "" })}
          onCaptured={() => {
            queryClient.invalidateQueries({ queryKey: ["pill-references", patientId] });
            setBaselineCapture({ open: false, rxId: "", medication: "", dosage: "" });
          }}
          prescriptionId={baselineCapture.rxId}
          patientId={patientId}
          medicationName={baselineCapture.medication}
          dosage={baselineCapture.dosage}
          quantity={(() => {
            const rx = prescriptions.find((p) => p.id === baselineCapture.rxId);
            return Math.max(1, Number(rx?.quantity_per_dose) || parseQuantity(rx?.dosage));
          })()}
        />
      )}
    </div>
  );
}
