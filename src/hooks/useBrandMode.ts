import { useCallback, useEffect, useState } from "react";

export type BrandMode = "holarc" | "indigro";

const STORAGE_KEY = "brand-mode";
const listeners = new Set<(mode: BrandMode) => void>();

// Default mode when nothing is stored yet — Indigro, until told otherwise.
const DEFAULT_MODE: BrandMode = "indigro";

function readStoredMode(): BrandMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "indigro" || stored === "holarc") return stored;
  } catch {
    /* localStorage unavailable */
  }
  return DEFAULT_MODE;
}

function applyMode(mode: BrandMode) {
  if (mode === "indigro") {
    document.documentElement.setAttribute("data-brand", "indigro");
  } else {
    document.documentElement.removeAttribute("data-brand");
  }
}

let currentMode: BrandMode = typeof document !== "undefined" ? readStoredMode() : DEFAULT_MODE;

// Apply immediately on module load so there's no flash of the wrong brand on first paint.
if (typeof document !== "undefined") {
  applyMode(currentMode);
}

function setGlobalMode(mode: BrandMode) {
  currentMode = mode;
  applyMode(mode);
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* localStorage unavailable */
  }
  listeners.forEach((l) => l(mode));
}

// Keep other tabs/windows in sync too.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      const next: BrandMode = e.newValue === "indigro" ? "indigro" : e.newValue === "holarc" ? "holarc" : DEFAULT_MODE;
      if (next !== currentMode) {
        currentMode = next;
        applyMode(next);
        listeners.forEach((l) => l(next));
      }
    }
  });
}

export function useBrandMode() {
  const [mode, setMode] = useState<BrandMode>(currentMode);

  useEffect(() => {
    listeners.add(setMode);
    // Pick up any change that happened between initial render and this effect.
    setMode(currentMode);
    return () => {
      listeners.delete(setMode);
    };
  }, []);

  const toggle = useCallback(() => {
    setGlobalMode(currentMode === "holarc" ? "indigro" : "holarc");
  }, []);

  return { mode, setMode: setGlobalMode, toggle };
}
