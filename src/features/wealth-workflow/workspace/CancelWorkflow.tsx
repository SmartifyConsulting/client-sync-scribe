import { useState } from "react";
import { format } from "date-fns";
import { XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/** Cancel button for a Live Workspace; any party may cancel, a reason is required and stored. */
export function CancelWorkflowButton({ workflowId }: { workflowId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const submit = async () => {
    if (reason.trim().length < 3) {
      toast({ title: "Reason needed", description: "Please say why you are cancelling this workspace.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await (supabase as any).rpc("wealth_cancel_workflow", { _workflow_id: workflowId, _reason: reason.trim() });
    setBusy(false);
    if (error) { toast({ title: "Could not cancel", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Live Workspace cancelled" });
    setOpen(false); setReason("");
    qc.invalidateQueries();
  };

  return (
    <>
      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive" onClick={() => setOpen(true)}>
        <XCircle className="h-3.5 w-3.5" /> Cancel
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this Live Workspace?</DialogTitle>
            <DialogDescription>The process stops for both parties. Everything done so far is kept in the Activity Log.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancelling (required)" rows={4} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Keep going</Button>
            <Button variant="destructive" disabled={busy || reason.trim().length < 3} onClick={submit}>Cancel workspace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CancelledNotice({ wf }: { wf: any }) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-card px-4 py-3 text-xs">
      <p className="font-semibold text-destructive">This Live Workspace was cancelled{wf.cancelled_at ? ` on ${format(new Date(wf.cancelled_at), "d MMM yyyy, HH:mm")}` : ""}.</p>
      {wf.cancel_reason && <p className="mt-1 text-muted-foreground">Reason: {wf.cancel_reason}</p>}
    </div>
  );
}
