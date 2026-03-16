import { useState, useRef, useCallback, useEffect } from "react";
import { Pill, Video, Flame, Check, Clock, AlertCircle, Loader2, Square, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays, differenceInCalendarDays } from "date-fns";

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  status: string;
}

interface AdherenceRecord {
  id: string;
  prescription_id: string;
  scheduled_date: string;
  status: string;
  taken_at: string | null;
  proof_url: string | null;
}

interface MedicationAdherenceTabProps {
  patientId: string;
}

export function MedicationAdherenceTab({ patientId }: MedicationAdherenceTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recordingPrescriptionId, setRecordingPrescriptionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState(30);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch active prescriptions for this chronic patient
  const { data: prescriptions = [], isLoading: prescriptionsLoading } = useQuery({
    queryKey: ["chronic-prescriptions", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("id, medication, dosage, frequency, status")
        .eq("patient_id", patientId)
        .eq("status", "active");
      if (error) throw error;
      return (data || []) as Prescription[];
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

  // Check missed doses and notify doctor
  useEffect(() => {
    if (prescriptions.length === 0) return;
    const checkMissed = async () => {
      const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
      for (const rx of prescriptions) {
        const yesterdayRecord = adherenceRecords.find(
          (r) => r.prescription_id === rx.id && r.scheduled_date === yesterday
        );
        if (!yesterdayRecord || yesterdayRecord.status === "pending") {
          // Mark as missed
          if (yesterdayRecord) {
            await supabase
              .from("medication_adherence")
              .update({ status: "missed" })
              .eq("id", yesterdayRecord.id);
          }
          // Notify doctor
          const { data: patient } = await supabase
            .from("patients")
            .select("user_id, name")
            .eq("id", patientId)
            .maybeSingle();
          if (patient) {
            await supabase.from("notifications").insert({
              user_id: patient.user_id,
              title: "Missed Medication Dose",
              description: `${patient.name} missed their dose of ${rx.medication} yesterday.`,
              type: "medication_missed",
              reference_id: patientId,
            });
          }
        }
      }
    };
    checkMissed();
  }, [prescriptions.length, adherenceRecords.length]);

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
    const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => setRecordedBlob(new Blob(chunksRef.current, { type: "video/webm" }));
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

      // Upload video temporarily
      const filePath = `medication-proof/${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("patient-media")
        .upload(filePath, recordedBlob, { contentType: "video/webm" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("patient-media").getPublicUrl(filePath);

      // Call AI validation edge function (handles adherence update, rewards, and video deletion)
      const { data: validationData, error: fnError } = await supabase.functions.invoke(
        "validate-medication-video",
        {
          body: {
            videoUrl: urlData.publicUrl,
            filePath,
            prescriptionId: recordingPrescriptionId,
            patientId,
          },
        }
      );

      if (fnError) throw fnError;

      const validation = validationData?.validation;

      if (validation?.isValid) {
        toast({ title: "✅ Medication verified!", description: `AI confirmed ingestion. +5 Moolas earned!` });
        handleCloseRecording();
        queryClient.invalidateQueries({ queryKey: ["medication-adherence", patientId] });
        queryClient.invalidateQueries({ queryKey: ["my-rewards"] });
      } else {
        // Validation failed — allow retry
        setRecordedBlob(null);
        startCamera();
        const reason = validation?.description || "Could not confirm medication ingestion.";
        const missing: string[] = [];
        if (!validation?.person_detected) missing.push("person visible");
        if (!validation?.medication_detected) missing.push("medication visible");
        if (!validation?.ingestion_detected) missing.push("taking the medication");
        toast({
          title: "Verification failed",
          description: `${reason}${missing.length > 0 ? ` Missing: ${missing.join(", ")}.` : ""} Please try again.`,
          variant: "destructive",
        });
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
          <p className="text-sm text-muted-foreground mt-1">When your doctor prescribes chronic medication, it will appear here for daily tracking.</p>
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
            Film yourself taking each medication daily to earn Moolas and build streaks
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
          <Card key={rx.id} className={todayStatus === "completed" ? "border-green-500/30" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{rx.medication}</h3>
                    {todayStatus === "completed" ? (
                      <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
                        <Check className="h-3 w-3 mr-1" /> Taken Today
                      </Badge>
                    ) : todayStatus === "missed" ? (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" /> Missed
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" /> Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{rx.dosage} • {rx.frequency}</p>

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

                {todayStatus !== "completed" && (
                  <Button
                    onClick={() => setRecordingPrescriptionId(rx.id)}
                    className="gap-2 shrink-0"
                  >
                    <Video className="h-4 w-4" />
                    Take Medication
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Recording Dialog */}
      <Dialog open={!!recordingPrescriptionId} onOpenChange={(open) => { if (!open) handleCloseRecording(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Record Medication Proof
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Film yourself taking your medication. Max 30 seconds.
            </p>
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              {recordedBlob ? (
                <video src={URL.createObjectURL(recordedBlob)} controls className="w-full h-full object-cover" />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
              )}
              {isRecording && (
                <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                  REC {countdown}s
                </div>
              )}
            </div>
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
                  <Button variant="outline" onClick={() => { setRecordedBlob(null); startCamera(); }}>
                    Retake
                  </Button>
                  <Button onClick={handleSubmitProof} disabled={isUploading} className="gap-2">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Submit Proof
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
