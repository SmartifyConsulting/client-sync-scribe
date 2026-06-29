import { useState } from "react";
import { useTranslation } from "react-i18next";
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

export function AddLabResultDialog({ open, onOpenChange, admissionId, hospitalId }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [nurse, setNurse] = useState<{ id: string; name: string } | null>(null);
  const [testName, setTestName] = useState("");
  const [resultValue, setResultValue] = useState("");
  const [units, setUnits] = useState("");
  const [refRange, setRefRange] = useState("");
  const [resultDate, setResultDate] = useState(new Date().toISOString().slice(0, 10));
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const path = `${user.id}/lab-${admissionId}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("patient-media").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("patient-media").getPublicUrl(path);
      setAttachmentUrl(data.publicUrl);
      toast({ title: t("messages.success") });
    } catch (e: any) {
      toast({ title: t("dialogs.error"), description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!testName.trim()) {
      toast({ title: t("forms.validation.required"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("admission_lab_results").insert({
        admission_id: admissionId,
        recorded_by: user.id,
        nurse_id: nurse?.id ?? null,
        nurse_name_snapshot: nurse?.name ?? null,
        test_name: testName,
        result_value: resultValue || null,
        units: units || null,
        reference_range: refRange || null,
        result_date: resultDate,
        attachment_url: attachmentUrl || null,
        notes: notes || null,
      } as any);
      if (error) throw error;
      toast({ title: t("dialogs.success") });
      qc.invalidateQueries({ queryKey: ["admission-lab-results", admissionId] });
      setTestName(""); setResultValue(""); setUnits(""); setRefRange(""); setAttachmentUrl(""); setNotes("");
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("dialogs.error"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("admissions.lab.title")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <NursePicker hospitalId={hospitalId} value={nurse?.id ?? null} onChange={setNurse} />
          <div><Label className="text-[11px]">{t("admissions.lab.testName")}</Label><Input value={testName} onChange={(e) => setTestName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-[11px]">{t("admissions.lab.result")}</Label><Input value={resultValue} onChange={(e) => setResultValue(e.target.value)} /></div>
            <div><Label className="text-[11px]">{t("admissions.lab.units")}</Label><Input value={units} onChange={(e) => setUnits(e.target.value)} /></div>
          </div>
          <div><Label className="text-[11px]">{t("admissions.lab.refRange")}</Label><Input value={refRange} onChange={(e) => setRefRange(e.target.value)} /></div>
          <div><Label className="text-[11px]">{t("admissions.lab.resultDate")}</Label><Input type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} /></div>
          <div>
            <Label className="text-[11px]">{t("admissions.lab.attachPdf")}</Label>
            <Input type="file" accept="application/pdf,image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} disabled={uploading} />
            {attachmentUrl && <p className="text-[10px] text-muted-foreground mt-1 truncate">{t("admissions.lab.attached")}</p>}
          </div>
          <div><Label className="text-[11px]">{t("forms.labels.name")}</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("dialogs.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>{saving ? t("common.loading") : t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
