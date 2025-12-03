import { useState, useRef } from "react";
import {
  Mic,
  MicOff,
  X,
  Save,
  Send,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  placeholders: string[];
}

interface DocumentEditorProps {
  template: Template;
  onClose: () => void;
  onSave: (document: { name: string; content: string }) => void;
}

export function DocumentEditor({ template, onClose, onSave }: DocumentEditorProps) {
  const { toast } = useToast();
  const [documentName, setDocumentName] = useState(`${template.name} - ${new Date().toLocaleDateString()}`);
  const [content, setContent] = useState(template.content);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
    // In production, this would call an edge function with Whisper/Gemini
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const simulatedTranscript = "The client has shown excellent progress in Q4. Key achievements include a 15% increase in revenue and successful expansion into two new markets. Recommendations for Q1 include focusing on customer retention and exploring partnership opportunities.";
    
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

  const handleSave = () => {
    onSave({ name: documentName, content });
    toast({
      title: "Document saved",
      description: "Your document has been saved to the client's history",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
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
                className="min-h-[400px] font-mono text-sm"
              />
            </div>
          </div>

          {/* Voice Draft Panel */}
          <div className="p-6 space-y-6 bg-muted/30">
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
            <div className="flex flex-col items-center gap-4 py-6">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300",
                  isRecording
                    ? "bg-destructive text-destructive-foreground animate-pulse-soft"
                    : isProcessing
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow"
                )}
              >
                {isProcessing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>
              <p className="text-sm text-muted-foreground text-center">
                {isProcessing
                  ? "Processing your voice input..."
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

            {/* Placeholders */}
            {template.placeholders.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Available Placeholders
                </p>
                <div className="flex flex-wrap gap-2">
                  {template.placeholders.map((placeholder) => (
                    <span
                      key={placeholder}
                      className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
                    >
                      [{placeholder}]
                    </span>
                  ))}
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
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            <Button className="gap-2">
              <Send className="h-4 w-4" />
              Send to Client
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
