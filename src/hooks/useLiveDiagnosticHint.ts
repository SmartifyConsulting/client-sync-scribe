import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveDiagnosticAlert {
  type: "duplicate" | "interaction" | "allergy" | "recurrence" | "red_flag" | "gap";
  severity: "critical" | "caution" | "info";
  message: string;
}

export interface LiveDiagnosticHint {
  suggestion: string;
  alerts?: LiveDiagnosticAlert[];
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
 * `analyze()` runs the same analysis on demand (manual AI Consult, or the final
 * whole-transcript pass once recording stops).
 */
export function useLiveDiagnosticHint({
  enabled,
  transcript,
  patientAge,
  patientSex,
  currentMedications,
  chronicConditions,
  allergies,
  pastSessions,

  language,
  intervalMs = 12000,
  minGrowthChars = 25,
}: Args) {
  const [hint, setHint] = useState<LiveDiagnosticHint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);
  const lastTranscriptLen = useRef(0);

  const inFlight = useRef<AbortController | null>(null);
  const transcriptRef = useRef(transcript);
  // Context changes constantly; keep it in a ref so the polling loop never
  // restarts (and never loses accumulated state) mid-consultation.
  const contextRef = useRef({ patientAge, patientSex, currentMedications, chronicConditions, allergies, pastSessions, language });
  contextRef.current = { patientAge, patientSex, currentMedications, chronicConditions, allergies, pastSessions, language };

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const run = useCallback(async (override?: string) => {
    const current = (override ?? transcriptRef.current) || "";
    if (current.trim().length < 25) return null;


    inFlight.current?.abort();
    const ac = new AbortController();
    inFlight.current = ac;
    setIsLoading(true);
    setError(null);
    try {
      const ctx = contextRef.current;
      const { data, error: fnError } = await supabase.functions.invoke("live-diagnostic-hint", {
        body: {
          transcript: current,
          patientAge: ctx.patientAge,
          patientSex: ctx.patientSex,
          currentMedications: ctx.currentMedications,
          chronicConditions: ctx.chronicConditions,
          allergies: ctx.allergies,
          pastSessions: (ctx.pastSessions ?? []).slice(0, 5),
          language: ctx.language,
        },
      });
      if (ac.signal.aborted) return null;
      if (fnError) {
        console.warn("live-diagnostic-hint error:", fnError);
        setError("The AI clinician could not analyse this part of the consultation.");
        return null;
      }
      setLastRunAt(new Date());
      if (data && (data.suggestion || data.differentials?.length || data.alerts?.length)) {
        setHint(data as LiveDiagnosticHint);
        return data as LiveDiagnosticHint;
      }
      return null;

    } catch (e) {
      if (!(e as any)?.name?.includes("Abort")) {
        console.warn("live-diagnostic-hint invoke failed:", e);
        setError("The AI clinician could not be reached.");
      }
      return null;
    } finally {
      if (!ac.signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    lastTranscriptLen.current = 0;

    const tick = () => {
      const current = transcriptRef.current;
      if (!current || current.length < 60) return;
      if (current.length - lastTranscriptLen.current < minGrowthChars) return;
      lastTranscriptLen.current = current.length;
      void run();
    };

    const warmup = setTimeout(tick, 6000);
    const interval = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(warmup);
      clearInterval(interval);
      inFlight.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { hint, isLoading, error, analyze: run, reset: () => setHint(null) };
}
