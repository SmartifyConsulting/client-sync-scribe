import { useState, useCallback, useEffect } from "react";
import { X, FileText, Mic, Square, Loader2, Save, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { AudioWaveform } from "./AudioWaveform";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";

interface ReferralLetterEditorProps {
  patientId: string;
  patientName: string;
  sessionId?: string;
  onClose: () => void;
  onSave: (letter: { content: string }) => void;
}

const REFERRAL_TEMPLATE = `REFERRAL LETTER

Date: [DATE]
Patient: [PATIENT_NAME]
Referring Doctor: [DOCTOR_NAME]

─────────────────────────────────────

Dear Colleague,

I am referring the above-named patient for your expert opinion and management.

Referred To: [REFERRED_TO]

[REFERRAL_CONTENT]

─────────────────────────────────────

Thank you for seeing this patient.

Yours sincerely,

Signature: ___________________
           [DOCTOR_NAME]
`;

export function ReferralLetterEditor({ 
  patientId,
  patientName,
  sessionId,
  onClose, 
  onSave 
}: ReferralLetterEditorProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const doctorName = profile?.full_name || "Doctor";
  
  const [content, setContent] = useState("");
  const [rawTranscript, setRawTranscript] = useState("");
  const [referredTo, setReferredTo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize content when doctor name is available
  useEffect(() => {
    setContent(
      REFERRAL_TEMPLATE
        .replace(/\[DATE\]/g, new Date().toLocaleDateString())
        .replace(/\[PATIENT_NAME\]/g, patientName)
        .replace(/\[DOCTOR_NAME\]/g, doctorName)
        .replace("[REFERRED_TO]", "")
        .replace("[REFERRAL_CONTENT]", "")
    );
  }, [patientName, doctorName]);

  const handleTranscriptionComplete = useCallback((text: string) => {
    setRawTranscript(text);
    setContent(prev => {
      return REFERRAL_TEMPLATE
        .replace(/\[DATE\]/g, new Date().toLocaleDateString())
        .replace(/\[PATIENT_NAME\]/g, patientName)
        .replace(/\[DOCTOR_NAME\]/g, doctorName)
        .replace("[REFERRED_TO]", referredTo)
        .replace("[REFERRAL_CONTENT]", text);
    });
    toast({
      title: "Transcription Complete",
      description: "Referral letter has been populated from voice recording",
    });
  }, [patientName, doctorName, referredTo, toast]);

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

  const handleReferredToChange = (value: string) => {
    setReferredTo(value);
    setContent(prev => {
      const lines = prev.split('\n');
      const updatedLines = lines.map(line => {
        if (line.startsWith('Referred To:')) {
          return `Referred To: ${value}`;
        }
        return line;
      });
      return updatedLines.join('\n');
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('documents')
        .insert({
          name: `Referral Letter - ${patientName} - ${new Date().toLocaleDateString()}`,
          content: content,
          patient_id: patientId,
          patient_name: patientName,
          template_name: 'Referral Letter',
          user_id: user.id,
        });

      if (error) throw error;

      onSave({ content });
      toast({
        title: "Referral Letter Saved",
        description: "The referral letter has been saved",
      });
      onClose();
    } catch (error: any) {
      console.error("Error saving referral letter:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save referral letter",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Referral Letter - ${patientName}</title>
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
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Referral Letter</h2>
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
              <Label htmlFor="referred-to">Referred To (Specialist/Hospital)</Label>
              <Input
                id="referred-to"
                value={referredTo}
                onChange={(e) => handleReferredToChange(e.target.value)}
                placeholder="e.g., Dr. Smith (Cardiologist) / City Hospital"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referral-content">Referral Letter Content</Label>
              <Textarea
                id="referral-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
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
                Dictate the referral details
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
                  ? "Transcribing..."
                  : isRecording
                  ? "Recording... Tap to stop"
                  : "Tap to dictate"}
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
                <li>• State clinical history</li>
                <li>• Mention current diagnosis</li>
                <li>• Include reason for referral</li>
                <li>• Add relevant test results</li>
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
            <Button onClick={handleSave} className="gap-2" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Referral
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}