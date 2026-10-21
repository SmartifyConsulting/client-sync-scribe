import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCENARIO_TEXT, isStalled, needsRetry, type QuoteJobs } from "./quoteJobs";
import { insurerColor } from "./insurerColors";

/** Quote 1-3 for every insurer, side by side, with per-quote retry. */
export function QuoteJobsPanel({ jobs, onRetry }: { jobs: QuoteJobs; onRetry: (insurer: string, n: number) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  const insurers = Object.keys(jobs);
  if (!insurers.length) return null;
  return (
    <div className="space-y-1 rounded border border-border/60 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Quotes in progress</p>
      {insurers.map((ins) => (
        <div key={ins} className="flex flex-wrap items-center gap-1.5">
          <span className="w-20 truncate rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: `hsl(${insurerColor(ins)})`, color: "hsl(var(--insurer-foreground))" }}>{ins}</span>
          {jobs[ins].map((j) => {
            const stalled = isStalled(j, now);
            const Icon = j.status === "captured" ? CheckCircle2 : j.status === "queued" ? Clock : needsRetry(j, now) ? AlertCircle : Loader2;
            return (
              <span key={j.n} title={j.detail} className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[10px]">
                <Icon className={`h-3 w-3 ${Icon === Loader2 ? "animate-spin" : ""} ${needsRetry(j, now) ? "text-destructive" : j.status === "captured" ? "text-success" : "text-muted-foreground"}`} />
                <b>Quote {j.n}</b> · Option {String.fromCharCode(64 + j.n)} · {stalled ? `No reply for ${Math.round((now - j.since) / 1000)}s` : SCENARIO_TEXT[j.status]}
                {needsRetry(j, now) && <Button variant="link" size="sm" className="h-auto px-0.5 text-[10px]" onClick={() => onRetry(ins, j.n)}><RotateCcw className="mr-0.5 h-2.5 w-2.5" />Retry</Button>}
              </span>
            );
          })}
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground">Insurers run at the same time in background tabs. Keep this Holarc Wealth tab open — you can work in other browser tabs meanwhile.</p>
    </div>
  );
}
