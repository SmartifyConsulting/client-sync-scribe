import { useEffect, useState } from "react";

/** Counts down from (etaMinutes * 60) seconds since lastUpdate. Shows mm:ss. */
export function EtaCountdown({ etaMinutes, lastUpdate }: { etaMinutes: number | null; lastUpdate: string | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (etaMinutes == null) return <span className="text-muted-foreground">—</span>;
  const start = lastUpdate ? new Date(lastUpdate).getTime() : now;
  const remainingMs = etaMinutes * 60_000 - (now - start);
  const total = Math.max(0, Math.floor(remainingMs / 1000));
  const m = Math.floor(total / 60), s = total % 60;
  return <span className="font-mono tabular-nums">{m.toString().padStart(2, "0")}:{s.toString().padStart(2, "0")}</span>;
}
