import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredVoiceId, phoneticForSpeech, storeVoiceId, voiceById } from "../lib/voices";

interface Options {
  /** Called when Maeve finishes speaking (used to auto-open the mic in talk mode). */
  onSpeechEnd?: () => void;
}

/** Voice input (live words + Whisper) and spoken replies (ElevenLabs) for Ask Maeve. */
export function useMaeveVoice(options: Options = {}) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  // Text currently being spoken plus how far through it the audio is, so the
  // words can be typed on screen in time with Maeve's voice.
  const [speakingText, setSpeakingText] = useState("");
  const [speechProgress, setSpeechProgress] = useState(0);
  const [liveText, setLiveText] = useState("");
  const [voiceId, setVoiceIdState] = useState<string>(() => getStoredVoiceId());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const liveRef = useRef("");

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const setVoiceId = useCallback((id: string, label?: string) => {
    storeVoiceId(id, label);
    setVoiceIdState(id);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setSpeaking(false);
    setSpeakingText("");
    setSpeechProgress(0);
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
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
    stopRecognition();
    liveRef.current = "";
    setLiveText("");
    setRecording(false);
    setPaused(false);
  }, [stopRecognition]);

  // Always release the mic and stop playback when the screen goes away.
  useEffect(
    () => () => {
      stopSpeaking();
      releaseMicrophone();
    },
    [stopSpeaking, releaseMicrophone],
  );

  const speak = useCallback(
    async (text: string, overrideVoiceId?: string) => {
      if (!text.trim()) return;
      stopSpeaking();
      const chosen = voiceById(overrideVoiceId || voiceId);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maeve-speak`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            // "Maeve" is pronounced MEEV — only the spoken copy is respelled.
            text: phoneticForSpeech(text),
            voiceId: chosen.id,
            fallbackVoice: chosen.fallback,
          }),
        });
        if (!res.ok) throw new Error("speech failed");
        const url = URL.createObjectURL(await res.blob());
        const audio = new Audio(url);
        audioRef.current = audio;
        setSpeaking(true);
        setSpeakingText(text);
        setSpeechProgress(0);
        audio.ontimeupdate = () => {
          if (!audio.duration || !isFinite(audio.duration)) return;
          setSpeechProgress(Math.min(1, audio.currentTime / audio.duration));
        };
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setSpeaking(false);
          setSpeechProgress(1);
          setSpeakingText("");
          optionsRef.current.onSpeechEnd?.();
        };
        audio.onerror = () => {
          setSpeaking(false);
          setSpeakingText("");
          setSpeechProgress(1);
          optionsRef.current.onSpeechEnd?.();
        };
        await audio.play();
      } catch {
        setSpeaking(false);
        setSpeakingText("");
        setSpeechProgress(1);
        optionsRef.current.onSpeechEnd?.();
      }
    },
    [stopSpeaking, voiceId],
  );

  /** Live words on screen while the user talks. Preview only — the final text comes from Whisper. */
  const startRecognition = useCallback(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = String(result[0]?.transcript ?? "");
          if (result.isFinal) {
            liveRef.current = `${liveRef.current} ${text}`.trim();
          } else {
            interim += text;
          }
        }
        setLiveText(`${liveRef.current} ${interim}`.trim());
      };
      recognition.onerror = () => {
        /* preview only — silence errors */
      };
      recognition.onend = () => {
        if (recognitionRef.current === recognition && recorderRef.current?.state === "recording") {
          try {
            recognition.start();
          } catch {
            /* ignore */
          }
        }
      };
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      /* live preview unavailable */
    }
  }, []);

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
      liveRef.current = "";
      setLiveText("");
      setRecording(true);
      setPaused(false);
      startRecognition();
      return true;
    } catch {
      setRecording(false);
      return false;
    }
  }, [stopSpeaking, startRecognition]);

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
    stopRecognition();
    setPaused(true);
    return true;
  }, [stopRecognition]);

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
    startRecognition();
    setPaused(false);
    return true;
  }, [startRecognition]);

  /** Stops recording and returns the transcript (empty string when nothing was heard). */
  const stopRecordingAndTranscribe = useCallback(async (): Promise<string> => {
    const recorder = recorderRef.current;
    if (!recorder) return "";
    const preview = liveRef.current.trim();
    stopRecognition();
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
    liveRef.current = "";
    setLiveText("");
    if (blob.size < 1200) return preview;

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
      return String((data as any)?.raw ?? "").trim() || preview;
    } catch {
      return preview;
    } finally {
      setTranscribing(false);
    }
  }, [stopRecognition]);

  return {
    recording,
    paused,
    transcribing,
    speaking,
    speakingText,
    speechProgress,
    liveText,
    voiceId,
    setVoiceId,
    speak,
    stopSpeaking,
    startRecording,
    pauseRecording,
    resumeRecording,
    releaseMicrophone,
    stopRecordingAndTranscribe,
  };
}
