import { useState, useCallback } from "react";
import {
  Mic,
  Square,
  X,
  Save,
  Printer,
  Loader2,
  FileText,
  Pill,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { AudioWaveform } from "./AudioWaveform";

interface PrescriptionEditorProps {
  patientName: string;
  doctorName?: string;
  onClose: () => void;
  onSave: (prescription: { content: string; rawTranscript: string }) => void;
}

const PRESCRIPTION_TEMPLATE = `PRESCRIPTION

Date: [DATE]
Patient: [PATIENT_NAME]
Doctor: [DOCTOR_NAME]

─────────────────────────────────────

MEDICATIONS:

[PRESCRIPTION_CONTENT]

─────────────────────────────────────

Instructions: Take medications as prescribed above.
Follow-up: As directed by physician.

Signature: ___________________
           [DOCTOR_NAME]
`;

export function PrescriptionEditor({ 
  patientName, 
  doctorName = "Dr. Georgia Adams",
  onClose, 
  onSave 
}: PrescriptionEditorProps) {
  const { toast } = useToast();
  const [content, setContent] = useState(() => {
    return PRESCRIPTION_TEMPLATE
      .replace("[DATE]", new Date().toLocaleDateString())
      .replace(/\[PATIENT_NAME\]/g, patientName)
      .replace(/\[DOCTOR_NAME\]/g, doctorName)
      .replace("[PRESCRIPTION_CONTENT]", "");
  });
  const [rawTranscript, setRawTranscript] = useState("");

  const handleTranscriptionComplete = useCallback((text: string) => {
    setRawTranscript(text);
    // Update content with transcribed prescription
    setContent(prev => {
      const templateBase = PRESCRIPTION_TEMPLATE
        .replace("[DATE]", new Date().toLocaleDateString())
        .replace(/\[PATIENT_NAME\]/g, patientName)
        .replace(/\[DOCTOR_NAME\]/g, doctorName)
        .replace("[PRESCRIPTION_CONTENT]", text);
      return templateBase;
    });
    toast({
      title: "Transcription Complete",
      description: "Prescription has been populated from voice recording",
    });
  }, [patientName, doctorName, toast]);

  const { 
    isRecording, 
    isTranscribing, 
    transcript,
    startRecording, 
    stopRecording,
  } = useAudioRecording({
    patientName,
    doctorName,
    onTranscriptionComplete: handleTranscriptionComplete,
  });

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSave = () => {
    onSave({ content, rawTranscript: rawTranscript || transcript || "" });
    toast({
      title: "Prescription Saved",
      description: "The prescription has been saved to the session",
    });
    onClose();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Prescription - ${patientName}</title>
            <style>
              body { font-family: monospace; padding: 40px; white-space: pre-wrap; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
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

        <div className="grid lg:grid-cols-3 divide-x divide-border">
          {/* Main Editor */}
          <div className="lg:col-span-2 p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="prescription-content">Prescription Content</Label>
              <Textarea
                id="prescription-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />
            </div>
          </div>

          {/* Voice Recording Panel */}
          <div className="p-6 space-y-6 bg-muted/30">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                Voice Dictation
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Dictate the prescription to auto-populate
              </p>
            </div>

            {/* Recording Button */}
            <div className="flex flex-col items-center gap-4 py-6">
              <button
                onClick={toggleRecording}
                disabled={isTranscribing}
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300",
                  isTranscribing && "opacity-50 cursor-not-allowed",
                  isRecording
                    ? "bg-destructive text-destructive-foreground animate-pulse-soft"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow"
                )}
              >
                {isTranscribing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : isRecording ? (
                  <Square className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>
              <p className="text-sm text-muted-foreground text-center">
                {isTranscribing
                  ? "Transcribing prescription..."
                  : isRecording
                  ? "Recording... Tap to stop"
                  : "Tap to dictate prescription"}
              </p>
            </div>

            {/* Audio Waveform */}
            {(isRecording || isTranscribing) && (
              <div className="w-full">
                <AudioWaveform isRecording={isRecording} className="h-16" />
                {isTranscribing && (
                  <p className="text-xs text-center text-muted-foreground mt-2">Processing audio...</p>
                )}
              </div>
            )}

            {/* Transcript Preview */}
            {(transcript || rawTranscript) && !isRecording && !isTranscribing && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Transcribed Content</span>
                </div>
                <div className="rounded-lg border border-border bg-card p-3 max-h-32 overflow-y-auto">
                  <p className="text-sm text-muted-foreground">{rawTranscript || transcript}</p>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="space-y-2 pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Dictation Tips
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Speak medication name clearly</li>
                <li>• Include dosage and frequency</li>
                <li>• Mention duration of treatment</li>
                <li>• Add special instructions</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleSave} className="gap-2" disabled={!content.includes("MEDICATIONS:")}>
              <Save className="h-4 w-4" />
              Save Prescription
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
