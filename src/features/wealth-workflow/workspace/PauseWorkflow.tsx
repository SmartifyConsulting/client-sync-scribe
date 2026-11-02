import { useEffect, useState } from "react";
import { Pause, Play, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function PauseWorkflowButton({ workflowId, pausedAt }: { workflowId: string; pausedAt?: string | null }) {
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const paused = !!pausedAt;
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc("wealth_set_workflow_paused", { _workflow_id: workflowId, _paused: !paused });
      if (error) throw error;
      await Promise.all(["wealth-workflow", "wealth-audit-log", "wealth-map-records", "client-wealth"].map(key => qc.invalidateQueries({ queryKey: [key] })));
      toast({ title: paused ? "Live Workspace resumed" : "Live Workspace paused" });
    } catch (e: any) {
      toast({ title: paused ? "Could not resume" : "Could not pause", description: e.message || "Please try again.", variant: "destructive" });
    } finally { setBusy(false); }
  };
  const Icon = busy ? Loader2 : paused ? Play : Pause;
  return <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={busy} onClick={toggle}>
    <Icon className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />{paused ? "Resume" : "Pause"}
  </Button>;
}

export function PausedWorkflowNotice({ pausedAt }: { pausedAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const elapsed = Math.max(0, Math.floor((now - new Date(pausedAt).getTime()) / 1000));
  const duration = `${Math.floor(elapsed / 3600)}h ${Math.floor(elapsed % 3600 / 60)}m ${elapsed % 60}s`;
  return <div className="frame p-4 space-y-2 text-xs" role="status">
    <p className="font-semibold">Live Workspace paused</p>
    <p className="text-muted-foreground">Paused since {new Date(pausedAt).toLocaleString("en-ZA")} · {duration}</p>
    <p className="text-muted-foreground">Resume to continue at this step. Pause and resume times are recorded in the Activity Log.</p>
  </div>;
}
