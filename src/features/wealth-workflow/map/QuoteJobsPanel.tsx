import { coverOptionLabel } from "./quoteSpec";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Clock, RotateCcw, Square } from "lucide-react";
import { SegmentedProgress } from "./SegmentedProgress";
import { Button } from "@/components/ui/button";
import { SCENARIO_TEXT, isStalled, needsRetry, quoteCheckpoints, type QuoteJobs } from "./quoteJobs";
import { insurerColor } from "./insurerColors";

/** Shows confirmed milestones, rather than an invented percentage or a simulated clock-based fill. */
export function QuoteJobsPanel({ jobs, onRetry, onStop }: { jobs: QuoteJobs; onRetry: (insurer: string, n: number) => void; onStop?: (insurer: string) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const insurers = Object.keys(jobs).filter(ins => Array.isArray(jobs[ins]) && jobs[ins].length);
  if (!insurers.length) return null;
  return <div className="space-y-3 rounded-lg border border-border p-3" aria-label="Quote activity">
    <p className="text-xs font-semibold">Quote activity</p>
    {insurers.map(ins => <div key={ins} className="space-y-2">
      <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `hsl(${insurerColor(ins)})`, color: "hsl(var(--insurer-foreground))" }}>{ins}</span>
      {jobs[ins].map(j => {
        const stalled = isStalled(j, now), retry = needsRetry(j, now);
        const active = ["submitting", "generating"].includes(j.status) && !stalled;
        const Icon = j.status === "captured" ? CheckCircle2 : retry ? AlertCircle : j.status === "stopped" ? Square : Clock;
        return <section key={j.n} aria-label={`${ins} ${coverOptionLabel(j.n - 1)} activity`} className="rounded-lg bg-muted/40 p-3">
          <div className="flex items-start gap-3">
            <Icon className={`h-5 w-5 shrink-0 ${retry ? "text-destructive" : j.status === "captured" ? "text-success" : ""}`} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-semibold">Quote {j.n} · {coverOptionLabel(j.n - 1)}</p>
              <SegmentedProgress label={`${ins} ${coverOptionLabel(j.n - 1)} progress`} completed={quoteCheckpoints(j).filter(p => p.done).length} active={active} />
              <p role="status" className="text-xs">{j.pdfReceived && j.status === "generating" ? "Saving quote PDF…" : stalled ? "Waiting for the insurer · no recent response" : SCENARIO_TEXT[j.status]}</p>
              {active && <p className="text-xs text-muted-foreground">Waiting for {j.pdfReceived ? "Holarc" : ins} · {Math.max(0, Math.floor((now - j.since) / 1000))}s</p>}
              {j.status === "queued" && <p className="text-xs text-muted-foreground">Waiting for this option to start.</p>}
              {j.detail && !j.pdfReceived && j.detail !== SCENARIO_TEXT[j.status] && <p className="break-words text-xs text-muted-foreground">{j.detail}</p>}
            </div>
            {retry && <Button variant="outline" size="sm" onClick={() => onRetry(ins, j.n)}><RotateCcw className="mr-1 h-3 w-3" />Retry</Button>}
            {onStop && ["queued", "submitting", "generating"].includes(j.status) && <Button variant="outline" size="sm" aria-label={`Stop ${ins} quote requests`} onClick={() => onStop(ins)}>Stop</Button>}
          </div>
        </section>;
      })}
    </div>)}
    <p className="text-[10px] text-muted-foreground">Squares fill at confirmed checkpoints: connected, request started, PDF received, saved. Keep this Holarc tab open.</p>
  </div>;
}
