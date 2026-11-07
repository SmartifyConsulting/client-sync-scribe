import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Broker = { name: string; firm: string | null; licence: string | null; email: string | null; phone: string | null };
const db = supabase as any;

function ChangeBrokerForm({ clientId, broker, onClose }: { clientId: string; broker: Broker | null; onClose: () => void }) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [details, setDetails] = useState({ broker: "", firm: "", policies: "", signature: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !confirmed || Object.values(details).some(value => !value.trim())) return;
    setSaving(true);
    try {
      const { error } = await db.rpc("wealth_request_broker_change", {
        _client_id: clientId, _request_id: requestId, _new_broker: details.broker.trim(),
        _new_firm: details.firm.trim(), _policies: details.policies.trim(), _signature: details.signature.trim(),
      });
      if (error) throw error;
      void Promise.all(["wealth-doc-tray", "wealth-map-records", "client-documents", "documents"].map(key => qc.invalidateQueries({ queryKey: [key] })));
      toast({ title: "Broker Change Letter filed", description: "You can find the signed request in Documents." });
      onClose();
    } catch (error: any) {
      toast({ title: "Could not save the request", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Change Broker</DialogTitle>
        <DialogDescription>Complete and sign a Broker Change Letter for the policies you want to transfer. Holarc files the letter for you to share. Your current broker stays listed until the transfer is confirmed.</DialogDescription>
      </DialogHeader>
      <form className="space-y-3" onSubmit={submit}>
        <p className="text-sm">Current broker <strong>{broker?.name ?? "None linked"}</strong></p>
        <div className="space-y-1.5"><Label htmlFor="new-broker">New broker’s name</Label><Input id="new-broker" required maxLength={200} value={details.broker} onChange={e => setDetails(d => ({ ...d, broker: e.target.value }))} /></div>
        <div className="space-y-1.5"><Label htmlFor="new-broker-firm">New broker’s firm or FSP</Label><Input id="new-broker-firm" required maxLength={200} value={details.firm} onChange={e => setDetails(d => ({ ...d, firm: e.target.value }))} /></div>
        <div className="space-y-1.5"><Label htmlFor="broker-change-policies">Insurers and policy numbers</Label><Input id="broker-change-policies" required maxLength={1000} value={details.policies} onChange={e => setDetails(d => ({ ...d, policies: e.target.value }))} /></div>
        <div className="space-y-1.5"><Label htmlFor="broker-change-signature">Type your full name to sign</Label><Input id="broker-change-signature" required maxLength={200} value={details.signature} onChange={e => setDetails(d => ({ ...d, signature: e.target.value }))} /></div>
        <label className="flex items-start gap-2 text-xs"><Checkbox checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} />
          <span>I request that the named broker be appointed for the policies listed above.</span>
        </label>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving || !confirmed}>{saving ? "Filing…" : "Sign and file request"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

export function MyBroker({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const broker = useQuery({
    queryKey: ["client-current-broker", clientId],
    queryFn: async (): Promise<Broker | null> => {
      const { data, error } = await db.rpc("wealth_current_broker", { _client_id: clientId });
      if (error) throw error;
      return data;
    },
  });
  if (broker.isPending) return <p className="text-sm text-muted-foreground">Loading broker details…</p>;
  if (broker.isError) return <Button variant="outline" onClick={() => void broker.refetch()}>Could not load broker details · Retry</Button>;
  const info = broker.data;
  return <div className="space-y-3">
    <div><h2 className="text-lg font-semibold text-primary-dark">My Broker</h2><p className="text-xs text-muted-foreground">The broker linked to your Holarc client record.</p></div>
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      {info ? <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {([["Broker", info.name], ["Firm or FSP", info.firm], ["FSP licence", info.licence], ["Email", info.email], ["Phone", info.phone]] as const)
          .filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd>{value}</dd></div>)}
      </dl> : <p className="text-sm text-muted-foreground">There is no broker linked to this record yet.</p>}
      <Button variant="outline" onClick={() => setOpen(true)}>Change Broker</Button>
    </div>
    {open && <ChangeBrokerForm clientId={clientId} broker={info} onClose={() => setOpen(false)} />}
  </div>;
}
