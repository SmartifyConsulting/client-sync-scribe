import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patientId: string;
}

export function ManualLogAdmissionDialog({ open, onOpenChange, patientId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [hospital, setHospital] = useState("");
  const [admDate, setAdmDate] = useState(new Date().toISOString().slice(0, 10));
  const [discDate, setDiscDate] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() && !diagnosis.trim()) {
      toast({ title: "Add a title or reason", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("hospital_admissions").insert({
      patient_id: patientId,
      title: title.trim() || null,
      hospital: hospital || null,
      admission_date: admDate,
      discharge_date: discDate || null,
      diagnosis: diagnosis || null,
      created_by: u.user?.id,
      source: "patient",
      status: discDate ? "discharged" : "admitted",
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't log admission", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Admission logged" });
    qc.invalidateQueries({ queryKey: ["hospital-admissions", patientId] });
    setHospital(""); setDiscDate(""); setDiagnosis("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log a hospital admission</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-[11px]">Hospital</Label>
            <Input value={hospital} onChange={(e) => setHospital(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px]">Admission date</Label>
              <Input type="date" value={admDate} onChange={(e) => setAdmDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">Discharge date</Label>
              <Input type="date" value={discDate} onChange={(e) => setDiscDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-[11px]">Reason / diagnosis</Label>
            <Textarea rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
