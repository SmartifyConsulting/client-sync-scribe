import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CreditCard, Loader2 } from "lucide-react";

const zar = (n: number) => `R${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

export function BillingPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("billing");
    if (p === "success") toast.success("Payment received. Your subscription will show as active in a moment.");
    if (p === "cancelled") toast("Checkout cancelled. No payment was taken.");
  }, []);

  const plans = useQuery({
    queryKey: ["billing-plans"],
    queryFn: async () => (await (supabase as any).from("pricing_config").select("*").eq("currency" as any, "ZAR").order("price")).data ?? [],
  });
  const subs = useQuery({
    queryKey: ["billing-subs", user?.id], enabled: !!user,
    queryFn: async () => (await (supabase as any).from("subscriptions").select("*").eq("user_id", user!.id).eq("provider" as any, "payfast").order("created_at", { ascending: false })).data ?? [],
  });
  const history = useQuery({
    queryKey: ["billing-history", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("payment_history").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(24)).data ?? [],
  });

  const current = (subs.data as any[])?.find((s) => ["active", "past_due"].includes(s.status));
  const currentPlan = (plans.data as any[])?.find((p) => p.id === current?.pricing_id);

  const subscribe = async (pricing_id: string) => {
    setBusy(pricing_id);
    const { data, error } = await supabase.functions.invoke("payfast-checkout", {
      body: { pricing_id, return_url: window.location.href.split("?")[0] },
    });
    if (error || data?.error) { setBusy(null); toast.error("Couldn't open PayFast checkout. Please try again."); return; }
    const form = document.createElement("form");
    form.method = "POST"; form.action = data.action;
    Object.entries(data.fields as Record<string, string>).forEach(([k, v]) => {
      const i = document.createElement("input"); i.type = "hidden"; i.name = k; i.value = v; form.appendChild(i);
    });
    document.body.appendChild(form); form.submit();
  };

  const cancel = async () => {
    if (!current || !confirm("Cancel your subscription? Billing stops from the next cycle.")) return;
    setBusy("cancel");
    const { data, error } = await supabase.functions.invoke("payfast-manage", { body: { subscription_id: current.id, action: "cancel" } });
    setBusy(null);
    if (error || data?.error) return toast.error(data?.error ?? "Couldn't cancel. Please try again.");
    toast.success("Subscription cancelled.");
    qc.invalidateQueries({ queryKey: ["billing-subs"] });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />Current plan</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {current ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{currentPlan?.name ?? current.plan_type}</span>
                <Badge variant={current.status === "active" ? "default" : "destructive"}>{current.status === "active" ? "Active" : "Payment failed"}</Badge>
              </div>
              <p className="text-muted-foreground">{zar(current.amount)} per month · Next billing {current.current_period_end ? new Date(current.current_period_end).toLocaleDateString("en-ZA") : "—"}</p>
              <Button variant="outline" size="sm" onClick={cancel} disabled={busy === "cancel"}>
                {busy === "cancel" && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Cancel subscription
              </Button>
            </>
          ) : <p className="text-muted-foreground">You don't have a paid subscription yet. Choose a plan below.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {(plans.data as any[] ?? []).map((p) => (
          <Card key={p.id} className={p.id === current?.pricing_id ? "border-primary" : ""}>
            <CardContent className="pt-6 space-y-3">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-2xl font-bold text-primary-dark">{zar(p.price)}<span className="text-sm font-normal text-muted-foreground"> / month</span></p>
              </div>
              <Button className="w-full min-h-11" disabled={!!busy || p.id === current?.pricing_id} onClick={() => subscribe(p.id)}>
                {busy === p.id && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {p.id === current?.pricing_id ? "Current plan" : current ? "Change to this plan" : "Subscribe with PayFast"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Payment history</CardTitle></CardHeader>
        <CardContent>
          {(history.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No payments yet.</p> : (
            <ul className="divide-y text-sm">
              {(history.data as any[]).map((h) => (
                <li key={h.id} className="flex justify-between py-2">
                  <span>{new Date(h.created_at).toLocaleDateString("en-ZA")} · {h.description}</span>
                  <span className="font-medium">{zar(h.amount)} <span className="text-muted-foreground capitalize">({h.status})</span></span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
