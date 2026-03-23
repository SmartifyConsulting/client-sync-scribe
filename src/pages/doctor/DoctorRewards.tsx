import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export default function DoctorRewards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferAppId, setTransferAppId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const queryClient = useQueryClient();

  const { data: doctorMoolas = 0 } = useQuery({
    queryKey: ["doctor-moolas-profile"],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await supabase.from("doctor_rewards").select("moolas_count").eq("doctor_id", user.id);
      if (error || !data) return 0;
      return data.reduce((sum, r) => sum + (r.moolas_count || 0), 0);
    },
  });

  const { data: patientMoolas = 0 } = useQuery({
    queryKey: ["patient-moolas-profile"],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data: patient } = await supabase.from("patients").select("id").eq("patient_user_id", user.id).maybeSingle();
      if (!patient) return 0;
      const { data: rewards, error } = await supabase.from("patient_rewards").select("lollipops_count").eq("patient_id", patient.id);
      if (error || !rewards) return 0;
      return rewards.reduce((sum, r) => sum + (r.lollipops_count || 0), 0);
    },
  });

  const totalMoolas = doctorMoolas + patientMoolas;

  const { data: partnerApps = [] } = useQuery({
    queryKey: ["moola-partner-apps-doctor"],
    queryFn: async () => {
      const { data, error } = await supabase.from("moola_partner_apps").select("*").eq("is_active", true).order("name");
      if (error) return [];
      return data || [];
    },
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["moola-transfers-doctor"],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("moola_transfers").select("*, moola_partner_apps(name, logo_url)").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  const totalTransferred = transfers.reduce((sum: number, t: any) => sum + t.amount, 0);

  const handleTransfer = async () => {
    if (!user?.id) return;
    const amount = parseInt(transferAmount) || 0;
    if (amount <= 0 || amount > totalMoolas) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    const { data: patient } = await supabase.from("patients").select("id").eq("patient_user_id", user.id).maybeSingle();
    if (!patient) { toast({ title: "No patient record found", variant: "destructive" }); return; }
    const { error: transferError } = await supabase.from("moola_transfers").insert({ user_id: user.id, partner_app_id: transferAppId, amount });
    if (transferError) { toast({ title: "Transfer failed", variant: "destructive" }); return; }
    const { error: deductError } = await supabase.from("patient_rewards").insert({
      patient_id: patient.id, awarded_by: user.id, lollipops_count: -amount,
      visit_category: "Moola Transfer", reward_type: "transfer",
    });
    if (deductError) { toast({ title: "Deduction failed", variant: "destructive" }); return; }
    toast({ title: "Transfer successful", description: `${amount} Moolas transferred.` });
    queryClient.invalidateQueries({ queryKey: ["moola-transfers-doctor"] });
    queryClient.invalidateQueries({ queryKey: ["patient-moolas-profile"] });
    queryClient.invalidateQueries({ queryKey: ["doctor-moolas-profile"] });
    setShowTransferDialog(false);
    setTransferAppId("");
    setTransferAmount("");
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Rewards</h1>
        <p className="text-sm text-muted-foreground">Manage your Moolas balance and transfers</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4 bg-emerald-50 dark:bg-emerald-950/20">
            <p className="text-xs text-muted-foreground">Doctor Moolas</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{doctorMoolas} <span className="text-base">Ⓜ</span></p>
          </div>
          <div className="rounded-lg border border-border p-4 bg-blue-50 dark:bg-blue-950/20">
            <p className="text-xs text-muted-foreground">Patient Moolas</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{patientMoolas} <span className="text-base">Ⓜ</span></p>
          </div>
          <div className="rounded-lg border border-border p-4 bg-primary/5">
            <p className="text-xs text-muted-foreground">Combined Balance</p>
            <p className="text-2xl font-bold text-foreground">{totalMoolas} <span className="text-base">Ⓜ</span></p>
          </div>
        </div>
        {partnerApps.length > 0 && (
          <div className="flex justify-end">
            <Button onClick={() => setShowTransferDialog(true)} className="gap-2"><Send className="h-4 w-4" /> Transfer Moolas</Button>
          </div>
        )}
        {transfers.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Transfer History</h4>
            <div className="space-y-2">
              {transfers.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium">{t.moola_partner_apps?.name || "Partner App"}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(t.created_at), "MMM d, yyyy")}</p>
                  </div>
                  <Badge variant="secondary">-{t.amount} Ⓜ</Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Total transferred: {totalTransferred} Ⓜ</p>
          </div>
        )}
        {showTransferDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-lg space-y-4">
              <h3 className="text-lg font-semibold">Transfer Moolas</h3>
              <p className="text-sm text-muted-foreground">Available balance: {totalMoolas} Ⓜ</p>
              <div className="space-y-2">
                <Label>Partner App</Label>
                <Select value={transferAppId} onValueChange={setTransferAppId}>
                  <SelectTrigger><SelectValue placeholder="Select an app" /></SelectTrigger>
                  <SelectContent>{partnerApps.map((app: any) => <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" min={1} max={totalMoolas} placeholder="Enter amount" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
                <Button onClick={handleTransfer} disabled={!transferAppId || !transferAmount || parseInt(transferAmount) <= 0 || parseInt(transferAmount) > totalMoolas}>
                  <Send className="h-4 w-4 mr-2" /> Transfer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
