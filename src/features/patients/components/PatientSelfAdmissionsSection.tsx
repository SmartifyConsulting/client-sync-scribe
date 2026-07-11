import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Hospital } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Adm {
  id: string;
  hospital: string | null;
  admission_date: string;
  discharge_date: string | null;
  diagnosis: string | null;
  status: string;
  source: string | null;
}

export function PatientSelfAdmissionsSection({ patientId, userId }: { patientId: string; userId: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState<Adm[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [hospital, setHospital] = useState("");
  const [admDate, setAdmDate] = useState(new Date().toISOString().slice(0, 10));
  const [discDate, setDiscDate] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("hospital_admissions")
      .select("id, hospital, admission_date, discharge_date, diagnosis, status, source")
      .eq("patient_id", patientId)
      .order("admission_date", { ascending: false });
    setItems((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [patientId]);

  const submit = async () => {
    if (!hospital.trim()) {
      toast({ title: "Hospital required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("hospital_admissions").insert({
      patient_id: patientId,
      hospital,
      admission_date: admDate,
      discharge_date: discDate || null,
      diagnosis: diagnosis || null,
      created_by: userId,
      source: "patient",
      status: discDate ? "discharged" : "admitted",
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't log admission", description: error.message, variant: "destructive" });
      return;
    }
    setOpen(false);
    setHospital(""); setDischargeReset(); setDiagnosis("");
    toast({ title: "Admission logged" });
    load();
  };

  const setDischargeReset = () => {
    setDiscDate("");
    setAdmDate(new Date().toISOString().slice(0, 10));
  };

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hospital className="h-5 w-5 text-primary" />
            Hospital admissions
          </CardTitle>
          <p className="text-xs text-muted-foreground">Log past or current hospital stays.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Log admission
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">No admissions logged yet.</p>
        )}
        {items.map((a) => (
          <div key={a.id} className="rounded-lg border border-border p-3 bg-muted/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{a.hospital ?? "Hospital"}</p>
                <p className="text-xs text-muted-foreground">
                  {a.admission_date}{a.discharge_date ? ` → ${a.discharge_date}` : " (ongoing)"}
                </p>
                {a.diagnosis && <p className="text-xs mt-1">{a.diagnosis}</p>}
              </div>
              <Badge variant="outline" className="text-xs">{a.source ?? "doctor"}</Badge>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log a hospital admission</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Hospital</Label>
              <Input value={hospital} onChange={(e) => setHospital(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Admission date</Label>
                <Input type="date" value={admDate} onChange={(e) => setAdmDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Discharge date</Label>
                <Input type="date" value={discDate} onChange={(e) => setDiscDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-sm">Reason / diagnosis</Label>
              <Textarea rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
