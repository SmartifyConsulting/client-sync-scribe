import { useState, useRef, useCallback, useEffect } from "react";
import { CheckSquare, Loader2, Clock, CheckCircle2, Camera, Video, Square, Check, X, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface PatientTodo {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  moolas_reward: number;
  created_at: string;
  completed_at: string | null;
  proof_url: string | null;
  patient_id: string | null;
  task_type: string;
}

export default function PatientTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [todos, setTodos] = useState<PatientTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientIds, setPatientIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) fetchTodos();
  }, [user]);

  const fetchTodos = async () => {
    try {
      const { data: patients } = await supabase
        .from("patients")
        .select("id")
        .eq("patient_user_id", user!.id);

      if (!patients?.length) { setLoading(false); return; }

      const ids = patients.map(p => p.id);
      setPatientIds(ids);
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .in("patient_id", ids)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const pendingTodos = todos.filter(t => t.status === "pending");
  const completedTodos = todos.filter(t => t.status === "completed");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          My To-Do List
        </h1>
        <p className="text-xs text-muted-foreground">Tasks assigned to you by your healthcare providers</p>
      </div>

      {todos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <CheckSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tasks assigned yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingTodos.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending ({pendingTodos.length})
              </h2>
              {pendingTodos.map((todo) => (
                <TaskCard key={todo.id} todo={todo} onComplete={fetchTodos} />
              ))}
            </div>
          )}

          {completedTodos.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Completed ({completedTodos.length})
              </h2>
              {completedTodos.map((todo) => (
                <TaskCard key={todo.id} todo={todo} onComplete={fetchTodos} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskCard({ todo, onComplete }: { todo: PatientTodo; onComplete: () => void }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isCompleted = todo.status === "completed";
  const hasMoolasReward = todo.moolas_reward > 0;
  const isMedicationType = todo.task_type === "medication" || todo.title.toLowerCase().includes("medication") || todo.title.toLowerCase().includes("medic");

  // Photo capture state
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const priorityColors: Record<string, string> = {
    high: "bg-destructive/10 text-destructive",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    low: "bg-muted text-muted-foreground",
  };

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
  }, [stream]);

  useEffect(() => {
    if (showRecordDialog) startCamera();
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, [showRecordDialog]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        setCapturedUrl(URL.createObjectURL(blob));
      }
    }, "image/jpeg", 0.85);
  };

  const handleCloseRecording = () => {
    stopCamera();
    setShowRecordDialog(false);
    setCapturedBlob(null);
    setCapturedUrl(null);
  };

  const handleSubmitProof = async () => {
    if (!recordedBlob || !todo.patient_id) return;

    if (recordedBlob.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Recording must be under 5MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `task-proof/${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("patient-media")
        .upload(filePath, recordedBlob, { contentType: "video/webm" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("patient-media").getPublicUrl(filePath);

      // Use AI validation edge function
      const { data: validationData, error: fnError } = await supabase.functions.invoke(
        "validate-medication-video",
        {
          body: {
            videoUrl: urlData.publicUrl,
            filePath,
            prescriptionId: todo.id, // Using todo id as reference
            patientId: todo.patient_id,
          },
        }
      );

      if (fnError) throw fnError;

      const validation = validationData?.validation;

      if (validation?.isValid) {
        // Update todo as completed
        const { error: updateError } = await supabase
          .from("todos")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", todo.id);

        if (updateError) throw updateError;

        // Award moolas
        if (todo.moolas_reward > 0) {
          await supabase.from("patient_rewards").insert({
            patient_id: todo.patient_id,
            awarded_by: user.id,
            lollipops_count: todo.moolas_reward,
            visit_category: "Task Completion",
            reward_type: "task_proof",
          });
        }

        toast({ title: "✅ Task verified!", description: `AI confirmed your proof. +${todo.moolas_reward} Moolas earned!` });
        handleCloseRecording();
        queryClient.invalidateQueries({ queryKey: ["my-rewards"] });
        onComplete();
      } else {
        setRecordedBlob(null);
        startCamera();
        const reason = validation?.description || "Could not verify task completion.";
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

  return (
    <>
      <div className={`rounded-xl border p-4 ${isCompleted ? "border-border bg-muted/30 opacity-70" : "border-primary/30 bg-card shadow-sm"}`}>
        <div className="flex items-start gap-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isCompleted ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"}`}>
            {isCompleted ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <CheckSquare className="h-4 w-4 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>{todo.title}</p>
            {todo.description && <p className="text-xs text-muted-foreground mt-0.5">{todo.description}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${priorityColors[todo.priority] || ""}`}>
                {todo.priority}
              </Badge>
              {todo.due_date && (
                <span className="text-[10px] text-muted-foreground">
                  Due {format(new Date(todo.due_date), "MMM d, yyyy")}
                </span>
              )}
              {todo.moolas_reward > 0 && (
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                  🪙 {todo.moolas_reward} Moolas
                </Badge>
              )}
            </div>

            {/* Action buttons for pending tasks */}
            {!isCompleted && (
              <div className="flex items-center gap-2 mt-3">
                {hasMoolasReward && (
                  <Button
                    size="sm"
                    onClick={() => setShowRecordDialog(true)}
                    className="gap-1.5 text-xs h-8"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Record Proof
                  </Button>
                )}
                {isMedicationType && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/patient/rewards?tab=chronic-meds")}
                    className="gap-1.5 text-xs h-8"
                  >
                    <Pill className="h-3.5 w-3.5" />
                    Chronic Meds
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Recording Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={(open) => { if (!open) handleCloseRecording(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Record Proof
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Film yourself completing the task. Show the medication and take it on camera. Max 30 seconds.
            </p>
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              {recordedBlob ? (
                <video src={URL.createObjectURL(recordedBlob)} controls className="w-full h-full object-cover" />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
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
    </>
  );
}
