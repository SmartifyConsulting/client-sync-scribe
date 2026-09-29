import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

const fmt = (n: number) => `R${Math.round(n).toLocaleString("en-ZA")}`;

/** Yearly targets vs. issued business and commission for the signed-in Wealth Manager. */
export function TargetsCommission() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const year = new Date().getFullYear();

  const { data: target } = useQuery({
    queryKey: ["wealth-targets", user?.id, year],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("wealth_targets" as any).select("*").eq("user_id", user!.id).eq("year", year).maybeSingle();
      return data as any;
    },
  });

  const { data: apps = [] } = useQuery({
    queryKey: ["wealth-issued", year],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("wealth_applications" as any)
        .select("product, provider, monthly_premium, commission_amount, issued_at")
        .eq("status", "issued").gte("issued_at", `${year}-01-01`);
      return (data as any[]) ?? [];
    },
  });

  const [form, setForm] = useState({ policies: "", premium: "", commission: "" });
  useEffect(() => {
    if (target) setForm({ policies: String(target.annual_policies_target ?? ""), premium: String(target.annual_premium_target ?? ""), commission: String(target.annual_commission_target ?? "") });
  }, [target]);

  const save = async () => {
    const { error } = await supabase.from("wealth_targets" as any).upsert({
      user_id: user!.id, year,
      annual_policies_target: Number(form.policies) || 0,
      annual_premium_target: Number(form.premium) || 0,
      annual_commission_target: Number(form.commission) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,year" });
    if (error) return toast({ title: "Targets not saved", description: error.message, variant: "destructive" });
    toast({ title: "Targets saved" });
    qc.invalidateQueries({ queryKey: ["wealth-targets"] });
  };

  const policies = apps.length;
  const premium = apps.reduce((s, a) => s + Number(a.monthly_premium || 0), 0);
  const commission = apps.reduce((s, a) => s + Number(a.commission_amount || 0), 0);
  const byInsurer = apps.reduce<Record<string, number>>((m, a) => { const k = a.provider || "Other"; m[k] = (m[k] || 0) + Number(a.commission_amount || 0); return m; }, {});

  const rows = [
    { label: "Policies issued", actual: policies, goal: Number(form.policies) || 0, show: (n: number) => String(n) },
    { label: "Monthly premium written", actual: premium, goal: Number(form.premium) || 0, show: fmt },
    { label: "Commission earned", actual: commission, goal: Number(form.commission) || 0, show: fmt },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Set your {year} targets and track issued business against them.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5"><Label>Policies target</Label><Input type="number" value={form.policies} onChange={(e) => setForm({ ...form, policies: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Monthly premium target (R)</Label><Input type="number" value={form.premium} onChange={(e) => setForm({ ...form, premium: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Commission target (R)</Label><Input type="number" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} /></div>
      </div>
      <Button size="sm" onClick={save}>Save targets</Button>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="space-y-1">
            <div className="flex justify-between text-xs"><span className="font-medium">{r.label}</span><span className="text-muted-foreground">{r.show(r.actual)} of {r.show(r.goal)}</span></div>
            <Progress value={r.goal ? Math.min(100, (r.actual / r.goal) * 100) : 0} />
          </div>
        ))}
      </div>
      {Object.keys(byInsurer).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold">Commission by insurer</p>
          {Object.entries(byInsurer).map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs"><span>{k}</span><span>{fmt(v)}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}
