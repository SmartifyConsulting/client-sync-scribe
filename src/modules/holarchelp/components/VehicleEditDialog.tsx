import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { toastError } from "@/lib/userMessage";

export type EditableVehicle = {
  id?: string | null;          // real ambulances.id (if backed by DB)
  vehicle_code: string;
  registration_number?: string | null;
  make?: string | null;
  model?: string | null;
  type?: string | null;
  status?: string | null;
};

export function VehicleEditDialog({
  open, onOpenChange, vehicle, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicle: EditableVehicle | null;
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<EditableVehicle | null>(vehicle);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(vehicle); }, [vehicle, open]);

  if (!form) return null;
  const set = (k: keyof EditableVehicle, v: string) => setForm({ ...form, [k]: v });

  const save = async () => {
    if (!form.id) {
      toast.success("Vehicle updated (demo)");
      onOpenChange(false);
      onSaved?.();
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("ambulances" as any).update({
        vehicle_code: form.vehicle_code,
        registration_number: form.registration_number || null,
        status: form.status || null,
      }).eq("id", form.id);
      if (error) throw error;
      toast.success("Vehicle updated");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toastError(e, "Could not save vehicle changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit vehicle</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Code"><Input value={form.vehicle_code} onChange={(e) => set("vehicle_code", e.target.value)} /></Field>
          <Field label="Registration"><Input value={form.registration_number ?? ""} onChange={(e) => set("registration_number", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Make"><Input value={form.make ?? ""} onChange={(e) => set("make", e.target.value)} /></Field>
            <Field label="Model"><Input value={form.model ?? ""} onChange={(e) => set("model", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type"><Input value={form.type ?? ""} onChange={(e) => set("type", e.target.value)} /></Field>
            <Field label="Status">
              <Select value={form.status ?? "available"} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in-service">In service</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
