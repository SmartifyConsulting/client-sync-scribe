import { useEffect, useState } from "react";
import { LATEST_COMPANION_VERSION } from "./companionDetection";

const RELEASE_ROOT = "https://raw.githubusercontent.com/SmartifyConsulting/client-sync-scribe/main";
export const COMPANION_RELEASE_URL = `${RELEASE_ROOT}/extension-insurer/manifest.json`;
export const COMPANION_DOWNLOAD_URL = `${RELEASE_ROOT}/public/holarc-insurer-addon.zip`;

export function useCompanionRelease() {
  const [release, setRelease] = useState({ version: LATEST_COMPANION_VERSION, verified: false, checking: true });
  useEffect(() => {
    let alive = true;
    let controller: AbortController | null = null;
    const check = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      const timeout = setTimeout(() => request.abort(), 10_000);
      try {
        const response = await fetch(COMPANION_RELEASE_URL, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: request.signal });
        if (!response.ok) throw new Error("Release unavailable");
        const data = await response.json();
        if (typeof data.version !== "string" || !/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(data.version)) throw new Error("Invalid release");
        if (alive && controller === request) setRelease({ version: data.version, verified: true, checking: false });
      } catch {
        if (alive && controller === request) setRelease(previous => ({ ...previous, verified: false, checking: false }));
      } finally { clearTimeout(timeout); }
    };
    void check();
    const interval = setInterval(() => void check(), 60_000);
    window.addEventListener("focus", check);
    return () => { alive = false; controller?.abort(); clearInterval(interval); window.removeEventListener("focus", check); };
  }, []);
  return release;
}

export function companionVersionCurrent(installed: string | null, latest: string) {
  if (!installed || !/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(installed)) return false;
  const a = installed.split('.').map(Number), b = latest.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return true;
}
