import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patientId: string;
}

type CodeRow = { code: string; description: string };

const FREE_TEXT = "__free_text__";

export function ManualLogAdmissionDialog({ open, onOpenChange, patientId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [hospitalId, setHospitalId] = useState<string>("");
  const [hospitalText, setHospitalText] = useState("");
  const [useFreeText, setUseFreeText] = useState(false);
  const [admDate, setAdmDate] = useState(new Date().toISOString().slice(0, 10));
  const [discDate, setDiscDate] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [newCode, setNewCode] = useState<CodeRow>({ code: "", description: "" });
  const [saving, setSaving] = useState(false);

  // Approved hospitals (public view — readable by signed-in users)
  const { data: hospitals = [] } = useQuery({
    queryKey: ["holarchelp_hospitals", "approved", "for-admission"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holarchelp_hospitals_public" as any)
        .select("id, name, city")
        .eq("status", "approved")
        .order("name");
      if (error) return [] as any[];
      return (data as any[]) ?? [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setTitle(""); setHospitalId(""); setHospitalText(""); setUseFreeText(false);
      setDiscDate(""); setDiagnosis(""); setCodes([]); setNewCode({ code: "", description: "" });
    }
  }, [open]);

  const addCode = () => {
    if (!newCode.code.trim()) return;
    setCodes((rows) => [...rows, { code: newCode.code.trim(), description: newCode.description.trim() }]);
    setNewCode({ code: "", description: "" });
  };
  const removeCode = (i: number) => setCodes((rows) => rows.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!title.trim() && !diagnosis.trim()) {
      toast({ title: "Add a title or reason", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const selected = hospitals.find((h: any) => h.id === hospitalId);
    const hospitalName = useFreeText ? hospitalText.trim() : (selected?.name || null);
    const { error } = await supabase.from("hospital_admissions").insert({
      patient_id: patientId,
      title: title.trim() || null,
      hospital: hospitalName || null,
      hospital_provider_id: useFreeText ? null : (hospitalId || null),
      admission_date: admDate,
      discharge_date: discDate || null,
      diagnosis: diagnosis || null,
      codes: codes as any,
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Log a hospital admission</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Admission title (e.g. "Knee surgery", "Pneumonia")</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short label for this admission" />
          </div>

          <div>
            <Label className="text-sm">Hospital</Label>
            {!useFreeText ? (
              <Select
                value={hospitalId}
                onValueChange={(v) => {
                  if (v === FREE_TEXT) { setUseFreeText(true); setHospitalId(""); return; }
                  setHospitalId(v);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select a hospital..." /></SelectTrigger>
                <SelectContent>
                  {hospitals.map((h: any) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}{h.city ? ` — ${h.city}` : ""}
                    </SelectItem>
                  ))}
                  <SelectItem value={FREE_TEXT}>+ Type a hospital not listed</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={hospitalText}
                  onChange={(e) => setHospitalText(e.target.value)}
                  placeholder="Hospital name"
                  autoFocus
                />
                <Button type="button" variant="outline" size="sm" onClick={() => { setUseFreeText(false); setHospitalText(""); }}>
                  Choose from list
                </Button>
              </div>
            )}
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

          {/* Codes section */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <Label className="text-sm font-semibold">Diagnosis / procedure codes (ICD-10, CPT, etc.)</Label>
            <p className="text-xs text-muted-foreground mb-2">Add a code and a matching description.</p>
            {codes.length > 0 && (
              <ul className="space-y-1.5 mb-2">
                {codes.map((c, i) => (
                  <li key={i} className="flex items-center gap-2 rounded bg-background border p-2 text-xs">
                    <span className="font-mono font-semibold text-primary">{c.code}</span>
                    {c.description && <span className="text-muted-foreground flex-1 truncate">{c.description}</span>}
                    <button type="button" onClick={() => removeCode(i)} className="text-destructive hover:opacity-70">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-[110px_1fr_auto] gap-2">
              <Input
                placeholder="Code"
                value={newCode.code}
                onChange={(e) => setNewCode((p) => ({ ...p, code: e.target.value }))}
                className="font-mono text-xs"
              />
              <Input
                placeholder="Description"
                value={newCode.description}
                onChange={(e) => setNewCode((p) => ({ ...p, description: e.target.value }))}
                className="text-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={addCode} disabled={!newCode.code.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
