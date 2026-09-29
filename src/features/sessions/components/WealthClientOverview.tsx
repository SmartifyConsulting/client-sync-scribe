import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Briefcase, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClientWealth, zar } from "@/features/wealth-workflow/client/useClientWealth";

/** Consultation-screen recap of the client's financial position (replaces the clinical overview). */
export function WealthClientOverview({ patient, discSlot }: { patient: any | undefined; discSlot?: ReactNode }) {
  const { data: w, isLoading } = useClientWealth(patient?.id);
  const { data: lastConsult } = useQuery({
    queryKey: ["last-consultation", patient?.id],
    enabled: !!patient?.id,
    queryFn: async () =>
      (await supabase.from("sessions").select("started_at").eq("patient_id", patient!.id).neq("status", "paused").order("started_at", { ascending: false }).limit(1).maybeSingle()).data?.started_at ?? null,
  });

  const t = w?.totals;
  const name = patient?.name || "This client";
  const headline = !w
    ? ""
    : [
        w.stageLabel ? `${name} is at ${w.stageLabel}.` : `${name} has no active journey yet.`,
        t?.netWorth ? `Estimated net worth ${zar(t.netWorth)}.` : "",
        w.issued.length ? `${w.issued.length} polic${w.issued.length === 1 ? "y" : "ies"} issued.` : "",
      ].filter(Boolean).join(" ");

  const Cell = ({ label, value }: { label: string; value: ReactNode }) => (
    <div className="min-w-0">
      <p className="text-xs font-bold text-foreground mb-0.5">{label}</p>
      <p className="text-xs text-foreground">{value}</p>
    </div>
  );

  return (
    <div className="flex flex-col rounded-xl border border-primary bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-primary/5">
        <Briefcase className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-medium text-foreground">Client Overview</p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {discSlot && <div className="mb-2 pb-2 border-b border-border">{discSlot}</div>}
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building overview...
          </div>
        ) : (
          <div className="space-y-2">
            {headline && <p className="text-xs leading-relaxed text-foreground">{headline}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Cell label="Journey stage" value={w?.stageLabel ?? "Not started"} />
              <Cell label="Existing cover" value={t?.lifeCover ? `${zar(t.lifeCover)} life` : "None captured"} />
              <Cell label="Monthly premiums" value={t?.monthlyPremiums ? zar(t.monthlyPremiums) : "None captured"} />
              <Cell label="Net worth" value={t?.assets ? zar(t.netWorth) : "Not captured"} />
              <Cell label="Risk profile" value={w?.goals.riskProfile ?? "Not set"} />
              <Cell label="Retirement goal" value={w?.goals.retirementAge ? `Age ${w.goals.retirementAge}` : "Not set"} />
            </div>
            <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Cell label="Goals" value={w?.goals.goals || "None recorded"} />
              <Cell label="Last consultation" value={lastConsult ? format(new Date(lastConsult), "d MMM yyyy") : "None recorded"} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
