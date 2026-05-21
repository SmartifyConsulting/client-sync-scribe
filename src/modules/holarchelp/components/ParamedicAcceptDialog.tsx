import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Truck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useParamedicShift } from "../hooks/useParamedicShift";

interface Props {
  incidentId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onNeedShift?: () => void;
}

export function ParamedicAcceptDialog({ incidentId, open, onOpenChange, onNeedShift }: Props) {
  const navigate = useNavigate();
  const { shift } = useParamedicShift();
  const [accepting, setAccepting] = useState(false);

  const accept = async () => {
    if (!incidentId || !shift) return;
    setAccepting(true);
    const { error } = await supabase.rpc("holarchelp_paramedic_accept" as any, {
      _incident_id: incidentId,
      _ambulance_id: shift.ambulance_id,
    });
    setAccepting(false);
    if (error) {
      toast.error(error.message === "Incident already taken" ? "Another paramedic accepted first" : error.message);
      onOpenChange(false);
      return;
    }
    toast.success("Incident locked — head out!");
    onOpenChange(false);
    navigate(`/provider/ambulance/incident/${incidentId}`);
  };

  const noShift = !shift || shift.status !== "available";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Accept SOS
          </DialogTitle>
        </DialogHeader>

        {noShift ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" /> You're not on an available shift
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Start your shift and pick an ambulance before accepting an incident.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Responding with</p>
            <p className="mt-1 text-lg font-bold">Ambulance · {shift.ambulance_id.slice(0, 8)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              You and your ambulance will be marked <strong>Busy</strong> until this incident is completed.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          {noShift ? (
            <Button onClick={() => { onOpenChange(false); onNeedShift?.(); }}>Start shift</Button>
          ) : (
            <Button onClick={accept} disabled={accepting}>
              {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accept incident
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
