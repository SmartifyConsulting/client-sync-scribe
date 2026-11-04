import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, RotateCw, Square, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { insurerColor } from "./insurerColors";
import { ACTIVITY_TEXT, activityWaiting, type QuoteActivity } from "./quoteActivity";

export function InsurerActivity({ insurer, activity, onRetry, onStop, canStop, idleText = "Not connected yet", idleAction = "Connect" }: { insurer: string; activity?: QuoteActivity; onRetry: () => void; onStop?: () => void; canStop?: boolean; idleText?: string; idleAction?: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  if (!insurer) return null;
  if (!activity) return <section aria-label={`${insurer} background activity`} className="flex items-center gap-2 py-2 text-xs">
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" style={{ color: `hsl(${insurerColor(insurer)})` }} aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.25" />
    </svg>
    <p role="status" className="flex-1 font-medium text-foreground">{insurer} · {idleText}</p>
    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onRetry}>{idleAction}</Button>
    {onStop && canStop && <Button variant="outline" size="sm" onClick={onStop}>Stop</Button>}
  </section>;
  const stalled = activityWaiting(activity, now);
  const error = ["failed", "pdf-error", "no-fields"].includes(activity.phase);
  const complete = ["connected", "reconnected", "fields", "saved", "stopped"].includes(activity.phase);
  const paused = ["otp", "email", "unlock-required"].includes(activity.phase);
  const elapsed = Math.max(0, Math.floor((now - activity.since) / 1000));
  return <section aria-label={`${insurer} background activity`} className="flex items-start gap-3 py-2 text-xs">
    <div className="shrink-0" style={{ color: `hsl(${insurerColor(insurer)})` }}>
      {activity.phase === "stopped" ? <Square className="h-8 w-8" /> : complete ? <CheckCircle2 className="h-8 w-8" /> : error || stalled ? <AlertCircle className="h-8 w-8" /> :
        <Hourglass className={`h-12 w-12 ${paused ? "" : "animate-pulse motion-reduce:animate-none"}`} aria-label={paused ? "Waiting for your input" : "Background activity"} />}
    </div>
    <div className="min-w-0 flex-1 space-y-1">
      <p role="status" className="font-medium text-foreground">{insurer} · {ACTIVITY_TEXT[activity.phase]}</p>
      {activity.detail && <p className="break-words text-destructive">{activity.detail}</p>}
      {!complete && !error && <p className="text-muted-foreground">{paused ? "Waiting for your input" : ["unlocking", "opening"].includes(activity.phase) ? "Waiting for Holarc" : `Waiting for ${insurer}`} · {elapsed}s</p>}
      {stalled && <p className="text-muted-foreground">No advance at this step. The portal may be slow or need attention.</p>}
      <details className="pt-1">
      <summary className="cursor-pointer text-xs text-muted-foreground">Connection history</summary>
      <ol className="mt-2 space-y-1 text-xs text-muted-foreground" aria-label="Recent activity">
        {activity.history.map((entry) => <li key={`${entry.at}-${entry.phase}`}>{new Date(entry.at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · {ACTIVITY_TEXT[entry.phase]}</li>)}
      </ol>
      </details>
    </div>
    {(stalled || activity.phase === "failed") && <Button variant="outline" size="sm" onClick={onRetry}><RotateCw className="mr-1 h-3 w-3" />Retry</Button>}
    {activity.phase === "stopped" && <Button variant="outline" size="sm" onClick={onRetry}>Connect</Button>}
    {onStop && canStop && <Button variant="outline" size="sm" onClick={onStop}>Stop</Button>}
  </section>;
}
