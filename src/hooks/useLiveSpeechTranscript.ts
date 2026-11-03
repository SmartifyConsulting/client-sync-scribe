import { useCallback, useRef, useState } from "react";

/** Minimal shape of the Web Speech API we actually use — not in lib.dom types. */
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/**
 * Best-effort, in-browser live transcript of the microphone while a meeting
 * is being recorded. This is NOT the authoritative transcript (that's the
 * server-side audio transcription that runs after Stop) — it exists only to
 * drive live UI nudges (e.g. the Needs Analysis checklist) during the call,
 * and is discarded when the recording stops. Chrome/Edge only; silently
 * unsupported elsewhere.
 */
export function useLiveSpeechTranscript() {
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTextRef = useRef("");
  const supported = !!getRecognitionCtor();

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    finalTextRef.current = "";
    setTranscript("");
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-ZA";
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalTextRef.current += ` ${result[0].transcript}`;
        else interim += ` ${result[0].transcript}`;
      }
      setTranscript(`${finalTextRef.current} ${interim}`.trim());
    };
    // Browsers auto-stop recognition after a period of silence even in
    // continuous mode — restart it transparently while we're still recording.
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        try { recognition.start(); } catch { /* already stopping */ }
      }
    };
    recognition.onerror = () => { /* best-effort — a dropped word is fine */ };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { /* ignore */ }
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null; // prevents onend from restarting it
    recognition?.stop();
  }, []);

  return { transcript, supported, start, stop };
}
