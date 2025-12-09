import { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  X,
  Save,
  Send,
  Loader2,
  Sparkles,
  User,
  Download,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePatients } from "@/hooks/usePatients";
import { useProfile } from "@/hooks/useProfile";
import { useDocuments } from "@/hooks/useDocuments";
import { exportToPDF, printDocument } from "@/utils/documentExport";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  placeholders: string[];
  logoUrl?: string;
  logoPosition?: { x: number; y: number };
  fontFamily?: string;
}

interface DocumentEditorProps {
  template: Template;
  onClose: () => void;
  onSave: (document: { name: string; content: string }) => void;
}

export function DocumentEditor({ template, onClose, onSave }: DocumentEditorProps) {
  const { toast } = useToast();
  const { patients } = usePatients();
  const { profile } = useProfile();
  const { createDocument } = useDocuments();
  const [documentName, setDocumentName] = useState(`${template.name} - ${new Date().toLocaleDateString()}`);
  const [content, setContent] = useState(template.content);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Auto-fill placeholders when patient or profile changes
  useEffect(() => {
    let updatedContent = template.content;
    
    // Fill in profile/doctor placeholders
    if (profile) {
      updatedContent = updatedContent
        .replace(/\[PracticeNumber\]/g, profile.practice_number || "[PracticeNumber]")
        .replace(/\[DoctorNumber\]/g, profile.doctor_number || "[DoctorNumber]")
        .replace(/\[DoctorName\]/g, profile.full_name || "[DoctorName]")
        .replace(/\[PracticeAddress\]/g, profile.practice_address || "[PracticeAddress]");
    }

    // Fill in patient placeholders if a patient is selected
    if (selectedPatientId && selectedPatientId !== "none") {
      const patient = patients.find(p => p.id === selectedPatientId);
      if (patient) {
        updatedContent = updatedContent
          .replace(/\[PatientName\]/g, patient.name || "[PatientName]")
          .replace(/\[ClientName\]/g, patient.name || "[ClientName]")
          .replace(/\[PatientAddress\]/g, patient.physical_address || patient.address || "[PatientAddress]")
          .replace(/\[PatientDOB\]/g, patient.dob ? new Date(patient.dob).toLocaleDateString() : "[PatientDOB]")
          .replace(/\[PatientContact\]/g, patient.phone || patient.email || "[PatientContact]")
          .replace(/\[MedicalAid\]/g, patient.medical_aid || "[MedicalAid]")
          .replace(/\[MedicalAidNumber\]/g, patient.medical_aid_number || "[MedicalAidNumber]");
        
        // Update document name with patient name
        setDocumentName(`${template.name} - ${patient.name} - ${new Date().toLocaleDateString()}`);
      }
    }

    // Fill in date placeholders
    const today = new Date().toLocaleDateString();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    updatedContent = updatedContent
      .replace(/\[Date\]/g, today)
      .replace(/\[SessionDate\]/g, today)
      .replace(/\[ConsultationDate\]/g, today)
      .replace(/\[ReferralDate\]/g, today)
      .replace(/\[PrescriptionDate\]/g, today)
      .replace(/\[SignatureDate\]/g, today)
      .replace(/\[ConsultationTime\]/g, now);

    setContent(updatedContent);
  }, [selectedPatientId, profile, patients, template.content]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processAudio();
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak clearly to dictate your document content",
      });
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice drafting",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async () => {
    setIsProcessing(true);
    
    // Simulate AI transcription and content generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const simulatedTranscript = "The patient has shown excellent progress. Key observations include improvement in symptoms and good response to treatment. Recommendations include continuing current medication and follow-up in 2 weeks.";
    
    setTranscript(simulatedTranscript);
    
    // Auto-populate the document content
    const updatedContent = content
      .replace("[Content]", simulatedTranscript)
      .replace("[Summary]", simulatedTranscript)
      .replace("[Details]", simulatedTranscript);
    
    setContent(updatedContent);
    setIsProcessing(false);
    
    toast({
      title: "Transcription complete",
      description: "Your voice input has been added to the document",
    });
  };

  const handleInsertTranscript = () => {
    if (transcript) {
      setContent(prev => prev + "\n\n" + transcript);
      setTranscript("");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const selectedPatient = patients.find(p => p.id === selectedPatientId);
    
    // Save to database
    const result = await createDocument({
      patient_id: selectedPatientId || undefined,
      template_id: template.id,
      name: documentName,
      content: content,
      template_name: template.name,
      patient_name: selectedPatient?.name,
    });

    setIsSaving(false);

    if (result) {
      onSave({ name: documentName, content });
    }
  };

  const handleExportPDF = async () => {
    try {
      await exportToPDF({
        title: documentName,
        content: content,
        logoUrl: template.logoUrl,
        logoPosition: template.logoPosition,
        fontFamily: template.fontFamily,
      });
      toast({
        title: "PDF Exported",
        description: `"${documentName}" has been downloaded`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    printDocument(content, documentName, template.logoUrl, template.fontFamily);
  };

  // Get remaining unfilled placeholders
  const unfilledPlaceholders = template.placeholders.filter(p => 
    content.includes(`[${p}]`)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Document Editor</h2>
            <p className="text-sm text-muted-foreground">Template: {template.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 divide-x divide-border">
          {/* Main Editor */}
          <div className="lg:col-span-2 p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label htmlFor="patient">Select Patient (for auto-fill)</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient to auto-fill placeholders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No patient selected</SelectItem>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {patient.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPatientId && (
                <p className="text-xs text-success">
                  ✓ Patient data has been auto-filled into the document
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="docName">Document Name</Label>
              <Input
                id="docName"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[350px] font-mono text-sm"
              />
            </div>
          </div>

          {/* Voice Draft Panel */}
          <div className="p-6 space-y-6 bg-muted/30 max-h-[70vh] overflow-y-auto">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                Voice Draft
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Dictate content to auto-populate your document
              </p>
            </div>

            {/* Recording Button */}
            <div className="flex flex-col items-center gap-4 py-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300",
                  isRecording
                    ? "bg-destructive text-destructive-foreground animate-pulse-soft"
                    : isProcessing
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow"
                )}
              >
                {isProcessing ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </button>
              <p className="text-xs text-muted-foreground text-center">
                {isProcessing
                  ? "Processing..."
                  : isRecording
                  ? "Recording... Tap to stop"
                  : "Tap to start voice drafting"}
              </p>
            </div>

            {/* Transcript Preview */}
            {transcript && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Transcribed Content</span>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-sm text-muted-foreground">{transcript}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleInsertTranscript}
                >
                  Insert at cursor
                </Button>
              </div>
            )}

            {/* Unfilled Placeholders */}
            {unfilledPlaceholders.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Remaining Placeholders
                </p>
                <div className="flex flex-wrap gap-2">
                  {unfilledPlaceholders.map((placeholder) => (
                    <span
                      key={placeholder}
                      className="rounded-full bg-warning/20 text-warning-foreground px-2.5 py-1 text-xs font-medium"
                    >
                      [{placeholder}]
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Fill these manually or use voice drafting
                </p>
              </div>
            )}

            {/* Auto-filled info */}
            {profile && (
              <div className="space-y-2 pt-4 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Auto-filled from Profile
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  {profile.full_name && <p>• Doctor: {profile.full_name}</p>}
                  {profile.practice_number && <p>• Practice #: {profile.practice_number}</p>}
                  {profile.doctor_number && <p>• Reg #: {profile.doctor_number}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={handleExportPDF} className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Document"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
