import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtR } from "@/features/wealth-workflow/map/money";
import { InsurerBadge } from "@/features/wealth-workflow/map/insurerColors";

const num = (v: any) => Number(String(v ?? "").replace(/[^\d.]/g, "")) || 0;

/** Broker-facing summary of the client's current cover (per policy, with insurer), so new advice doesn't over-extend them. */
export function ExistingCoverCard({ patientId }: { patientId: string }) {
  const { data } = useQuery({
    queryKey: ["existing-cover", patientId],
    queryFn: async () => (await (supabase as any).from("client_financial_profiles").select("risk_portfolio").eq("patient_id", patientId).maybeSingle()).data,
  });
  const policies: any[] = data?.risk_portfolio?.policies ?? [];
  const premium = policies.reduce((a, p) => a + num(p.premium), 0);

  return (
    <div className="rounded-xl border-2 border-primary/40 bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="text-sm font-semibold text-foreground">Existing cover</p>
          <span className="text-xs text-muted-foreground">{policies.length} polic{policies.length === 1 ? "y" : "ies"}</span>
        </div>
        {policies.length > 0 && (
          <p className="text-xs text-muted-foreground">Premiums / month <span className="ml-1 text-sm font-bold tabular-nums text-foreground">{fmtR(premium)}</span></p>
        )}
      </div>
      {policies.length ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {policies.map((p, i) => (
            <div key={i} className="rounded-lg border border-border/60 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">{p.kind ?? "Policy"}</span>
                {p.insurer && <InsurerBadge provider={p.insurer} />}
              </div>
              <p className="mt-1 text-base font-bold tabular-nums text-foreground">
                {fmtR(num(p.cover))}{/income/i.test(p.kind ?? "") && <span className="text-xs font-normal text-muted-foreground"> /month</span>}
              </p>
              {num(p.premium) > 0 && <p className="text-[11px] tabular-nums text-muted-foreground">Premium {fmtR(num(p.premium))} /month</p>}
            </div>
          ))}
        </div>
      ) : <p className="text-xs text-muted-foreground">No existing policies captured yet.</p>}
    </div>
  );
}
