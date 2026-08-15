import { useState, useCallback, useEffect } from "react";
import {
  X,
  Save,
  Loader2,
  Pill,
  AlertTriangle,
  CheckCircle,
  Shield,
  Plus,
  Trash2,
  Eye,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SendDocumentButton } from "./SendDocumentButton";
import { DocumentPreview } from "./DocumentPreview";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useTemplateWithHeaderFooter } from "@/hooks/useTemplateWithHeaderFooter";

interface MedicationConflict {
  type: "drug-drug" | "drug-allergy";
  medication1: string;
  medication2?: string;
  severity: "low" | "moderate" | "high";
  explanation: string;
  recommendation: string;
}

interface CurrentMedication {
  medication: string;
  dosage: string;
  frequency: string;
}

interface MedicationItem {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  repeats: string;
}

interface PrescriptionEditorProps {
  patientName: string;
  patientId: string;
  doctorName?: string;
  allergies?: string | null;
  currentMedications?: CurrentMedication[];
  onClose: () => void;
  onSave: (prescription: { content: string; rawTranscript: string }) => void;
}

export function PrescriptionEditor({ 
  patientName,
  patientId,
  doctorName: propDoctorName,
  allergies,
  currentMedications = [],
  onClose, 
  onSave 
}: PrescriptionEditorProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { formattedContent: savedTemplate, headerFooter } = useTemplateWithHeaderFooter("Prescription");
  const doctorName = propDoctorName || profile?.full_name || "Doctor";
  
  const [medications, setMedications] = useState<MedicationItem[]>([
    { id: crypto.randomUUID(), medication: "", dosage: "", frequency: "", duration: "", instructions: "", repeats: "0" }
  ]);
  const [conflicts, setConflicts] = useState<MedicationConflict[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [conflictCheckDone, setConflictCheckDone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const addMedication = () => {
    setMedications(prev => [...prev, { 
      id: crypto.randomUUID(), 
      medication: "", 
      dosage: "", 
      frequency: "", 
      duration: "", 
      instructions: "",
      repeats: "0"
    }]);
  };

  const removeMedication = (id: string) => {
    if (medications.length > 1) {
      setMedications(prev => prev.filter(m => m.id !== id));
    }
  };

  const updateMedication = (id: string, field: keyof MedicationItem, value: string) => {
    setMedications(prev => prev.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const generateContent = () => {
    const medicationLines = medications
      .filter(m => m.medication.trim())
      .map(m => {
        let line = `• ${m.medication}`;
        if (m.dosage) line += ` - ${m.dosage}`;
        if (m.frequency) line += ` - ${m.frequency}`;
        if (m.duration) line += ` for ${m.duration}`;
        if (m.repeats && m.repeats !== "0") line += `\n  Repeats: ${m.repeats}`;
        if (m.instructions) line += `\n  Instructions: ${m.instructions}`;
        return line;
      })
      .join('\n\n');

    const prescriptionBody = `PRESCRIPTION

Date: ${new Date().toLocaleDateString()}
Patient: ${patientName}
Doctor: ${doctorName}

─────────────────────────────────────

MEDICATIONS:

${medicationLines}

─────────────────────────────────────

Instructions: Take medications as prescribed above.
Follow-up: As directed by physician.

Signature: ___________________
           ${doctorName}`;

    // If we have a saved template with header/footer, use it as wrapper
    if (savedTemplate) {
      return savedTemplate
        .replace(/\[DATE\]/g, new Date().toLocaleDateString())
        .replace(/\[PrescriptionDate\]/g, new Date().toLocaleDateString())
        .replace(/\[PATIENT_NAME\]/g, patientName)
        .replace(/\[PatientName\]/g, patientName)
        .replace(/\[DOCTOR_NAME\]/g, doctorName)
        .replace(/\[DoctorName\]/g, doctorName)
        .replace(/\[PRESCRIPTION_CONTENT\]/g, prescriptionBody);
    }

    return prescriptionBody;
  };

  // Check for medication conflicts
  const checkConflicts = useCallback(async () => {
    const medicationNames = medications.filter(m => m.medication.trim()).map(m => m.medication);
    if (medicationNames.length === 0) return;
    
    setIsCheckingConflicts(true);
    setConflictCheckDone(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('check-medication-conflicts', {
        body: {
          newMedication: medicationNames.join(', '),
          currentMedications,
          allergies: allergies || 'None known',
        },
      });

      if (error) throw error;
      
      if (data?.conflicts && data.conflicts.length > 0) {
        setConflicts(data.conflicts);
        toast({
          title: "⚠️ Medication Conflict Detected",
          description: `${data.conflicts.length} potential conflict(s) found. Please review before saving.`,
          variant: "destructive",
        });
      } else {
        setConflicts([]);
      }
      setConflictCheckDone(true);
    } catch (error: any) {
      console.error("Error checking conflicts:", error);
      setConflictCheckDone(true);
    } finally {
      setIsCheckingConflicts(false);
    }
  }, [medications, currentMedications, allergies, toast]);

  const handleSave = async () => {
    const validMedications = medications.filter(m => m.medication.trim());
    if (validMedications.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please add at least one medication",
        variant: "destructive",
      });
      return;
    }

    if (conflicts.length > 0) {
      const highSeverityConflicts = conflicts.filter(c => c.severity === 'high');
      if (highSeverityConflicts.length > 0) {
        toast({
          title: "High-Risk Conflicts Detected",
          description: "Please review the high-severity medication conflicts before proceeding.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const content = generateContent();
      onSave({ content, rawTranscript: "" });
      toast({
        title: "Prescription Saved",
        description: "The prescription has been saved to the session",
      });

      // Auto-email to pharmacy if patient allows
      try {
        const { data: patientData } = await supabase
          .from('patients')
          .select('pharmacy_email, pharmacy_name, patient_user_id, pharmacies')
          .eq('id', patientId)
          .maybeSingle();

        if (patientData?.patient_user_id) {
          const { data: patientProfile } = await supabase
            .from('profiles')
            .select('auto_email_prescription_to_pharmacy')
            .eq('id', patientData.patient_user_id)
            .maybeSingle();

          if (patientProfile?.auto_email_prescription_to_pharmacy) {
            // Find primary pharmacy email
            let pharmacyEmail = patientData.pharmacy_email;
            if (!pharmacyEmail && patientData.pharmacies) {
              const pharmacies = patientData.pharmacies as any[];
              const primary = pharmacies.find((p: any) => p.is_primary) || pharmacies[0];
              pharmacyEmail = primary?.email;
            }

            if (pharmacyEmail) {
              await supabase.functions.invoke('send-document-email', {
                body: {
                  to: pharmacyEmail,
                  subject: `Prescription for ${patientName}`,
                  documentName: `Prescription - ${patientName}`,
                  documentContent: content,
                  senderName: doctorName,
                },
              });
              toast({
                title: "Prescription Auto-Sent",
                description: `Automatically emailed to pharmacy`,
              });
            }
          }
        }
      } catch (autoErr) {
        console.error("Auto-email prescription error:", autoErr);
      }

      // Auto-assign medication adherence tasks for chronic patients
      try {
        const { data: patientCheck } = await supabase
          .from('patients')
          .select('is_chronic, patient_user_id')
          .eq('id', patientId)
          .maybeSingle();

        if (patientCheck?.is_chronic) {
          const { data: { user } } = await supabase.auth.getUser();
          const validMeds = medications.filter(m => m.medication.trim());
          
          for (const med of validMeds) {
            // Save prescription record to DB
            await supabase.from('prescriptions').insert({
              patient_id: patientId,
              doctor_id: user!.id,
              medication: med.medication,
              dosage: med.dosage,
              frequency: med.frequency,
              instructions: med.instructions || null,
              status: 'active',
            });

            // Create a todo task for the patient
            await supabase.from('todos').insert({
              user_id: user!.id,
              patient_id: patientId,
              title: `Take ${med.medication} - ${med.dosage}`,
              description: `Daily medication: ${med.frequency}. ${med.instructions || ''}`.trim(),
              task_type: 'medication',
              vulas_reward: 5,
              priority: 'high',
            });
          }

          // Notify patient about new medication tracking
          if (patientCheck.patient_user_id) {
            await supabase.from('notifications').insert({
              user_id: patientCheck.patient_user_id,
              title: 'New Chronic Medication Assigned',
              description: `Your doctor has prescribed chronic medication. Track your daily adherence in My Rewards → Chronic Meds to earn Vulas!`,
              type: 'medication_assigned',
              reference_id: patientId,
            });
          }

          toast({
            title: "Adherence Tracking Enabled",
            description: "Daily medication tasks auto-assigned to patient",
          });
        }
      } catch (adherenceErr) {
        console.error("Auto-assign medication adherence error:", adherenceErr);
      }

      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (showPreview) {
    return (
      <DocumentPreview
        title="Prescription"
        subtitle={`Patient: ${patientName}`}
        content={generateContent()}
        logoUrl={profile?.logo_url || headerFooter?.header?.center?.imageUrl || undefined}
        fontFamily={headerFooter?.font_family || undefined}
        headerFooter={headerFooter}
        onClose={() => setShowPreview(false)}
        closeLabel="Back to Form"
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-primary bg-card shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Pill className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Prescription</h2>
              <p className="text-sm text-muted-foreground">Patient: {patientName}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto">
          {/* Medications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Medications</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMedication} className="gap-1">
                <Plus className="h-4 w-4" />
                Add Medication
              </Button>
            </div>
            
            {medications.map((med, index) => (
              <div key={med.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Medication {index + 1}</span>
                  {medications.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeMedication(med.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={med.medication}
                    onChange={(e) => updateMedication(med.id, 'medication', e.target.value)}
                    placeholder="Medication name *"
                  />
                  <Input
                    value={med.dosage}
                    onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)}
                    placeholder="Dosage (e.g., 500mg)"
                  />
                  <Input
                    value={med.frequency}
                    onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                    placeholder="Frequency (e.g., twice daily)"
                  />
                  <Input
                    value={med.duration}
                    onChange={(e) => updateMedication(med.id, 'duration', e.target.value)}
                    placeholder="Duration (e.g., 7 days)"
                  />
                  <Input
                    value={med.repeats}
                    onChange={(e) => updateMedication(med.id, 'repeats', e.target.value)}
                    placeholder="Repeats (e.g., 3)"
                    type="number"
                    min="0"
                  />
                </div>
                <Input
                  value={med.instructions}
                  onChange={(e) => updateMedication(med.id, 'instructions', e.target.value)}
                  placeholder="Special instructions (optional)"
                />
              </div>
            ))}
          </div>

          {/* Conflict Check Section */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Label>Medication Safety Check</Label>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkConflicts}
                disabled={isCheckingConflicts}
                className="gap-2"
              >
                {isCheckingConflicts ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Check Conflicts
                  </>
                )}
              </Button>
            </div>

            {/* Conflict Results */}
            {conflictCheckDone && conflicts.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-400">
                  No medication conflicts detected
                </span>
              </div>
            )}

            {conflicts.length > 0 && (
              <div className="space-y-2">
                {conflicts.map((conflict, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-3 rounded-lg border",
                      conflict.severity === "high"
                        ? "bg-red-500/10 border-red-500/30"
                        : conflict.severity === "moderate"
                        ? "bg-orange-500/10 border-orange-500/30"
                        : "bg-yellow-500/10 border-yellow-500/30"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        conflict.severity === "high" ? "text-red-600" :
                        conflict.severity === "moderate" ? "text-orange-600" : "text-yellow-600"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="text-xs bg-card">
                            {conflict.medication1}
                          </Badge>
                          {conflict.medication2 && (
                            <>
                              <span className="text-xs text-muted-foreground">+</span>
                              <Badge variant="outline" className="text-xs bg-card">
                                {conflict.medication2}
                              </Badge>
                            </>
                          )}
                          <Badge className={cn(
                            "text-xs capitalize ml-auto",
                            conflict.severity === "high" 
                              ? "bg-red-500/20 text-red-700 dark:text-red-400"
                              : conflict.severity === "moderate"
                              ? "bg-orange-500/20 text-orange-700 dark:text-orange-400"
                              : "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                          )}>
                            {conflict.severity} risk
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{conflict.explanation}</p>
                        <p className="text-xs text-foreground mt-1 font-medium">
                          → {conflict.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            <SendDocumentButton
              patientId={patientId}
              patientName={patientName}
              documentLabel="Prescription"
              getContent={generateContent}
              preferredField="pharmacy_email"
              pharmacyMode
              headerFooter={headerFooter}
              fontFamily={headerFooter?.font_family || undefined}
              logoUrl={profile?.logo_url || undefined}
            />
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                try {
                  const { data: patientData } = await supabase
                    .from('patients')
                    .select('pharmacy_email, pharmacy_name')
                    .eq('id', patientId)
                    .maybeSingle();

                  if (!patientData?.pharmacy_email) {
                    toast({
                      title: "No Pharmacy Email",
                      description: "This patient has no pharmacy email configured. Please add one in the patient details.",
                      variant: "destructive",
                    });
                    return;
                  }

                  const content = generateContent();
                  const { error } = await supabase.functions.invoke('send-document-email', {
                    body: {
                      to: patientData.pharmacy_email,
                      subject: `Prescription for ${patientName}`,
                      documentName: `Prescription - ${patientName}`,
                      documentContent: content,
                      senderName: doctorName,
                    },
                  });
                  if (error) throw error;
                  toast({
                    title: "Prescription Sent",
                    description: `Sent to ${patientData.pharmacy_name || patientData.pharmacy_email}`,
                  });
                } catch (err: any) {
                  toast({
                    title: "Error",
                    description: err.message || "Failed to email prescription",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Send className="h-4 w-4" />
              Email to Pharmacy
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
