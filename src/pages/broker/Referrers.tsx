import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const db = supabase as any;

export default function Referrers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [edited, setEdited] = useState<Record<string, string>>({});

  const referrals = useQuery({
    queryKey: ["broker-referrals", user?.id],
    enabled: !!user,
    queryFn: async () => (await db.from("wealth_referrals").select("*").eq("broker_user_id", user!.id)).data ?? [],
  });

  const rates = useQuery({
    queryKey: ["broker-referrer-rates", user?.id],
    enabled: !!user,
    queryFn: async () => (await db.from("wealth_referrer_rates").select("*").eq("broker_user_id", user!.id)).data ?? [],
  });

  const referrerIds = useMemo(() => Array.from(new Set((referrals.data ?? []).map((r: any) => r.referrer_user_id))), [referrals.data]);
  const names = useQuery({
    queryKey: ["referrer-names", referrerIds],
    enabled: referrerIds.length > 0,
    queryFn: async () => (await db.from("profiles").select("id,full_name").in("id", referrerIds)).data ?? [],
  });
  const nameFor = (id: string) => (names.data ?? []).find((n: any) => n.id === id)?.full_name ?? "Referrer";
  const rateFor = (id: string) => (rates.data ?? []).find((r: any) => r.referrer_user_id === id)?.commission_rate ?? 10;

  const rows = useMemo(() => referrerIds.map((id) => {
    const mine = (referrals.data ?? []).filter((r: any) => r.referrer_user_id === id);
    return {
      id,
      name: nameFor(id),
      sent: mine.length,
      accepted: mine.filter((r: any) => r.status === "accepted").length,
      earned: mine.reduce((s: number, r: any) => s + Number(r.actual_commission || 0), 0),
    };
  }), [referrerIds, referrals.data, names.data]);

  const saveRate = async (referrerId: string, value: string) => {
    const rate = Number(value);
    if (Number.isNaN(rate) || rate < 0) return;
    const { error } = await db.from("wealth_referrer_rates").upsert({ broker_user_id: user!.id, referrer_user_id: referrerId, commission_rate: rate }, { onConflict: "broker_user_id,referrer_user_id" });
    if (error) return toast.error("Couldn't save the commission rate.");
    toast.success("Commission rate updated");
    qc.invalidateQueries({ queryKey: ["broker-referrer-rates"] });
  };

  const zar = (n: number) => `R${Math.round(n).toLocaleString("en-ZA")}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Referrers" subtitle="Everyone referring clients to you, and the commission rate you offer each one." />

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {referrals.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : !rows.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No referrers yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Referrer</th>
                <th className="px-4 py-2 font-medium">Referred</th>
                <th className="px-4 py-2 font-medium">Accepted</th>
                <th className="px-4 py-2 font-medium">Paid out</th>
                <th className="px-4 py-2 font-medium">Commission rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2 font-medium text-foreground">{r.name}</td>
                  <td className="px-4 py-2">{r.sent}</td>
                  <td className="px-4 py-2"><Badge variant="secondary" className="text-2xs">{r.accepted}</Badge></td>
                  <td className="px-4 py-2 text-primary">{r.earned ? zar(r.earned) : "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <Input
                        className="h-7 w-16 text-xs"
                        type="number" min={0} max={100} step={0.5}
                        value={edited[r.id] ?? rateFor(r.id)}
                        onChange={(e) => setEdited((v) => ({ ...v, [r.id]: e.target.value }))}
                        onBlur={(e) => saveRate(r.id, e.target.value)}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
