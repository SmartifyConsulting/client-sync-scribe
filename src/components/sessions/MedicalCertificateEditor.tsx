import { useState, useEffect } from "react";
import { X, FileText, Loader2, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useTemplateWithHeaderFooter } from "@/hooks/useTemplateWithHeaderFooter";
import { DocumentPreview } from "./DocumentPreview";

interface MedicalCertificateEditorProps {
  patientId: string;
  patientName: string;
  sessionId?: string;
  onClose: () => void;
  onSave: (certificate: { content: string }) => void;
}

const FALLBACK_TEMPLATE = `MEDICAL CERTIFICATE

[PRACTICE_ADDRESS]
Practice No: [PRACTICE_NUMBER]
Registration No: [DOCTOR_NUMBER]

Date: [DATE]
Patient: [PATIENT_NAME]
Doctor: [DOCTOR_NAME]

─────────────────────────────────────

This is to certify that the above-named patient was examined on [DATE] and is unfit for duty due to medical reasons.

[CERTIFICATE_CONTENT]

Period of Leave: [LEAVE_PERIOD]

─────────────────────────────────────

Signature: ___________________
           [DOCTOR_NAME]
`;

export function MedicalCertificateEditor({ 
  patientId,
  patientName,
  sessionId,
  onClose, 
  onSave 
}: MedicalCertificateEditorProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { formattedContent: savedTemplate, isLoading: templateLoading } = useTemplateWithHeaderFooter("Medical Certificate");
  
  const doctorName = profile?.full_name || "Doctor";
  const practiceNumber = profile?.practice_number || "";
  const practiceAddress = profile?.practice_address || "";
  const doctorNumber = profile?.doctor_number || "";
  
  const [leavePeriod, setLeavePeriod] = useState("");
  const [medicalReason, setMedicalReason] = useState("");
  const [examinationDate, setExaminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const baseTemplate = savedTemplate || FALLBACK_TEMPLATE;

  const generateContent = () => {
    return baseTemplate
      .replace(/\[DATE\]/g, new Date(examinationDate).toLocaleDateString())
      .replace(/\[PATIENT_NAME\]/g, patientName)
      .replace(/\[PatientName\]/g, patientName)
      .replace(/\[DOCTOR_NAME\]/g, doctorName)
      .replace(/\[DoctorName\]/g, doctorName)
      .replace(/\[PRACTICE_NUMBER\]/g, practiceNumber)
      .replace(/\[PracticeNumber\]/g, practiceNumber)
      .replace(/\[PRACTICE_ADDRESS\]/g, practiceAddress)
      .replace(/\[PracticeAddress\]/g, practiceAddress)
      .replace(/\[DOCTOR_NUMBER\]/g, doctorNumber)
      .replace(/\[DoctorNumber\]/g, doctorNumber)
      .replace("[CERTIFICATE_CONTENT]", medicalReason)
      .replace("[LEAVE_PERIOD]", leavePeriod)
      .replace(/\[ConsultationDate\]/g, new Date(examinationDate).toLocaleDateString())
      .replace(/\[ConsultationTime\]/g, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const handleSave = async () => {
    if (!leavePeriod.trim() || !medicalReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in the medical reason and period of leave",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const content = generateContent();

      const { error } = await supabase
        .from('documents')
        .insert({
          name: `Medical Certificate - ${patientName} - ${new Date().toLocaleDateString()}`,
          content: content,
          patient_id: patientId,
          patient_name: patientName,
          template_name: 'Medical Certificate',
          user_id: user.id,
        });

      if (error) throw error;

      onSave({ content });
      toast({
        title: "Certificate Saved",
        description: "The medical certificate has been saved",
      });

      // Auto-email to employer if patient allows
      try {
        const { data: patientData } = await supabase
          .from('patients')
          .select('reporting_to_email, patient_user_id')
          .eq('id', patientId)
          .maybeSingle();

        if (patientData?.patient_user_id && patientData?.reporting_to_email) {
          const { data: patientProfile } = await supabase
            .from('profiles')
            .select('auto_email_certificate_to_employer')
            .eq('id', patientData.patient_user_id)
            .maybeSingle();

          if (patientProfile?.auto_email_certificate_to_employer) {
            await supabase.functions.invoke('send-document-email', {
              body: {
                to: patientData.reporting_to_email,
                subject: `Medical Certificate - ${patientName}`,
                documentName: `Medical Certificate - ${patientName}`,
                documentContent: content,
                senderName: profile?.full_name || 'Doctor',
              },
            });
            toast({
              title: "Certificate Auto-Sent",
              description: `Automatically emailed to employer`,
            });
          }
        }
      } catch (autoErr) {
        console.error("Auto-email certificate error:", autoErr);
      }

      onClose();
    } catch (error: any) {
      console.error("Error saving certificate:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save certificate",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (showPreview) {
    return (
      <DocumentPreview
        title="Medical Certificate"
        subtitle={`Patient: ${patientName}`}
        content={generateContent()}
        logoUrl={profile?.logo_url || undefined}
        fontFamily={headerFooter?.font_family || undefined}
        headerFooter={headerFooter}
        onClose={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-xl border border-primary bg-card shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Medical Certificate</h2>
              <p className="text-sm text-muted-foreground">Patient: {patientName}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="examination-date">Date of Examination</Label>
            <Input
              id="examination-date"
              type="date"
              value={examinationDate}
              onChange={(e) => setExaminationDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="leave-period">Period of Leave *</Label>
            <Input
              id="leave-period"
              value={leavePeriod}
              onChange={(e) => setLeavePeriod(e.target.value)}
              placeholder="e.g., 3 days (Dec 11 - Dec 13, 2025)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medical-reason">Medical Reason *</Label>
            <Textarea
              id="medical-reason"
              value={medicalReason}
              onChange={(e) => setMedicalReason(e.target.value)}
              placeholder="Describe the medical condition and reason for leave..."
              className="min-h-[120px]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowPreview(true)} className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button onClick={handleSave} className="gap-2" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
