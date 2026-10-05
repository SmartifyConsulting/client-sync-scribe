import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  const rows = useMemo(() => (referrerIds as string[]).map((id: string) => {
    const mine = (referrals.data ?? []).filter((r: any) => r.referrer_user_id === id);
    return {
      id,
      name: nameFor(id),
      sent: mine.length,
      accepted: mine.filter((r: any) => r.status === "accepted").length,
      earned: mine.reduce((s: number, r: any) => s + Number(r.commission || 0), 0),
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

  const [commissionEdits, setCommissionEdits] = useState<Record<string, string>>({});
  const saveCommission = async (referralId: string, value: string) => {
    const amount = value.trim() === "" ? null : Number(value);
    if (amount !== null && Number.isNaN(amount)) return;
    const { error } = await db.from("wealth_referrals").update({ commission: amount }).eq("id", referralId);
    if (error) return toast.error("Couldn't save the commission.");
    toast.success("Commission saved — the referrer has been notified.");
    qc.invalidateQueries({ queryKey: ["broker-referrals"] });
  };

  const acceptedReferrals = useMemo(() => (referrals.data ?? []).filter((r: any) => r.status === "accepted"), [referrals.data]);

  const zar = (n: number) => `R${Math.round(n).toLocaleString("en-ZA")}`;

  // Create — invite a prospective referrer by email.
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "" });
  const [inviting, setInviting] = useState(false);
  const sendInvite = async () => {
    if (!inviteForm.email.trim()) return;
    setInviting(true);
    try {
      const { error } = await supabase.functions.invoke("send-user-invitation", {
        body: {
          recipientEmail: inviteForm.email.trim(),
          isReferral: true,
          message: `I'd like to invite you to refer clients to me on Holarc Wealth and earn commission on every policy that's issued.`,
        },
      });
      if (error) throw error;
      toast.success(`Invitation sent to ${inviteForm.email.trim()}`);
      setInviteOpen(false);
      setInviteForm({ name: "", email: "" });
    } catch (e: any) {
      toast.error(e.message || "Couldn't send the invitation.");
    } finally {
      setInviting(false);
    }
  };

  // Delete — remove a custom commission rate, reverting that referrer to the default.
  const [removeId, setRemoveId] = useState<string | null>(null);
  const removeRate = async () => {
    if (!removeId) return;
    const { error } = await db.from("wealth_referrer_rates").delete().eq("broker_user_id", user!.id).eq("referrer_user_id", removeId);
    setRemoveId(null);
    if (error) return toast.error("Couldn't remove the custom rate.");
    toast.success("Reverted to the default commission rate");
    qc.invalidateQueries({ queryKey: ["broker-referrer-rates"] });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Referrers"
        subtitle="Everyone referring clients to you, and the commission rate you offer each one."
        actions={<Button size="sm" onClick={() => setInviteOpen(true)}><UserPlus className="h-4 w-4 mr-1.5" />Invite referrer</Button>}
      />

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
                <th className="px-4 py-2 font-medium">Commission</th>
                <th className="px-4 py-2 font-medium">Commission rate</th>
                <th className="px-4 py-2 font-medium" />
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
                  <td className="px-4 py-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Remove custom rate for ${r.name}`} onClick={() => setRemoveId(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!!acceptedReferrals.length && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Set commission per client</p>
          <div className="rounded-xl border border-border bg-card divide-y">
            {acceptedReferrals.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.client_name}</p>
                  <p className="text-xs text-muted-foreground">Referred by {nameFor(r.referrer_user_id)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">R</span>
                  <Input
                    className="h-7 w-24 text-xs"
                    type="number" min={0} step={1}
                    placeholder="0.00"
                    value={commissionEdits[r.id] ?? (r.commission ?? "")}
                    onChange={(e) => setCommissionEdits((v) => ({ ...v, [r.id]: e.target.value }))}
                    onBlur={(e) => saveCommission(r.id, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a referrer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={inviteForm.name} onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" required value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} placeholder="referrer@email.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>Cancel</Button>
            <Button onClick={sendInvite} disabled={inviting || !inviteForm.email.trim()}>
              {inviting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove custom commission rate?</AlertDialogTitle>
            <AlertDialogDescription>
              This referrer reverts to the default commission rate. Their referral history and earned commission are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeRate}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
