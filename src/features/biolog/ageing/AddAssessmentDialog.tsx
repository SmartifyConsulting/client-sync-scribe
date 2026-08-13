import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { uploadAgeingReport } from "./useAgeing";
import { AGEING_MODELS, SAMPLE_TYPES, type BiologicalAgeAssessment } from "./types";
import { chronologicalAge } from "./ageingMath";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dob?: string | null;
  onSave: (payload: Partial<BiologicalAgeAssessment>) => Promise<void>;
}

const labelClass = "text-xs font-bold text-foreground";

export function AddAssessmentDialog({ open, onOpenChange, dob, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    assessment_date: new Date().toISOString().slice(0, 10),
    laboratory_name: "",
    provider_name: "",
    biological_age: "",
    ageing_pace: "",
    model_name: AGEING_MODELS[0],
    sample_type: SAMPLE_TYPES[0],
    reference_population: "",
    source: "",
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!form.biological_age) {
      toast.error("Enter the biological age result from your report.");
      return;
    }
    setSaving(true);
    try {
      let report_path: string | null = null;
      if (file) report_path = await uploadAgeingReport(file);
      await onSave({
        assessment_date: form.assessment_date,
        biological_age: Number(form.biological_age),
        chronological_age: chronologicalAge(dob, form.assessment_date),
        ageing_pace: form.ageing_pace ? Number(form.ageing_pace) : null,
        assessment_type: "dna_methylation",
        model_name: form.model_name,
        provider_name: form.provider_name || null,
        laboratory_name: form.laboratory_name || null,
        sample_type: form.sample_type || null,
        reference_population: form.reference_population || null,
        source: form.source || null,
        notes: form.notes || null,
        report_path,
      });
      toast.success("Assessment saved.");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || "Could not save the assessment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add DNA methylation assessment</DialogTitle>
          <DialogDescription className="text-xs">
            Enter the results exactly as they appear on your laboratory report. Holarc Health stores the values as
            supplied and never calculates a biological age of its own.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className={labelClass}>Test date</Label>
            <Input type="date" value={form.assessment_date} onChange={(e) => set("assessment_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Laboratory / provider</Label>
            <Input value={form.laboratory_name} onChange={(e) => set("laboratory_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Test name</Label>
            <Input value={form.provider_name} onChange={(e) => set("provider_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Model / algorithm</Label>
            <Select value={form.model_name} onValueChange={(v) => set("model_name", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGEING_MODELS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Biological age result (years)</Label>
            <Input type="number" step="0.1" value={form.biological_age} onChange={(e) => set("biological_age", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Ageing pace (optional)</Label>
            <Input type="number" step="0.01" value={form.ageing_pace} onChange={(e) => set("ageing_pace", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Sample type</Label>
            <Select value={form.sample_type} onValueChange={(v) => set("sample_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SAMPLE_TYPES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Reference population</Label>
            <Input value={form.reference_population} onChange={(e) => set("reference_population", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Source</Label>
            <Input value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="e.g. Home kit, Clinic" />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Report upload (private)</Label>
            <Input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className={labelClass}>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save assessment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
