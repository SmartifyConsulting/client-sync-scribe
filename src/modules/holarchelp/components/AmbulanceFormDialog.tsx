import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AmbulanceRow = {
  id?: string;
  provider_id: string;
  vehicle_code: string;
  registration_number?: string | null;
  status?: string;
  notes?: string | null;
};

const STATUSES = ["available", "assigned", "out_of_service"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  providerId: string;
  initial?: AmbulanceRow | null;
  onSaved?: () => void;
}

export function AmbulanceFormDialog({ open, onOpenChange, providerId, initial, onSaved }: Props) {
  const { t } = useTranslation();
  const isEdit = !!initial?.id;
  const [vehicleCode, setVehicleCode] = useState("");
  const [reg, setReg] = useState("");
  const [status, setStatus] = useState("available");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVehicleCode(initial?.vehicle_code ?? "");
    setReg(initial?.registration_number ?? "");
    setStatus(initial?.status ?? "available");
    setNotes(initial?.notes ?? "");
  }, [open, initial]);

  const submit = async () => {
    if (!vehicleCode.trim()) {
      toast.error(t("holarcHelp.ambulance.vehicleCodeRequired"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        provider_id: providerId,
        vehicle_code: vehicleCode.trim(),
        registration_number: reg.trim() || null,
        status,
        notes: notes.trim() || null,
      };
      const q = isEdit
        ? supabase.from("ambulances" as any).update(payload).eq("id", initial!.id!)
        : supabase.from("ambulances" as any).insert(payload);
      const { error } = await q;
      if (error) throw error;
      toast.success(isEdit ? t("holarcHelp.ambulance.updated") : t("holarcHelp.ambulance.added"));
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message ?? t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("holarcHelp.ambulance.editTitle") : t("holarcHelp.ambulance.addTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>{t("holarcHelp.ambulance.vehicleCode")} *</Label>
            <Input value={vehicleCode} onChange={(e) => setVehicleCode(e.target.value)} placeholder="ELD-01" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>{t("holarcHelp.ambulance.registrationNumber")}</Label>
            <Input value={reg} onChange={(e) => setReg(e.target.value)} placeholder="GP-ELDETTE-01" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.status")}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`holarcHelp.ambulance.status.${s}`, { defaultValue: s.replace(/_/g, " ") })}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.notes")}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={saving || !vehicleCode.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? t("common.save") : t("common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
