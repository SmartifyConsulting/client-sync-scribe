import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const db = supabase as any;

/** Pending client referrals waiting for this Wealth Manager to accept or
 *  reject, shown on their dashboard so they don't need a separate screen
 *  to action their pipeline. */
export function ReferralPipeline() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["referral-pipeline", user?.id],
    enabled: !!user,
    queryFn: async () => (await db.from("wealth_referrals").select("*").eq("broker_user_id", user!.id).eq("status", "pending").order("created_at", { ascending: false })).data ?? [],
  });

  if (!isLoading && data.length === 0) return null;

  const accept = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.functions.invoke("wealth-referral-accept", { body: { referralId: id } });
    setBusyId(null);
    if (error) return toast.error("Couldn't accept the referral. Please try again.");
    toast.success("Client added to your clients.");
    qc.invalidateQueries({ queryKey: ["referral-pipeline"] });
  };

  const reject = async () => {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    const { error } = await db.from("wealth_referrals").update({ status: "rejected", rejection_reason: reason || null, decided_at: new Date().toISOString() }).eq("id", rejecting.id);
    setBusyId(null);
    if (error) toast.error("Couldn't decline the referral.");
    setRejecting(null); setReason("");
    qc.invalidateQueries({ queryKey: ["referral-pipeline"] });
  };

  return (
    <div className="rounded-xl border border-primary bg-card shadow-sm">
      <div className="w-full rounded-t-xl bg-primary px-4 py-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-primary-foreground"><UserPlus className="h-4 w-4" /> Referral Pipeline</h3>
      </div>
      <div className="divide-y">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : data.map((r: any) => (
          <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{r.client_name}</p>
              {r.specific_need && <p className="text-xs text-muted-foreground truncate">{r.specific_need}</p>}
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busyId === r.id} onClick={() => setRejecting({ id: r.id, name: r.client_name })}>Reject</Button>
              <Button size="sm" className="h-7 text-xs" disabled={busyId === r.id} onClick={() => accept(r.id)}>{busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Accept"}</Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!rejecting} onOpenChange={(v) => !v && setRejecting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Decline referral for {rejecting?.name}</DialogTitle></DialogHeader>
          <Textarea placeholder="Let the referrer know why, so they can try a different broker." rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" disabled={busyId === rejecting?.id} onClick={reject}>Decline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
