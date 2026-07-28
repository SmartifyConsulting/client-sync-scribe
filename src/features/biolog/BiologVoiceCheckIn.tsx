import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BiologPayload } from "./types";

function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const length = chunks.reduce((sum, c) => sum + c.length, 0);
  const samples = new Float32Array(length);
  let offset = 0;
  for (const c of chunks) {
    samples.set(c, offset);
    offset += c.length;
  }

  // Downsample to 16 kHz to keep the upload small.
  const target = 16000;
  const ratio = sampleRate / target;
  const outLength = Math.floor(samples.length / ratio);
  const out = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const s = Math.max(-1, Math.min(1, samples[Math.floor(i * ratio)] || 0));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const buffer = new ArrayBuffer(44 + out.length * 2);
  const view = new DataView(buffer);
  const writeString = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + out.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, target, true);
  view.setUint32(28, target * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, out.length * 2, true);
  new Int16Array(buffer, 44).set(out);

  return new Blob([buffer], { type: "audio/wav" });
}

interface VoiceCheckInProps {
  sections: { key: string; label: string }[];
  foods: string[];
  exercises: string[];
  medications: string[];
  onParsed: (payload: Partial<BiologPayload> & { note?: string }) => void;
}

export function BiologVoiceCheckIn({
  sections,
  foods,
  exercises,
  medications,
  onParsed,
}: VoiceCheckInProps) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      nodeRef.current = node;
      chunksRef.current = [];
      node.onaudioprocess = (e) =>
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      source.connect(node);
      node.connect(ctx.destination);
      setRecording(true);
    } catch {
      toast.error("Microphone access is needed to record your check-in.");
    }
  };

  const stop = async () => {
    setRecording(false);
    const ctx = ctxRef.current;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    nodeRef.current?.disconnect();
    if (!ctx) return;

    const blob = encodeWav(chunksRef.current, ctx.sampleRate);
    await ctx.close().catch(() => {});
    ctxRef.current = null;

    if (blob.size < 2048) {
      toast.error("That recording was empty — please try again.");
      return;
    }

    setBusy(true);
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const { data, error } = await supabase.functions.invoke("biolog-voice-checkin", {
        body: { audio: base64, sections, foods, exercises, medications },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      onParsed(data ?? {});
      toast.success("Check-in captured from your voice note.");
    } catch (err: any) {
      toast.error(err?.message || "Could not process that recording.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant={recording ? "destructive" : "outline"}
      size="sm"
      onClick={recording ? stop : start}
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : recording ? (
        <Square className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      {busy ? "Processing…" : recording ? "Stop & fill in" : "Voice check-in"}
    </Button>
  );
}
