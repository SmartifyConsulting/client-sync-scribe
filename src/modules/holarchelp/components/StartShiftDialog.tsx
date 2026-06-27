import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { useParamedicShift } from "../hooks/useParamedicShift";
import { useTranslation } from "react-i18next";

type Ambulance = { id: string; vehicle_code: string; registration_number: string | null; status: string };

export function StartShiftDialog({
  providerId,
  open,
  onOpenChange,
}: {
  providerId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { startShift } = useParamedicShift();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Ambulance[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !providerId) return;
    setLoading(true);
    setSelected("");
    supabase
      .from("ambulances" as any)
      .select("id, vehicle_code, registration_number, status")
      .eq("provider_id", providerId)
      .eq("status", "available")
      .order("vehicle_code")
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        const rows = ((data as any) ?? []) as Ambulance[];
        setList(rows);
        if (rows.length === 1) setSelected(rows[0].id);
        setLoading(false);
      });
  }, [open, providerId]);

  const start = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await startShift(selected);
      toast.success(t("shift.started"));
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? t("shift.couldNotStart"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" /> {t("shift.startTitle")}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : list.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            {t("shift.noAvailable")}
          </div>
        ) : (
          <div className="space-y-2">
            <Label>{t("shift.pickAmbulance")}</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue placeholder={t("shift.selectVehicle")} /></SelectTrigger>
              <SelectContent>
                {list.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.vehicle_code}{a.registration_number ? ` · ${a.registration_number}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("shift.availableMessage")}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={start} disabled={!selected || busy || list.length === 0}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("shift.startTitle")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
