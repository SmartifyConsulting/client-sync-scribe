import { useState, useRef, useCallback, useEffect } from "react";
import { CheckSquare, Loader2, Clock, CheckCircle2, Video, Check, Pill, Square, Play, Mic, MicOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";

interface PatientTodo {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  vulas_reward: number;
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

  // --- Task input state (must be before early returns) ---
  const [taskText, setTaskText] = useState("");
  const [isRecordingTask, setIsRecordingTask] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const taskRecorderRef = useRef<MediaRecorder | null>(null);
  const taskChunksRef = useRef<Blob[]>([]);
  const startTaskRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      taskChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) taskChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(taskChunksRef.current, { type: mimeType });
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("file", blob, `task-${Date.now()}.webm`);
          const { data, error } = await supabase.functions.invoke("transcribe-audio", { body: formData });
          if (error) throw error;
          if (data?.text) setTaskText((prev) => (prev ? prev + " " : "") + data.text);
        } catch (err: any) {
          toast({ title: "Transcription failed", description: err.message, variant: "destructive" });
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      taskRecorderRef.current = recorder;
      setIsRecordingTask(true);
    } catch {
      toast({ title: "Mic Error", description: "Could not access microphone.", variant: "destructive" });
    }
  }, [toast]);

  const stopTaskRecording = useCallback(() => {
    taskRecorderRef.current?.stop();
    setIsRecordingTask(false);
  }, []);

  // Auto-trigger recording when arrived from "Record Task" button on dashboard
  const [searchParams, setSearchParams] = useSearchParams();
  const autoRecordTriggered = useRef(false);
  useEffect(() => {
    if (loading || autoRecordTriggered.current) return;
    if (searchParams.get("autoRecord") === "true") {
      autoRecordTriggered.current = true;
      setSearchParams({}, { replace: true });
      setTimeout(() => { startTaskRecording(); }, 300);
    }
  }, [loading, searchParams, setSearchParams, startTaskRecording]);

  const handleAddTask = async () => {
    if (!taskText.trim() || !user) return;
    setAddingTask(true);
    try {
      const { error } = await supabase.from("todos").insert({
        title: taskText.trim(),
        user_id: user.id,
        patient_id: patientIds[0] || null,
        status: "pending",
        priority: "medium",
        task_type: "general",
      });
      if (error) throw error;
      setTaskText("");
      toast({ title: "Task added" });
      fetchTodos();
    } catch (err: any) {
      toast({ title: "Failed to add task", description: err.message, variant: "destructive" });
    } finally {
      setAddingTask(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-foreground">
          My To-Do List
        </h1>
        <p className="text-muted-foreground text-sm">Tasks assigned to you by your healthcare providers</p>
      </div>

      {/* Task Input Area */}
      <div className="flex flex-col items-center gap-3 py-4">
        <Button
          variant={isRecordingTask ? "destructive" : "outline"}
          size="icon"
          className="h-14 w-14 rounded-full shadow-md"
          onClick={isRecordingTask ? stopTaskRecording : startTaskRecording}
          disabled={isTranscribing}
        >
          {isTranscribing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isRecordingTask ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          {isRecordingTask ? "Recording... tap to stop" : isTranscribing ? "Transcribing..." : "Tap to dictate a task"}
        </p>
        <div className="flex w-full max-w-md gap-2">
          <Input
            placeholder="Type a task..."
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
            disabled={addingTask}
          />
          <Button size="icon" onClick={handleAddTask} disabled={!taskText.trim() || addingTask}>
            {addingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
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

// --- Constants ---
const MAX_RECORDING_SECONDS = 15;
const FRAME_COUNT = 5;

function TaskCard({ todo, onComplete }: { todo: PatientTodo; onComplete: () => void }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isCompleted = todo.status === "completed";
  const hasVulasReward = todo.vulas_reward > 0;
  const isMedicationType = todo.task_type === "medication" || todo.title.toLowerCase().includes("medication") || todo.title.toLowerCase().includes("medic");

  // Recording state
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const playbackVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const priorityColors: Record<string, string> = {
    high: "bg-destructive/10 text-destructive",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    low: "bg-muted text-muted-foreground",
  };

  // --- Camera ---
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(mediaStream);
      if (liveVideoRef.current) liveVideoRef.current.srcObject = mediaStream;
    } catch {
      toast({ title: "Camera Error", description: "Could not access camera.", variant: "destructive" });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }, [stream]);

  useEffect(() => {
    if (showRecordDialog && !recordedBlob) startCamera();
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, [showRecordDialog]);

  // --- Recording ---
  const startRecording = useCallback(() => {
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      stopCamera();
    };
    recorder.start(500);
    recorderRef.current = recorder;
    setIsRecording(true);
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= MAX_RECORDING_SECONDS) {
          recorder.stop();
          setIsRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
          return MAX_RECORDING_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);
  }, [stream, stopCamera]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // --- Frame extraction ---
  const extractFrames = useCallback(async (videoBlob: Blob): Promise<Blob[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      const url = URL.createObjectURL(videoBlob);
      video.src = url;

      video.onloadedmetadata = () => {
        const duration = video.duration;
        if (!duration || duration < 0.5) { reject(new Error("Video too short")); return; }

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d")!;
        const timestamps = Array.from({ length: FRAME_COUNT }, (_, i) =>
          (duration * i) / (FRAME_COUNT - 1)
        );

        const frames: Blob[] = [];
        let idx = 0;

        const seekNext = () => {
          if (idx >= timestamps.length) {
            URL.revokeObjectURL(url);
            resolve(frames);
            return;
          }
          video.currentTime = timestamps[idx];
        };

        video.onseeked = () => {
          ctx.drawImage(video, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) frames.push(blob);
              idx++;
              seekNext();
            },
            "image/jpeg",
            0.85
          );
        };

        seekNext();
      };

      video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load video")); };
    });
  }, []);

  // --- Submit ---
  const handleSubmitProof = async () => {
    if (!recordedBlob || !todo.patient_id) return;
    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      toast({ title: "Extracting frames…", description: "Processing your video for AI validation." });

      const frames = await extractFrames(recordedBlob);
      if (frames.length < FRAME_COUNT) throw new Error("Could not extract enough frames from video");

      // Upload all frames
      const filePaths: string[] = [];
      const imageUrls: string[] = [];
      for (let i = 0; i < frames.length; i++) {
        const path = `task-proof/${user.id}/${Date.now()}-frame${i}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("patient-media")
          .upload(path, frames[i], { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        filePaths.push(path);
        const { data: urlData } = supabase.storage.from("patient-media").getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }

      // Call edge function with array of image URLs
      const { data: validationData, error: fnError } = await supabase.functions.invoke(
        "validate-medication-video",
        {
          body: {
            imageUrls,
            filePaths,
            prescriptionId: todo.id,
            patientId: todo.patient_id,
          },
        }
      );

      if (fnError) throw fnError;

      const validation = validationData?.validation;

      if (validation?.isValid) {
        const { error: updateError } = await supabase
          .from("todos")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", todo.id);
        if (updateError) throw updateError;

        if (todo.vulas_reward > 0) {
          await supabase.from("patient_rewards").insert({
            patient_id: todo.patient_id,
            awarded_by: user.id,
            lollipops_count: todo.vulas_reward,
            visit_category: "Task Completion",
            reward_type: "task_proof",
          });
        }

        toast({ title: "✅ Task verified!", description: `AI confirmed your proof. +${todo.vulas_reward} Vulas earned!` });
        handleCloseRecording();
        queryClient.invalidateQueries({ queryKey: ["my-rewards"] });
        onComplete();
      } else {
        setRecordedBlob(null);
        setRecordedUrl(null);
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

  const handleCloseRecording = () => {
    stopCamera();
    stopRecording();
    setShowRecordDialog(false);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
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
              <Badge variant="outline" className={`text-xs ${priorityColors[todo.priority] || ""}`}>
                {todo.priority}
              </Badge>
              {todo.due_date && (
                <span className="text-xs text-muted-foreground">
                  Due {format(new Date(todo.due_date), "MMM d, yyyy")}
                </span>
              )}
              {todo.vulas_reward > 0 && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                  🪙 {todo.vulas_reward} Vulas
                </Badge>
              )}
            </div>

            {!isCompleted && (
              <div className="flex items-center gap-2 mt-3">
                {hasVulasReward && (
                  <Button size="sm" onClick={() => setShowRecordDialog(true)} className="gap-1.5 text-xs h-8">
                    <Video className="h-3.5 w-3.5" />
                    Record Proof
                  </Button>
                )}
                {isMedicationType && (
                  <Button size="sm" variant="outline" onClick={() => navigate("/patient/rewards?tab=chronic-meds")} className="gap-1.5 text-xs h-8">
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
              Record Medication Proof
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Record a short video (up to 15s) showing yourself taking the medication. Show the tablet, place it in your mouth, swallow, then show your empty mouth.
            </p>

            {/* Video area */}
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              {recordedUrl ? (
                <video ref={playbackVideoRef} src={recordedUrl} controls className="w-full h-full object-cover" />
              ) : (
                <video ref={liveVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
              )}
              {isRecording && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-destructive/90 text-destructive-foreground px-2 py-1 rounded-full text-xs font-medium">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  {elapsed}s / {MAX_RECORDING_SECONDS}s
                </div>
              )}
            </div>

            {/* Timer bar during recording */}
            {isRecording && (
              <Progress value={(elapsed / MAX_RECORDING_SECONDS) * 100} className="h-2" />
            )}

            <canvas ref={canvasRef} className="hidden" />

            {/* Controls */}
            <div className="flex gap-2 justify-center">
              {!recordedBlob && !isRecording && (
                <Button onClick={startRecording} disabled={!stream} className="gap-2">
                  <Video className="h-4 w-4" /> Start Recording
                </Button>
              )}
              {isRecording && (
                <Button variant="destructive" onClick={stopRecording} className="gap-2">
                  <Square className="h-4 w-4" /> Stop
                </Button>
              )}
              {recordedBlob && (
                <>
                  <Button variant="outline" onClick={() => { setRecordedBlob(null); setRecordedUrl(null); setElapsed(0); startCamera(); }}>
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
