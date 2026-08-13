import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Voice input (Whisper) + spoken replies (TTS) for Ask Maeve. */
export function useMaeveVoice() {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  /** Hard-releases the microphone: stops the recorder and every media track. */
  const releaseMicrophone = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder) {
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        /* recorder already torn down */
      }
      recorder.stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
    }
    setRecording(false);
    setPaused(false);
  }, []);

  // Always release the mic and stop playback when the screen goes away.
  useEffect(
    () => () => {
      stopSpeaking();
      releaseMicrophone();
    },
    [stopSpeaking, releaseMicrophone],
  );

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      stopSpeaking();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrate-briefing`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ text, voice: "shimmer" }),
        });
        if (!res.ok) throw new Error("speech failed");
        const url = URL.createObjectURL(await res.blob());
        const audio = new Audio(url);
        audioRef.current = audio;
        setSpeaking(true);
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setSpeaking(false);
        };
        audio.onerror = () => setSpeaking(false);
        await audio.play();
      } catch {
        setSpeaking(false);
      }
    },
    [stopSpeaking],
  );

  /** Starts recording. Returns false when the microphone is unavailable. */
  const startRecording = useCallback(async () => {
    try {
      stopSpeaking();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setPaused(false);
      return true;
    } catch {
      setRecording(false);
      return false;
    }
  }, [stopSpeaking]);

  /** Pauses an in-flight recording and mutes the mic (audio already captured is kept). */
  const pauseRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return false;
    try {
      recorder.pause();
    } catch {
      return false;
    }
    recorder.stream.getAudioTracks().forEach((t) => (t.enabled = false));
    setPaused(true);
    return true;
  }, []);

  /** Resumes a paused recording exactly where it left off. */
  const resumeRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "paused") return false;
    recorder.stream.getAudioTracks().forEach((t) => (t.enabled = true));
    try {
      recorder.resume();
    } catch {
      return false;
    }
    setPaused(false);
    return true;
  }, []);

  /** Stops recording and returns the transcript (empty string when nothing was heard). */
  const stopRecordingAndTranscribe = useCallback(async (): Promise<string> => {
    const recorder = recorderRef.current;
    if (!recorder) return "";
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
      if (recorder.state === "paused") {
        recorder.stream.getAudioTracks().forEach((t) => (t.enabled = true));
        try { recorder.resume(); } catch { /* ignore */ }
      }
      recorder.stop();
    });
    // Release the microphone the moment recording ends.
    recorder.stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    setRecording(false);
    setPaused(false);
    if (blob.size < 1200) return "";

    setTranscribing(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { audio: base64, singleSpeaker: true },
      });
      if (error) throw error;
      return String((data as any)?.raw ?? "").trim();
    } catch {
      return "";
    } finally {
      setTranscribing(false);
    }
  }, []);

  return {
    recording,
    paused,
    transcribing,
    speaking,
    speak,
    stopSpeaking,
    startRecording,
    pauseRecording,
    resumeRecording,
    releaseMicrophone,
    stopRecordingAndTranscribe,
  };
}
