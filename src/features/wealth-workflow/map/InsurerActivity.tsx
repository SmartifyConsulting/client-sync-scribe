import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { insurerColor } from "./insurerColors";
import { ACTIVITY_TEXT, activityWaiting, type QuoteActivity } from "./quoteActivity";

export function InsurerActivity({ insurer, activity, onRetry }: { insurer: string; activity?: QuoteActivity; onRetry: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  if (!activity) return null;
  const stalled = activityWaiting(activity, now);
  const error = ["failed", "pdf-error", "no-fields"].includes(activity.phase);
  const complete = ["fields", "saved"].includes(activity.phase);
  const paused = ["otp", "email"].includes(activity.phase);
  const elapsed = Math.max(0, Math.floor((now - activity.since) / 1000));
  return <section aria-label={`${insurer} background activity`} className="flex items-start gap-2 border-b border-border py-2 text-xs">
    <div className="shrink-0" style={{ color: `hsl(${insurerColor(insurer)})` }}>
      {complete ? <CheckCircle2 className="h-8 w-8" /> : error || stalled ? <AlertCircle className="h-8 w-8" /> :
        <svg viewBox="0 0 32 32" className={`h-8 w-8 ${paused ? "" : "animate-spin motion-reduce:animate-none"}`} aria-label={paused ? "Waiting for verification" : "Background activity"}>
          <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.2" />
          <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="25 57" />
        </svg>}
    </div>
    <div className="min-w-0 flex-1 space-y-1">
      <p role="status" className="font-medium text-foreground">{insurer} · {ACTIVITY_TEXT[activity.phase]}</p>
      {activity.detail && <p className="break-words text-destructive">{activity.detail}</p>}
      {(stalled || paused) && <p className="text-muted-foreground">{stalled ? `No advance for ${elapsed}s at this step. The portal may be slow or need attention.` : `Awaiting your verification · ${elapsed}s`}</p>}
      <ol className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground" aria-label="Recent activity">
        {activity.history.map((entry) => <li key={`${entry.at}-${entry.phase}`}>{new Date(entry.at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · {ACTIVITY_TEXT[entry.phase]}</li>)}
      </ol>
    </div>
    {(stalled || activity.phase === "failed") && <Button variant="outline" size="sm" onClick={onRetry}><RotateCw className="mr-1 h-3 w-3" />Retry</Button>}
  </section>;
}