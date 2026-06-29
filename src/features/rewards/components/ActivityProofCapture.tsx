import { useState, useRef, useCallback, useEffect } from "react";
import { Video, X, Check, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { mapCameraError } from "@/lib/cameraErrors";


interface Task {
  id: string;
  title: string;
  vulas_reward: number;
  patient_id: string | null;
  task_type: string;
}

interface ActivityProofCaptureProps {
  tasks: Task[];
  onProofSubmitted: () => void;
}

export function ActivityProofCapture({ tasks, onProofSubmitted }: ActivityProofCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState(30);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      const friendly = mapCameraError(error);
      toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
    }

  }, [toast]);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [stream]);

  useEffect(() => {
    if (isOpen) startCamera();
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, [isOpen]);

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
    };
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

  const handleSubmit = async () => {
    if (!recordedBlob || !selectedTaskId) return;
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileName = `activity-proof/${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("patient-media")
        .upload(fileName, recordedBlob, { contentType: "video/webm" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("patient-media").getPublicUrl(fileName);

      // Update the todo with proof and mark completed
      const task = tasks.find((t) => t.id === selectedTaskId);
      await supabase.from("todos").update({
        proof_url: urlData.publicUrl,
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", selectedTaskId);

      // Award vulas if configured
      if (task && task.vulas_reward > 0 && task.patient_id) {
        await supabase.from("patient_rewards").insert({
          patient_id: task.patient_id,
          awarded_by: user.id,
          visit_category: "Activity Completion",
          lollipops_count: task.vulas_reward,
          reward_type: "activity",
        });
      }

      toast({ title: "Proof submitted!", description: `Task completed${task?.vulas_reward ? ` — earned ${task.vulas_reward} Vulas!` : ""}` });
      handleClose();
      onProofSubmitted();
    } catch (error) {
      console.error(error);
      toast({ title: "Upload failed", description: "Could not submit proof.", variant: "destructive" });
    }
    setIsUploading(false);
  };

  const handleClose = () => {
    stopCamera();
    setIsOpen(false);
    setRecordedBlob(null);
    setSelectedTaskId("");
    setIsRecording(false);
    setCountdown(30);
  };

  const pendingTasks = tasks.filter((t) => t.task_type === "activity");

  if (pendingTasks.length === 0) return null;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="gap-2 border-primary text-primary hover:bg-primary/10"
      >
        <Video className="h-5 w-5" />
        Record Activity Proof
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Activity Verification
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger>
                <SelectValue placeholder="Select task to verify" />
              </SelectTrigger>
              <SelectContent>
                {pendingTasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title} {t.vulas_reward > 0 && `(+${t.vulas_reward} Ⓜ)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
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
                  className="w-full h-full object-cover mirror"
                />
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
                  <Button onClick={startRecording} disabled={!selectedTaskId || !stream} className="gap-2">
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
                  <Button onClick={handleSubmit} disabled={isUploading} className="gap-2">
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
