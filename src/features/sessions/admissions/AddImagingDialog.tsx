import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export function AddImagingDialog({ open, onOpenChange, admissionId, hospitalId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [nurse, setNurse] = useState<{ id: string; name: string } | null>(null);
  const [modality, setModality] = useState("X-ray");
  const [bodyRegion, setBodyRegion] = useState("");
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 10));
  const [pacsLink, setPacsLink] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const path = `${user.id}/imaging-${admissionId}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("patient-media").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("patient-media").getPublicUrl(path);
      setAttachmentUrl(data.publicUrl);
      toast({ title: "Attachment uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("admission_imaging").insert({
        admission_id: admissionId,
        recorded_by: user.id,
        nurse_id: nurse?.id ?? null,
        nurse_name_snapshot: nurse?.name ?? null,
        modality,
        body_region: bodyRegion || null,
        performed_at: performedAt,
        pacs_link: pacsLink || null,
        attachment_url: attachmentUrl || null,
        summary: summary || null,
      } as any);
      if (error) throw error;
      toast({ title: "Imaging record saved" });
      qc.invalidateQueries({ queryKey: ["admission-imaging", admissionId] });
      setBodyRegion(""); setPacsLink(""); setAttachmentUrl(""); setSummary("");
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
        <DialogHeader><DialogTitle>Add Imaging Record</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <NursePicker hospitalId={hospitalId} value={nurse?.id ?? null} onChange={setNurse} />
          <div>
            <Label className="text-sm">Modality</Label>
            <Select value={modality} onValueChange={setModality}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="X-ray">X-ray</SelectItem>
                <SelectItem value="MRI">MRI</SelectItem>
                <SelectItem value="CT">CT</SelectItem>
                <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                <SelectItem value="PET">PET</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-sm">Body Region</Label><Input value={bodyRegion} onChange={(e) => setBodyRegion(e.target.value)} placeholder="e.g. Chest, Lumbar spine" /></div>
          <div><Label className="text-sm">Performed Date</Label><Input type="date" value={performedAt} onChange={(e) => setPerformedAt(e.target.value)} /></div>
          <div><Label className="text-sm">PACS Link</Label><Input value={pacsLink} onChange={(e) => setPacsLink(e.target.value)} placeholder="https://..." /></div>
          <div>
            <Label className="text-sm">Attach PDF Summary</Label>
            <Input type="file" accept="application/pdf,image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} disabled={uploading} />
            {attachmentUrl && <p className="text-xs text-muted-foreground mt-1">Attached ✓</p>}
          </div>
          <div><Label className="text-sm">Summary</Label><Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
