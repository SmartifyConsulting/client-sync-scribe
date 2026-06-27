import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Truck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useParamedicShift } from "../hooks/useParamedicShift";
import { useTranslation } from "react-i18next";

interface Props {
  incidentId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onNeedShift?: () => void;
}

export function ParamedicAcceptDialog({ incidentId, open, onOpenChange, onNeedShift }: Props) {
  const { t } = useTranslation();
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
      toast.error(error.message === "Incident already taken" ? t("ambulance.anotherCrewAccepted") : error.message);
      onOpenChange(false);
      return;
    }
    toast.success(t("paramedicAccept.lockedHeadOut"));
    onOpenChange(false);
    navigate(`/provider/ambulance/incident/${incidentId}`);
  };

  const noShift = !shift || shift.status !== "available";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> {t("paramedicAccept.acceptSos")}
          </DialogTitle>
        </DialogHeader>

        {noShift ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" /> {t("paramedicAccept.notAvailableShift")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("paramedicAccept.startBeforeAccept")}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("paramedicAccept.respondingWith")}</p>
            <p className="mt-1 text-lg font-bold">{t("liveSos.ambulance")} · {shift.ambulance_id.slice(0, 8)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("paramedicAccept.busyUntilCompleted")}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          {noShift ? (
            <Button onClick={() => { onOpenChange(false); onNeedShift?.(); }}>{t("shift.startTitle")}</Button>
          ) : (
            <Button onClick={accept} disabled={accepting}>
              {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("incomingSos.acceptIncident")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
