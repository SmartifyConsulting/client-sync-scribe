import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveDiagnosticHint {
  suggestion: string;
  differentials?: string[];
  red_flags?: string[];
  suggested_investigations?: string[];
}

interface Args {
  enabled: boolean;
  transcript: string;
  patientAge?: number | null;
  patientSex?: string | null;
  currentMedications?: any[] | null;
  chronicConditions?: string[] | null;
  allergies?: string | null;
  pastSessions?: { date?: string; summary?: string | null }[] | null;
  language?: string;
  intervalMs?: number;
  minGrowthChars?: number;
}


/**
 * Polls the live-diagnostic-hint edge function while the doctor is recording,
 * so a working diagnostic impression appears BEFORE they conclude the visit.
 */
export function useLiveDiagnosticHint({
  enabled,
  transcript,
  patientAge,
  patientSex,
  currentMedications,
  chronicConditions,
  language,
  intervalMs = 20000,
  minGrowthChars = 80,
}: Args) {
  const [hint, setHint] = useState<LiveDiagnosticHint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastTranscriptLen = useRef(0);
  const inFlight = useRef<AbortController | null>(null);
  const transcriptRef = useRef(transcript);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (!enabled) return;
    lastTranscriptLen.current = 0;
    setHint(null);

    const tick = async () => {
      const current = transcriptRef.current;
      if (!current || current.length < 60) return;
      if (current.length - lastTranscriptLen.current < minGrowthChars) return;
      lastTranscriptLen.current = current.length;

      inFlight.current?.abort();
      const ac = new AbortController();
      inFlight.current = ac;
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("live-diagnostic-hint", {
          body: {
            transcript: current,
            patientAge,
            patientSex,
            currentMedications,
            chronicConditions,
            language,
          },
        });
        if (ac.signal.aborted) return;
        if (error) {
          console.warn("live-diagnostic-hint error:", error);
          return;
        }
        if (data && (data.suggestion || data.differentials?.length)) {
          setHint(data as LiveDiagnosticHint);
        }
      } catch (e) {
        if (!(e as any)?.name?.includes("Abort")) {
          console.warn("live-diagnostic-hint invoke failed:", e);
        }
      } finally {
        if (!ac.signal.aborted) setIsLoading(false);
      }
    };

    const warmup = setTimeout(tick, 8000);
    const interval = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(warmup);
      clearInterval(interval);
      inFlight.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { hint, isLoading };
}
