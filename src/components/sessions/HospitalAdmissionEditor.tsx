import { useState } from "react";
import { X, FileText, Loader2, Save, Eye, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useTemplateWithHeaderFooter } from "@/hooks/useTemplateWithHeaderFooter";
import { DocumentPreview } from "./DocumentPreview";

interface HospitalAdmissionEditorProps {
  patientId: string;
  patientName: string;
  sessionId?: string;
  onClose: () => void;
  onSave: (doc: { content: string }) => void;
}

interface ICD10Entry {
  code: string;
  description: string;
}

interface InstructionEntry {
  instruction: string;
  description: string;
}

const FALLBACK_TEMPLATE = `HOSPITAL ADMISSION FORM

[PRACTICE_ADDRESS]
Practice No: [PRACTICE_NUMBER]
Registration No: [DOCTOR_NUMBER]

─────────────────────────────────────

ADMISSION DETAILS

Admitting Doctor: [DOCTOR_NAME]
Practice Number: [PRACTICE_NUMBER]
Hospital: [HOSPITAL]
Date of Admission: [ADMISSION_DATE]

─────────────────────────────────────

DIAGNOSIS DETAILS — ICD-10 CODES

[ICD10_CODES]

─────────────────────────────────────

PROCEDURE DETAILS

Date of Procedure: [PROCEDURE_DATE]
Procedure Description: [PROCEDURE_DESCRIPTION]
NHRPL Codes: [NHRPL_CODES]

─────────────────────────────────────

PATIENT SPECIAL INSTRUCTIONS

[SPECIAL_INSTRUCTIONS]

─────────────────────────────────────

Patient: [PATIENT_NAME]

Signature: ___________________
           [DOCTOR_NAME]
`;

