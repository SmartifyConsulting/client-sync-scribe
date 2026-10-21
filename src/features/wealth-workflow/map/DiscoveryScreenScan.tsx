import { useEffect, useState } from "react";
import { ScanSearch, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { addonInstalled } from "./InsurerLogin";

const Field = z.object({ label: z.string().max(90), kind: z.enum(["select", "checkbox", "radio", "input"]), required: z.boolean(), disabled: z.boolean(), options: z.array(z.string().max(90)).max(40) });
const Scan = z.object({ state: z.enum(["fields", "no-fields", "verification"]), fields: z.array(Field).max(100), blocked: z.number().nonnegative(), frames: z.number().nonnegative(), truncated: z.boolean() });

export function DiscoveryScreenScan({ workflowId, connected }: { workflowId: string; connected: boolean }) {
  const [scan, setScan] = useState<z.infer<typeof Scan> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setScan(null); setError(""); setBusy(false);
    const receive = (e: MessageEvent) => {
      const d = e.data;
      if (e.source !== window || e.origin !== location.origin || d?.source !== "holarc-extension" || d.type !== "insurer-scan-result" || d.workflowId !== workflowId || !/^discovery$/i.test(d.insurer)) return;
      setBusy(false);
      const parsed = Scan.safeParse(d.scan);
      if (!d.ok || !parsed.success) { setError("Could not scan Discovery. Reconnect and try again."); return; }
      setError(""); setScan(parsed.data);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [workflowId]);
  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => { setBusy(false); setError("No scan received. Load Companion version 1.3.0, refresh Holarc Wealth and reconnect Discovery."); }, 15000);
    return () => window.clearTimeout(timer);
  }, [busy]);
  return <div className="space-y-1.5 border-y border-border py-2 text-xs">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="font-medium">Discovery · Field verification</span>
      <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!connected || busy} onClick={() => {
        if (!addonInstalled()) { setError("Set up the Holarc Wealth Companion first."); return; }
        setError(""); setBusy(true);
        window.postMessage({ source: "holarc", type: "insurer-scan", insurer: "Discovery", workflowId }, location.origin);
      }}>{busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ScanSearch className="mr-1 h-3 w-3" />}Scan current screen</Button>
    </div>
    <p className="text-[10px] text-muted-foreground">Read-only · Quote submission and scenario accuracy not yet verified</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {scan && <>
      <p role="status" className="text-muted-foreground">{scan.state === "verification" ? "Discovery is still asking for verification." : scan.state === "no-fields" ? "No supported quote fields found on this screen. Quote-form landing is not confirmed." : `${scan.fields.length} quote fields found · Values were not collected`}</p>
      {scan.fields.length > 0 && <details>
        <summary className="cursor-pointer font-medium">Captured field list</summary>
        <div className="mt-1 max-h-64 overflow-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr className="border-b border-border text-muted-foreground"><th className="py-1 font-medium">Portal field</th><th className="py-1 font-medium">Control</th><th className="py-1 font-medium">Available options</th></tr></thead>
            <tbody>{scan.fields.map((f, i) => <tr key={i} className="border-b border-border"><td className="py-1 pr-2">{f.label}{f.required ? " *" : ""}{f.disabled ? " (disabled)" : ""}</td><td className="py-1 pr-2">{f.kind}</td><td className="py-1">{f.options.join(" · ") || "—"}</td></tr>)}</tbody>
          </table>
        </div>
      </details>}
      {(scan.frames > 0 || scan.truncated) && <p className="text-muted-foreground">Partial scan{scan.frames ? " · Embedded screens not inspected" : ""}{scan.truncated ? " · First 100 fields shown" : ""}</p>}
    </>}
  </div>;
}