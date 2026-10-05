import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";

const db = supabase as any;
const zar = (n: number) => `R${Math.round(n).toLocaleString("en-ZA")}`;
const monthKey = (d: string) => new Date(d).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });

export default function ReferrerCommissions() {
  const { user } = useAuth();

  const brokers = useQuery({
    queryKey: ["wealth-brokers"],
    queryFn: async () => (await db.rpc("wealth_list_brokers")).data ?? [],
  });

  const referrals = useQuery({
    queryKey: ["my-referrals", user?.id],
    enabled: !!user,
    queryFn: async () => (await db.from("wealth_referrals").select("*").eq("referrer_user_id", user!.id)).data ?? [],
  });

  const brokerName = (id: string) => (brokers.data ?? []).find((b: any) => b.id === id)?.full_name ?? "Broker";

  const groups = useMemo(() => {
    const rows = (referrals.data ?? []).filter((r: any) => r.commission != null);
    const byKey = new Map<string, { broker: string; month: string; commission: number }>();
    for (const r of rows) {
      const key = `${r.broker_user_id}|${monthKey(r.decided_at ?? r.created_at)}`;
      const g = byKey.get(key) ?? { broker: brokerName(r.broker_user_id), month: monthKey(r.decided_at ?? r.created_at), commission: 0 };
      g.commission += Number(r.commission);
      byKey.set(key, g);
    }
    return Array.from(byKey.values()).sort((a, b) => a.broker.localeCompare(b.broker));
  }, [referrals.data, brokers.data]);

  const total = useMemo(() => groups.reduce((s, g) => s + g.commission, 0), [groups]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Brokers & Commission" subtitle="Commission from quotes, grouped by broker and month." />

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Total commission</p>
        <p className="mt-1 text-2xl font-semibold text-primary">{zar(total)}</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {referrals.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : !groups.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No commission activity yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Broker</th>
                <th className="px-4 py-2 font-medium">Month</th>
                <th className="px-4 py-2 font-medium">Commission</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2 font-medium text-foreground">{g.broker}</td>
                  <td className="px-4 py-2 text-muted-foreground">{g.month}</td>
                  <td className="px-4 py-2 text-primary">{zar(g.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
