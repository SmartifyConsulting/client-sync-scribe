import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Send, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const MAX_SECONDS = 70; // +10s extra capture window (longer for stressed users)
const SILENCE_MS = 9000; // +5s before auto-stop on silence
const MIN_RECORD_MS = 2000;
const SILENCE_RMS = 0.015; // amplitude threshold

export type PreStartedRecording = {
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  startedAt: number;
};

interface Props {
  open: boolean;
  incidentId: string | null;
  onClose: () => void;
  preStarted?: PreStartedRecording | null;
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

export function SosVoiceNoteDialog({ open, incidentId, onClose, preStarted }: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"recording" | "uploading">("recording");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const lastVoiceAtRef = useRef<number>(0);
  const closedRef = useRef(false);

  const cleanup = () => {
    try { recorderRef.current?.state === "recording" && recorderRef.current.stop(); } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try { audioCtxRef.current?.close(); } catch {}
    streamRef.current = null;
    recorderRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  };

  const stopAndSend = () => {
    try { recorderRef.current?.state === "recording" && recorderRef.current.stop(); } catch {}
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio analyser for silence detection
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Float32Array(analyser.fftSize);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        setLevel(Math.min(1, rms * 8));
        const now = Date.now();
        if (rms > SILENCE_RMS) lastVoiceAtRef.current = now;
        if (now - startedAtRef.current >= MIN_RECORD_MS &&
            now - lastVoiceAtRef.current >= SILENCE_MS) {
          stopAndSend();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = handleStop;
      mr.start();
      startedAtRef.current = Date.now();
      lastVoiceAtRef.current = Date.now();
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
      rafRef.current = requestAnimationFrame(tick);
    } catch (e: any) {
      toast.error(t("sosVoice.micDenied"));
      onClose();
    }
  };

  useEffect(() => {
    if (open) {
      closedRef.current = false;
      setPhase("recording");
      setSeconds(0);
      setLevel(0);
      // Auto-start mic
      startRecording();
    } else {
      cleanup();
    }
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleStop = async () => {
    if (closedRef.current) return;
    setPhase("uploading");
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      streamRef.current?.getTracks().forEach((t) => t.stop());

      if (!incidentId) throw new Error("No incident");
      if (blob.size < 500) {
        // Practically empty — keep critical default and skip
        toast.message(t("sosVoice.noneCaptured"));
        closedRef.current = true;
        cleanup();
        onClose();
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const path = `${uid}/sos-${incidentId}-${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage
        .from("session-audio")
        .upload(path, blob, { contentType: "audio/webm", upsert: false });
      if (upErr) throw upErr;

      // Save audio path immediately so responders see it
      await supabase.from("holarchelp_incidents" as any).update({
        voice_note_audio_url: path,
      } as any).eq("id", incidentId);

      toast.success(t("sosVoice.shared"));
      cleanup();
      onClose();

      // Transcribe in the background with retries; UPDATE will surface via realtime
      try {
        const base64 = await blobToBase64(blob);
        let transcript = "";
        const delays = [0, 1000, 3000];
        for (const d of delays) {
          if (d) await new Promise((r) => setTimeout(r, d));
          try {
            const { data: trData, error: trErr } = await supabase.functions.invoke("transcribe-audio", {
              body: { audio: base64, patientName: "Patient", doctorName: "Responder" },
            });
            if (!trErr && (trData as any)?.text) {
              transcript = String((trData as any).text);
              break;
            }
          } catch (err) {
            console.error("Transcription attempt failed", err);
          }
        }
        // Only persist a transcript when one actually came back — never fabricate placeholder text.
        if (transcript) {
          await supabase.from("holarchelp_incidents" as any).update({
            voice_note_transcript: transcript,
          } as any).eq("id", incidentId);
        }
        // Log voice-note event for the timeline
        try {
          await supabase.from("holarchelp_incident_events" as any).insert({
            incident_id: incidentId,
            event_type: "voice_note",
            payload: { kind: "initial" },
          } as any);
        } catch { /* ignore */ }
      } catch (err) {
        console.error("Transcription failed (audio still saved)", err);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t("voiceNotes.failedSave"));
      cleanup();
      onClose();
    }
  };

  const cancel = () => {
    closedRef.current = true;
    // Detach handlers BEFORE stopping so onstop -> handleStop can't re-fire onClose
    try {
      if (recorderRef.current) {
        recorderRef.current.onstop = null as any;
        recorderRef.current.ondataavailable = null as any;
      }
    } catch {}
    cleanup();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && cancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <Mic className="h-5 w-5" /> {t("sosVoice.title")}
          </DialogTitle>
          <DialogDescription className="text-base text-foreground pt-2">
            {t("sosVoice.descriptionStart")} <strong>{t("sosVoice.howMany")}</strong> {t("common.and", { defaultValue: "and" })}{" "}
            <strong>{t("sosVoice.howSerious")}</strong>. {t("sosVoice.autoSend")}
          </DialogDescription>
        </DialogHeader>

        {phase === "recording" && (
          <div className="flex flex-col items-center gap-4 mt-4">
            <div
              className="h-20 w-20 rounded-full bg-red-600 flex items-center justify-center"
              style={{ transform: `scale(${1 + level * 0.5})`, transition: "transform 80ms linear" }}
            >
              <Mic className="h-9 w-9 text-white" />
            </div>
            <div className="text-2xl font-mono">{seconds}s / {MAX_SECONDS}s</div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-red-600 transition-all" style={{ width: `${level * 100}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button onClick={cancel} variant="outline" className="h-11">
                <X className="h-4 w-4 mr-2" /> {t("common.cancel")}
              </Button>
              <Button onClick={stopAndSend} className="bg-red-600 hover:bg-red-700 text-white h-11">
                <Send className="h-4 w-4 mr-2" /> {t("sosVoice.sendNow")}
              </Button>
            </div>
          </div>
        )}

        {phase === "uploading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            <div className="text-sm text-muted-foreground">{t("sosVoice.sharing")}</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
