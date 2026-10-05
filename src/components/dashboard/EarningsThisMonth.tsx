import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Panel } from "@/components/ui/Panel";
import { ArrowRight, Wallet } from "lucide-react";

const fmt = (n: number) => `R${Math.round(n).toLocaleString("en-ZA")}`;

/** Commission earned on policies issued so far this calendar month. */
export function EarningsThisMonth() {
  const { user } = useAuth();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const { data: apps = [] } = useQuery({
    queryKey: ["dashboard-earnings-month", user?.id, monthStart],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("wealth_applications" as any)
        .select("id, monthly_premium, commission_amount, issued_at")
        .eq("status", "issued").gte("issued_at", monthStart);
      return (data as any[]) ?? [];
    },
  });

  const policies = apps.length;
  const premium = apps.reduce((s, a) => s + Number(a.monthly_premium || 0), 0);
  const commission = apps.reduce((s, a) => s + Number(a.commission_amount || 0), 0);

  return (
    <Panel title="Earnings for the Month" icon={Wallet}>
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Policies issued" value={String(policies)} />
          <Stat label="Premium written" value={fmt(premium)} />
          <Stat label="Commission" value={fmt(commission)} />
        </div>
        <Link to="/practice?tab=earnings" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          View earnings &amp; targets <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-2">
      <p className="text-base font-semibold text-foreground truncate">{value}</p>
      <p className="text-2xs text-muted-foreground">{label}</p>
    </div>
  );
}
