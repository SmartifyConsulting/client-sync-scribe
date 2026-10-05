import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const db = supabase as any;
const zar = (n: number) => `R${Math.round(n).toLocaleString("en-ZA")}`;
const fmt = (d: string) => new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });

const STATUS_LABEL: Record<string, string> = { pending: "Awaiting response", accepted: "Accepted", rejected: "Declined" };
const STATUS_COLOR: Record<string, string> = {
  pending: "border-amber-400/50 text-amber-600", accepted: "border-primary/40 text-primary", rejected: "border-destructive/40 text-destructive",
};

export default function ReferrerDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reassigning, setReassigning] = useState<string | null>(null);
  const [f, setF] = useState({ clientName: "", clientEmail: "", clientPhone: "", need: "", brokerId: "" });
  const [busy, setBusy] = useState(false);

  const brokers = useQuery({
    queryKey: ["wealth-brokers"],
    queryFn: async () => (await db.rpc("wealth_list_brokers")).data ?? [],
  });

  const referrals = useQuery({
    queryKey: ["my-referrals", user?.id],
    enabled: !!user,
    queryFn: async () => (await db.from("wealth_referrals").select("*").eq("referrer_user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const brokerName = (id: string) => (brokers.data ?? []).find((b: any) => b.id === id)?.full_name ?? "—";

  const resetForm = () => setF({ clientName: "", clientEmail: "", clientPhone: "", need: "", brokerId: "" });

  const submit = async () => {
    if (!user || !f.clientName.trim() || !f.brokerId) return;
    setBusy(true);
    if (reassigning) {
      const { error } = await db.from("wealth_referrals").update({
        broker_user_id: f.brokerId, status: "pending", rejection_reason: null, decided_at: null,
      }).eq("id", reassigning);
      setBusy(false);
      if (error) return toast.error("Couldn't reassign the referral.");
      toast.success("Referral sent to the new broker.");
    } else {
      const { error } = await db.from("wealth_referrals").insert({
        referrer_user_id: user.id, broker_user_id: f.brokerId, client_name: f.clientName,
        client_email: f.clientEmail || null, client_phone: f.clientPhone || null, specific_need: f.need || null,
      });
      setBusy(false);
      if (error) return toast.error("Couldn't send the referral. Please try again.");
      toast.success("Referral sent — the broker has been notified.");
    }
    setOpen(false); setReassigning(null); resetForm();
    qc.invalidateQueries({ queryKey: ["my-referrals"] });
  };

  const openReassign = (r: any) => {
    setReassigning(r.id);
    setF({ clientName: r.client_name, clientEmail: r.client_email ?? "", clientPhone: r.client_phone ?? "", need: r.specific_need ?? "", brokerId: "" });
    setOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="My Referrals" subtitle="Clients you've referred, and where each one stands." actions={
        <Button onClick={() => { setReassigning(null); resetForm(); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Refer a client</Button>
      } />

      <div className="rounded-xl border border-border bg-card divide-y">
        {referrals.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : !referrals.data?.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No referrals yet — refer your first client above.</p>
        ) : (
          referrals.data.map((r: any) => (
            <div key={r.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.client_name}</p>
                  <p className="text-xs text-muted-foreground">Referred to {brokerName(r.broker_user_id)} · {fmt(r.created_at)}</p>
                  {r.specific_need && <p className="mt-1 text-xs text-muted-foreground">Need: {r.specific_need}</p>}
                </div>
                <Badge variant="outline" className={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge>
              </div>
              {r.status === "rejected" && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-destructive/5 px-3 py-2">
                  <p className="text-xs text-destructive">{r.rejection_reason || "No reason given."}</p>
                  <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" onClick={() => openReassign(r)}>Try another broker</Button>
                </div>
              )}
              {r.commission != null && (
                <p className="text-xs text-muted-foreground">
                  Commission: <strong className="text-primary">{zar(r.commission)}</strong>
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setReassigning(null); resetForm(); } }}>
        <SheetContent>
          <SheetHeader><SheetTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />{reassigning ? "Refer to a different broker" : "Refer a client"}</SheetTitle></SheetHeader>
          <div className="mt-6 space-y-4">
            {!reassigning && (
              <>
                <div className="space-y-1.5"><Label>Client name</Label><Input value={f.clientName} onChange={(e) => setF({ ...f, clientName: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Client email (optional)</Label><Input type="email" value={f.clientEmail} onChange={(e) => setF({ ...f, clientEmail: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Client phone (optional)</Label><Input value={f.clientPhone} onChange={(e) => setF({ ...f, clientPhone: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Specific need (optional)</Label><Textarea rows={3} value={f.need} onChange={(e) => setF({ ...f, need: e.target.value })} placeholder="e.g. Life cover review, retirement planning…" /></div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Broker</Label>
              <Select value={f.brokerId} onValueChange={(v) => setF({ ...f, brokerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a Wealth Manager" /></SelectTrigger>
                <SelectContent>
                  {(brokers.data ?? []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={busy || !f.clientName.trim() || !f.brokerId} onClick={submit}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {reassigning ? "Send to this broker" : "Send referral"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
