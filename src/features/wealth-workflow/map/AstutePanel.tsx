import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { safeInvoke } from "@/services/edge/safeInvoke";

const rand = (n: number | null) => (n == null ? "—" : `R${Number(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`);

export function AstutePanel({ patientId, holdings, viewer }: { patientId?: string; holdings: any[]; viewer: "manager" | "client" }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const last = holdings.reduce<string | null>((m, h) => (!m || h.synced_at > m ? h.synced_at : m), null);
  const ref = holdings[0]?.reference;

  const pull = async () => {
    if (!patientId) return;
    setBusy(true);
    const { data, error } = await safeInvoke<any>("astute-sync", { patientId });
    setBusy(false);
    const msg = (data as any)?.error ?? error;
    if (msg || !data?.ok) { toast({ title: "Astute pull didn't finish", description: msg ?? "Please try again.", variant: "destructive" }); return; }
    toast({ title: `${data.count} policies pulled from Astute`, description: `Reference ${data.reference}` });
    qc.invalidateQueries({ queryKey: ["wealth-map-records"] });
  };

  return (
    <div className="text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Policies found by Astute</p>
          <p className="text-2xs text-muted-foreground">
            {last ? `Last synced ${format(new Date(last), "d MMM yyyy, HH:mm")}${ref ? ` · ${ref}` : ""}` : "Not synced yet"}
          </p>
        </div>
        {viewer === "manager" && (
          <Button size="sm" variant="outline" className="rounded-full" onClick={pull} disabled={busy || !patientId}>
            <RefreshCw className={busy ? "mr-1.5 h-3.5 w-3.5 animate-spin" : "mr-1.5 h-3.5 w-3.5"} />
            {busy ? "Pulling…" : "Pull from Astute"}
          </Button>
        )}
      </div>
      {holdings.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left text-2xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-2 py-1.5">Provider</th><th className="px-2 py-1.5">Product</th><th className="px-2 py-1.5">Status</th><th className="px-2 py-1.5 text-right">Premium</th><th className="px-2 py-1.5 text-right">Cover / value</th></tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.id} className="border-t">
                  <td className="px-2 py-1.5 font-medium">{h.provider}</td>
                  <td className="px-2 py-1.5"><span className="block">{h.product ?? "—"}</span><span className="text-2xs text-muted-foreground">{h.policy_number}</span></td>
                  <td className="px-2 py-1.5">{h.status ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right">{rand(h.premium)}{h.premium_frequency ? <span className="text-2xs text-muted-foreground"> /{h.premium_frequency.toLowerCase()}</span> : null}</td>
                  <td className="px-2 py-1.5 text-right">{rand(h.asset_value ?? h.life_cover ?? h.dread_cover ?? h.disability_cover)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          {viewer === "manager" ? "Pull from Astute to bring in this client's life, disability and investment policies." : "Your Wealth Manager will bring in your existing policies here."}
        </p>
      )}
    </div>
  );
}
