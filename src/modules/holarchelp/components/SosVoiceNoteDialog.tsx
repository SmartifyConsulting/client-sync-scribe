import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Square, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_SECONDS = 60;

interface Props {
  open: boolean;
  incidentId: string | null;
  onClose: () => void;
}

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export function SosVoiceNoteDialog({ open, incidentId, onClose }: Props) {
  const [phase, setPhase] = useState<"prompt" | "recording" | "uploading">("prompt");
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      cleanup();
      setPhase("prompt");
      setSeconds(0);
    }
  }, [open]);

  const cleanup = () => {
    try { recorderRef.current?.state === "recording" && recorderRef.current.stop(); } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = handleStop;
      mr.start();
      setPhase("recording");
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            try { mr.state === "recording" && mr.stop(); } catch {}
          }
          return s + 1;
        });
      }, 1000);
    } catch (e: any) {
      toast.error("Microphone access denied");
      onClose();
    }
  };

  const stopRecording = () => {
    try { recorderRef.current?.state === "recording" && recorderRef.current.stop(); } catch {}
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  };

  const handleStop = async () => {
    setPhase("uploading");
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      streamRef.current?.getTracks().forEach((t) => t.stop());

      if (!incidentId) throw new Error("No incident");
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const path = `${uid}/sos-${incidentId}-${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage
        .from("session-audio")
        .upload(path, blob, { contentType: "audio/webm", upsert: false });
      if (upErr) throw upErr;

      // Transcribe
      const base64 = await blobToBase64(blob);
      const { data: trData, error: trErr } = await supabase.functions.invoke("transcribe-audio", {
        body: { audio: base64, patientName: "Patient", doctorName: "Responder" },
      });
      const transcript = (!trErr && (trData as any)?.text) ? String((trData as any).text) : "";

      await supabase.from("holarchelp_incidents" as any).update({
        voice_note_audio_url: path,
        voice_note_transcript: transcript || null,
      } as any).eq("id", incidentId);

      toast.success(transcript ? "Voice note shared with responders" : "Voice note saved");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save voice note");
    } finally {
      cleanup();
      onClose();
    }
  };

  const cancel = () => {
    cleanup();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && cancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <Mic className="h-5 w-5" /> Describe the emergency
          </DialogTitle>
          <DialogDescription className="text-base text-foreground pt-2">
            Please describe what happened, <strong>how many people are injured</strong>, and{" "}
            <strong>how serious</strong> it is. Responders will see your transcript.
          </DialogDescription>
        </DialogHeader>

        {phase === "prompt" && (
          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={startRecording} className="bg-red-600 hover:bg-red-700 text-white h-12">
              <Mic className="h-5 w-5 mr-2" /> Start Recording
            </Button>
            <Button onClick={cancel} variant="outline" className="h-11">
              <X className="h-4 w-4 mr-2" /> Skip / Cancel
            </Button>
          </div>
        )}

        {phase === "recording" && (
          <div className="flex flex-col items-center gap-4 mt-4">
            <div className="h-16 w-16 rounded-full bg-red-600 flex items-center justify-center animate-pulse">
              <Mic className="h-8 w-8 text-white" />
            </div>
            <div className="text-2xl font-mono">{seconds}s / {MAX_SECONDS}s</div>
            <Button onClick={stopRecording} className="w-full bg-red-600 hover:bg-red-700 text-white h-12">
              <Square className="h-5 w-5 mr-2" /> Stop & Send
            </Button>
          </div>
        )}

        {phase === "uploading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            <div className="text-sm text-muted-foreground">Transcribing & sharing…</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
