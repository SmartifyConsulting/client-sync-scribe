import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtR } from "@/features/wealth-workflow/map/money";

const num = (v: any) => Number(String(v ?? "").replace(/[^\d.]/g, "")) || 0;
const KINDS = ["Life", "Income protection", "Disability", "Severe illness"];

/** Broker-facing summary of the client's current cover, so new advice doesn't over-extend them. */
export function ExistingCoverCard({ patientId }: { patientId: string }) {
  const { data } = useQuery({
    queryKey: ["existing-cover", patientId],
    queryFn: async () => (await (supabase as any).from("client_financial_profiles").select("risk_portfolio").eq("patient_id", patientId).maybeSingle()).data,
  });
  const policies: any[] = data?.risk_portfolio?.policies ?? [];
  const sum = (k: string) => policies.filter((p) => String(p.kind ?? "").toLowerCase().startsWith(k.toLowerCase())).reduce((a, p) => a + num(p.cover), 0);
  const premium = policies.reduce((a, p) => a + num(p.premium), 0);

  return (
    <div className="col-span-2 rounded-lg border border-border/50 bg-card p-2 shadow-sm md:col-span-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Existing cover · {policies.length} polic{policies.length === 1 ? "y" : "ies"}</p>
        <ShieldCheck className="h-4 w-4 text-primary" />
      </div>
      {policies.length ? (
        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] tabular-nums sm:grid-cols-5">
          {KINDS.map((k) => (
            <div key={k}><span className="text-muted-foreground">{k}</span><p className="font-semibold text-foreground">{fmtR(sum(k))}</p></div>
          ))}
          <div><span className="text-muted-foreground">Premiums / month</span><p className="font-semibold text-foreground">{fmtR(premium)}</p></div>
        </div>
      ) : <p className="mt-1 text-[11px] text-muted-foreground">No existing policies captured yet.</p>}
    </div>
  );
}
