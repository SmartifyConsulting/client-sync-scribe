import { useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * Debounced autosave hook.
 * Watches `value` (deep-stringified) and calls `save(value)` after `delay` ms of inactivity.
 * Skips the initial mount and skips when value matches the most recently saved snapshot.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void> | void,
  opts: { delay?: number; enabled?: boolean } = {},
) {
  const { delay = 500, enabled = true } = opts;
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const lastSavedRef = useRef<string>(JSON.stringify(value));
  const initialRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const serialized = JSON.stringify(value);
    if (initialRef.current) {
      initialRef.current = false;
      lastSavedRef.current = serialized;
      return;
    }
    if (serialized === lastSavedRef.current) return;
    setStatus("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await save(value);
        lastSavedRef.current = JSON.stringify(value);
        setStatus("saved");
        setError(null);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setStatus("idle"), 1500);
      } catch (e: any) {
        setStatus("error");
        setError(e?.message || "Save failed");
      }
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), enabled, delay]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  return { status, error };
}
