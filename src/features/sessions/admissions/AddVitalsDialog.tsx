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
  defaultHeight?: number | null;
  defaultWeight?: number | null;
}

export function AddVitalsDialog({ open, onOpenChange, admissionId, hospitalId, defaultHeight, defaultWeight }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [nurse, setNurse] = useState<{ id: string; name: string } | null>(null);
  const [hr, setHr] = useState("");
  const [bps, setBps] = useState("");
  const [bpd, setBpd] = useState("");
  const [spo2, setSpo2] = useState("");
  const [temp, setTemp] = useState("");
  const [height, setHeight] = useState(defaultHeight?.toString() || "");
  const [weight, setWeight] = useState(defaultWeight?.toString() || "");
  const [notes, setNotes] = useState("");

  const computedBmi = (() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w) return null;
    return Math.round((w / Math.pow(h / 100, 2)) * 10) / 10;
  })();

  const reset = () => {
    setHr(""); setBps(""); setBpd(""); setSpo2(""); setTemp(""); setNotes("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("admission_vitals").insert({
        admission_id: admissionId,
        recorded_by: user.id,
        nurse_id: nurse?.id ?? null,
        nurse_name_snapshot: nurse?.name ?? null,
        heart_rate: hr ? parseInt(hr) : null,
        bp_systolic: bps ? parseInt(bps) : null,
        bp_diastolic: bpd ? parseInt(bpd) : null,
        spo2: spo2 ? parseFloat(spo2) : null,
        temperature_c: temp ? parseFloat(temp) : null,
        height_cm: height ? parseFloat(height) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        bmi: computedBmi,
        notes: notes || null,
      } as any);
      if (error) throw error;
      toast({ title: "Vitals saved" });
      qc.invalidateQueries({ queryKey: ["admission-vitals", admissionId] });
      reset();
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
        <DialogHeader><DialogTitle>Add Vitals</DialogTitle></DialogHeader>
        <div className="mb-2">
          <NursePicker hospitalId={hospitalId} value={nurse?.id ?? null} onChange={setNurse} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-sm">Heart Rate (bpm)</Label><Input value={hr} onChange={(e) => setHr(e.target.value)} type="number" /></div>
          <div><Label className="text-sm">SpO₂ (%)</Label><Input value={spo2} onChange={(e) => setSpo2(e.target.value)} type="number" /></div>
          <div><Label className="text-sm">BP Systolic</Label><Input value={bps} onChange={(e) => setBps(e.target.value)} type="number" /></div>
          <div><Label className="text-sm">BP Diastolic</Label><Input value={bpd} onChange={(e) => setBpd(e.target.value)} type="number" /></div>
          <div><Label className="text-sm">Temperature (°C)</Label><Input value={temp} onChange={(e) => setTemp(e.target.value)} type="number" step="0.1" /></div>
          <div><Label className="text-sm">BMI {computedBmi && <span className="text-primary">({computedBmi})</span>}</Label><Input value={computedBmi || ""} disabled /></div>
          <div><Label className="text-sm">Height (cm)</Label><Input value={height} onChange={(e) => setHeight(e.target.value)} type="number" /></div>
          <div><Label className="text-sm">Weight (kg)</Label><Input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" /></div>
          <div className="col-span-2"><Label className="text-sm">Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