export function HospitalAdmissionEditor({
  patientId,
  patientName,
  sessionId,
  onClose,
  onSave,
}: HospitalAdmissionEditorProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { formattedContent: savedTemplate, isLoading: templateLoading } =
    useTemplateWithHeaderFooter("Hospital Admission Form");

  const doctorName = profile?.full_name || "Doctor";
  const practiceNumber = profile?.practice_number || "";
  const practiceAddress = profile?.practice_address || "";
  const doctorNumber = profile?.doctor_number || "";

  const [hospital, setHospital] = useState("");
  const [admissionDate, setAdmissionDate] = useState<Date | undefined>(new Date());
  const [icd10Codes, setIcd10Codes] = useState<ICD10Entry[]>([{ code: "", description: "" }]);
  const [procedureDate, setProcedureDate] = useState<Date | undefined>(new Date());
  const [procedureDescription, setProcedureDescription] = useState("");
  const [nhrplCodes, setNhrplCodes] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState<InstructionEntry[]>([
    { instruction: "", description: "" },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const addICD10 = () => setIcd10Codes([...icd10Codes, { code: "", description: "" }]);
  const removeICD10 = (i: number) => setIcd10Codes(icd10Codes.filter((_, idx) => idx !== i));
  const updateICD10 = (i: number, field: keyof ICD10Entry, value: string) => {
    const updated = [...icd10Codes];
    updated[i][field] = value;
    setIcd10Codes(updated);
  };

  const addInstruction = () =>
    setSpecialInstructions([...specialInstructions, { instruction: "", description: "" }]);
  const removeInstruction = (i: number) =>
    setSpecialInstructions(specialInstructions.filter((_, idx) => idx !== i));
  const updateInstruction = (i: number, field: keyof InstructionEntry, value: string) => {
    const updated = [...specialInstructions];
    updated[i][field] = value;
    setSpecialInstructions(updated);
  };

  const baseTemplate = savedTemplate || FALLBACK_TEMPLATE;

  const generateContent = () => {
    const icd10Text = icd10Codes
      .filter((e) => e.code.trim())
      .map((e) => `• ${e.code}${e.description ? ` — ${e.description}` : ""}`)
      .join("\n");

    const instructionsText = specialInstructions
      .filter((e) => e.instruction.trim())
      .map((e) => `• ${e.instruction}${e.description ? ` — ${e.description}` : ""}`)
      .join("\n");

    return baseTemplate
      .replace(/\[DOCTOR_NAME\]/g, doctorName)
      .replace(/\[DoctorName\]/g, doctorName)
      .replace(/\[PRACTICE_NUMBER\]/g, practiceNumber)
      .replace(/\[PracticeNumber\]/g, practiceNumber)
      .replace(/\[PRACTICE_ADDRESS\]/g, practiceAddress)
      .replace(/\[PracticeAddress\]/g, practiceAddress)
      .replace(/\[DOCTOR_NUMBER\]/g, doctorNumber)
      .replace(/\[DoctorNumber\]/g, doctorNumber)
      .replace(/\[PATIENT_NAME\]/g, patientName)
      .replace(/\[PatientName\]/g, patientName)
      .replace("[HOSPITAL]", hospital || "—")
      .replace("[ADMISSION_DATE]", admissionDate ? format(admissionDate, "dd/MM/yyyy") : "—")
      .replace("[ICD10_CODES]", icd10Text || "None specified")
      .replace("[PROCEDURE_DATE]", procedureDate ? format(procedureDate, "dd/MM/yyyy") : "—")
      .replace("[PROCEDURE_DESCRIPTION]", procedureDescription || "—")
      .replace("[NHRPL_CODES]", nhrplCodes || "—")
      .replace("[SPECIAL_INSTRUCTIONS]", instructionsText || "None");
  };

  const handleSave = async () => {
    if (!hospital.trim()) {
      toast({ title: "Missing Information", description: "Please enter the hospital name", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const content = generateContent();

      const { error } = await supabase.from("documents").insert({
        name: `Hospital Admission Form - ${patientName} - ${admissionDate ? format(admissionDate, "dd/MM/yyyy") : new Date().toLocaleDateString()}`,
        content,
        patient_id: patientId,
        patient_name: patientName,
        template_name: "Hospital Admission Form",
        user_id: user.id,
      });

      if (error) throw error;

      onSave({ content });
      toast({ title: "Hospital Admission Form Saved", description: "The form has been saved successfully." });
      onClose();
    } catch (error: any) {
      console.error("Error saving hospital admission form:", error);
      toast({ title: "Error", description: error.message || "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (showPreview) {
    return (
      <DocumentPreview
        title="Hospital Admission Form"
        subtitle={`Patient: ${patientName}`}
        content={generateContent()}
        logoUrl={profile?.logo_url || undefined}
        onClose={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10">
              <FileText className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Hospital Admission Form</h2>
              <p className="text-sm text-muted-foreground">Patient: {patientName}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Admission Details */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Admission Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Admitting Doctor</Label>
                <Input value={doctorName} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>Practice Number</Label>
                <Input value={practiceNumber} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>Hospital *</Label>
                <Input value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="e.g., Mediclinic Sandton" />
              </div>
              <div className="space-y-2">
                <Label>Date of Admission</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !admissionDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {admissionDate ? format(admissionDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={admissionDate} onSelect={setAdmissionDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* ICD-10 Codes */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Diagnosis Details — ICD-10 Codes</h3>
            <div className="space-y-2">
              {icd10Codes.map((entry, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Input
                    className="w-28 shrink-0"
                    value={entry.code}
                    onChange={(e) => updateICD10(i, "code", e.target.value)}
                    placeholder="Code"
                  />
                  <Input
                    className="flex-1"
                    value={entry.description}
                    onChange={(e) => updateICD10(i, "description", e.target.value)}
                    placeholder="Description"
                  />
                  {icd10Codes.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeICD10(i)} className="shrink-0 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addICD10} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add ICD-10 Code
              </Button>
            </div>
          </div>

          {/* Procedure Details */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Procedure Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Procedure</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !procedureDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {procedureDate ? format(procedureDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={procedureDate} onSelect={setProcedureDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>NHRPL Codes</Label>
                  <Input value={nhrplCodes} onChange={(e) => setNhrplCodes(e.target.value)} placeholder="e.g., 0517" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Procedure Description</Label>
                <Textarea
                  value={procedureDescription}
                  onChange={(e) => setProcedureDescription(e.target.value)}
                  placeholder="Describe the procedure..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Patient Special Instructions</h3>
            <div className="space-y-2">
              {specialInstructions.map((entry, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Input
                    className="w-40 shrink-0"
                    value={entry.instruction}
                    onChange={(e) => updateInstruction(i, "instruction", e.target.value)}
                    placeholder="Instruction"
                  />
                  <Input
                    className="flex-1"
                    value={entry.description}
                    onChange={(e) => updateInstruction(i, "description", e.target.value)}
                    placeholder="Description"
                  />
                  {specialInstructions.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeInstruction(i)} className="shrink-0 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addInstruction} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Instruction
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
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
