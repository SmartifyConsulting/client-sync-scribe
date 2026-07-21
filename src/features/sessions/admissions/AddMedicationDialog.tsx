import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { NursePicker } from "@/components/admissions/NursePicker";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  admissionId: string;
  hospitalId?: string | null;
}

export function AddMedicationDialog({ open, onOpenChange, admissionId, hospitalId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [nurse, setNurse] = useState<{ id: string; name: string } | null>(null);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Medication name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("admission_medications").insert({
        admission_id: admissionId,
        recorded_by: user.id,
        nurse_id: nurse?.id ?? null,
        nurse_name_snapshot: nurse?.name ?? null,
        name,
        dosage: dosage || null,
        frequency: frequency || null,
        started_at: new Date().toISOString().slice(0, 10),
        notes: notes || null,
      } as any);
      if (error) throw error;
      toast({ title: "Medication added" });
      qc.invalidateQueries({ queryKey: ["admission-medications", admissionId] });
      setName(""); setDosage(""); setFrequency(""); setNotes("");
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Active Medication</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <NursePicker hospitalId={hospitalId} value={nurse?.id ?? null} onChange={setNurse} />
          <div><Label className="text-sm">Medication Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-sm">Dosage</Label><Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 500mg" /></div>
            <div><Label className="text-sm">Frequency</Label><Input value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="e.g. twice daily" /></div>
          </div>
          <div><Label className="text-sm">Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
