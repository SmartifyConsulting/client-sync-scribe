import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patientId: string;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export function UploadAdmissionDialog({ open, onOpenChange, patientId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [hospital, setHospital] = useState("");
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().slice(0, 10));
  const [dischargeDate, setDischargeDate] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [procedure, setProcedure] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const reset = () => {
    setHospital("");
    setAdmissionDate(new Date().toISOString().slice(0, 10));
    setDischargeDate("");
    setDiagnosis("");
    setProcedure("");
    setFile(null);
  };

  const handleFileChange = (f: File | null) => {
    if (f && f.size > MAX_FILE_BYTES) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB.",
        variant: "destructive",
      });
      return;
    }
    setFile(f);
  };

  const handleSave = async () => {
    if (!hospital.trim() && !diagnosis.trim() && !file) {
      toast({
        title: "Add some details",
        description: "Please provide at least a hospital name, diagnosis, or attachment.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let documentId: string | null = null;
      let mediaUrl: string | null = null;

      // Upload attachment if provided
      if (file) {
        setUploading(true);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/admission-${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("patient-media")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: pub } = supabase.storage.from("patient-media").getPublicUrl(path);
        mediaUrl = pub.publicUrl;
        setUploading(false);

        // Persist a documents row so the file lives in the documents library
        const docName = `Hospital Admission${hospital ? " â€” " + hospital : ""} (${admissionDate})`;
        const { data: docRow, error: docError } = await supabase
          .from("documents")
          .insert({
            user_id: user.id,
            patient_id: patientId,
            name: docName,
            content: diagnosis || procedure || "Hospital admission form",
            media_url: mediaUrl,
            media_type: file.type || "application/octet-stream",
            template_name: "Hospital Admission",
          })
          .select("id")
          .single();
        if (docError) throw docError;
        documentId = docRow.id;
      }

      const status = dischargeDate ? "discharged" : "admitted";

      const { error: admissionError } = await supabase
        .from("hospital_admissions")
        .insert({
          patient_id: patientId,
          doctor_id: user.id,
          document_id: documentId,
          hospital: hospital || null,
          admission_date: admissionDate,
          discharge_date: dischargeDate || null,
          diagnosis: diagnosis || null,
          procedure_description: procedure || null,
          status,
        });
      if (admissionError) throw admissionError;

      toast({ title: "Admission saved", description: "The hospital admission has been added to the record." });
      qc.invalidateQueries({ queryKey: ["hospital-admissions", patientId] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Could not save admission",
        description: e.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Admission Form</DialogTitle>
          <DialogDescription>
            Add a hospital admission record. Attach a PDF or photo of the admission form (max 5MB).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Hospital</Label>
            <Input
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              placeholder="e.g. Netcare Linksfield"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Admission Date</Label>
              <Input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm">Discharge Date</Label>
              <Input type="date" value={dischargeDate} onChange={(e) => setDischargeDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-sm">Diagnosis</Label>
            <Textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={2}
              placeholder="Reason for admission"
            />
          </div>
          <div>
            <Label className="text-sm">Procedure / Notes</Label>
            <Textarea
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
              rows={2}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label className="text-sm">Attachment (PDF or image)</Label>
            <Input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-sm text-muted-foreground mt-1">
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploading ? "Uploading..." : "Saving..."}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Save Admission
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

