import { useState } from "react";
import { X, FileEdit, Loader2, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useTemplateWithHeaderFooter } from "@/hooks/useTemplateWithHeaderFooter";
import { DocumentPreview } from "./DocumentPreview";

interface GeneralLetterEditorProps {
  patientId: string;
  patientName: string;
  sessionId?: string;
  onClose: () => void;
  onSave: (letter: { content: string }) => void;
}

const FALLBACK_TEMPLATE = `[PRACTICE_ADDRESS]
Practice No: [PRACTICE_NUMBER]
Registration No: [DOCTOR_NUMBER]

Date: [DATE]

To Whom It May Concern,

RE: [PATIENT_NAME]

[LETTER_CONTENT]

Yours faithfully,

Signature: ___________________
           [DOCTOR_NAME]
`;

export function GeneralLetterEditor({ 
  patientId,
  patientName,
  sessionId,
  onClose, 
  onSave 
}: GeneralLetterEditorProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { formattedContent: savedTemplate, headerFooter, isLoading: templateLoading } = useTemplateWithHeaderFooter("General");
  
  const doctorName = profile?.full_name || "Doctor";
  const practiceNumber = profile?.practice_number || "";
  const practiceAddress = profile?.practice_address || "";
  const doctorNumber = profile?.doctor_number || "";
  
  const [subject, setSubject] = useState("");
  const [letterContent, setLetterContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const baseTemplate = savedTemplate || FALLBACK_TEMPLATE;

  const generateContent = () => {
    return baseTemplate
      .replace(/\[DATE\]/g, new Date().toLocaleDateString())
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
      .replace("[LETTER_CONTENT]", letterContent);
  };

  const handleSave = async () => {
    if (!letterContent.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter the letter content",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const content = generateContent();
      const documentName = subject 
        ? `General Letter - ${subject} - ${patientName} - ${new Date().toLocaleDateString()}`
        : `General Letter - ${patientName} - ${new Date().toLocaleDateString()}`;

      const { error } = await supabase
        .from('documents')
        .insert({
          name: documentName,
          content: content,
          patient_id: patientId,
          patient_name: patientName,
          template_name: 'General Letter',
          user_id: user.id,
        });

      if (error) throw error;

      onSave({ content });
      toast({
        title: "Letter Saved",
        description: "The general letter has been saved",
      });
      onClose();
    } catch (error: any) {
      console.error("Error saving letter:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save letter",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (showPreview) {
    return (
      <DocumentPreview
        title="General Letter"
        subtitle={`Patient: ${patientName}`}
        content={generateContent()}
        logoUrl={profile?.logo_url || undefined}
        fontFamily={headerFooter?.font_family || undefined}
        headerFooter={headerFooter}
        onClose={() => setShowPreview(false)}
        closeLabel="Back to Form"
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
              <FileEdit className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">General Letter</h2>
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
            <Label htmlFor="subject">Subject (Optional)</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Follow-up consultation, Insurance claim"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="letter-content">Letter Content *</Label>
            <Textarea
              id="letter-content"
              value={letterContent}
              onChange={(e) => setLetterContent(e.target.value)}
              placeholder="Enter the main content of the letter..."
              className="min-h-[200px]"
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
