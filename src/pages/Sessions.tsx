import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Mic,
  MicOff,
  Play,
  Square,
  FileText,
  Clock,
  User,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { AudioWaveform } from "@/components/sessions/AudioWaveform";
import { useSessions } from "@/hooks/useSessions";
import { usePatients } from "@/hooks/usePatients";

type SessionState = "idle" | "active" | "processing" | "completed";

export default function Sessions() {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient");
  
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState("");
  const [actionPoints, setActionPoints] = useState<string[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const { patients } = usePatients();
  const { createSession, completeSession } = useSessions();
  
  const currentPatient = patients.find(p => p.id === patientId);

  const { 
    isRecording, 
    isTranscribing, 
    transcript, 
    startRecording, 
    stopRecording,
    clearTranscript 
  } = useAudioRecording({
    onTranscriptionComplete: (text) => {
      // Append transcription to notes
      setNotes(prev => prev ? `${prev}\n\n${text}` : text);
    }
  });

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionState === "active") {
      interval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionState]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = async () => {
    setSessionState("active");
    setNotes("");
    setSummary("");
    setActionPoints([]);
    setSessionDuration(0);
    clearTranscript();
    
    if (patientId) {
      const session = await createSession(patientId, `Session - ${new Date().toLocaleDateString()}`);
      if (session) {
        setCurrentSessionId(session.id);
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const endSession = async () => {
    if (isRecording) {
      stopRecording();
    }
    
    setSessionState("processing");
    
    // Combine transcript and notes for AI processing
    const fullContent = [transcript, notes].filter(Boolean).join('\n\n');
    
    if (currentSessionId && fullContent) {
      const result = await completeSession(currentSessionId, fullContent, notes);
      if (result) {
        setSummary(result.summary || "Session completed successfully.");
        setActionPoints(result.action_points || []);
      }
    } else {
      // Fallback if no content
      setSummary("Session completed. No content was recorded or noted.");
      setActionPoints([]);
    }
    
    setSessionState("completed");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Session Mode</h1>
        <p className="mt-1 text-muted-foreground">
          Record, transcribe, and generate AI summaries for patient sessions
        </p>
      </div>

      {/* Session States */}
      {sessionState === "idle" && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent mb-4">
            <Play className="h-8 w-8 text-accent-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Ready to Start
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Begin a new consultation session to capture notes, record audio, and
            generate AI-powered summaries and action points.
          </p>
          {currentPatient && (
            <p className="text-sm text-primary mb-4">
              Session for: <span className="font-medium">{currentPatient.name}</span>
            </p>
          )}
          <Button onClick={startSession} size="lg" className="gap-2">
            <Play className="h-5 w-5" />
            Start New Session
          </Button>
        </div>
      )}

      {sessionState === "active" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recording Panel */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <User className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {currentPatient?.name || "Current Session"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentPatient ? "Recording session" : "Select a patient"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-mono text-foreground">
                  {formatDuration(sessionDuration)}
                </span>
              </div>
            </div>

            {/* Recording Controls */}
            <div className="flex flex-col items-center gap-4 py-8">
              <button
                onClick={toggleRecording}
                disabled={isTranscribing}
                className={cn(
                  "flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300",
                  isTranscribing && "opacity-50 cursor-not-allowed",
                  isRecording
                    ? "bg-destructive text-destructive-foreground animate-pulse-soft shadow-lg"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow"
                )}
              >
                {isTranscribing ? (
                  <Loader2 className="h-10 w-10 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="h-10 w-10" />
                ) : (
                  <Mic className="h-10 w-10" />
                )}
              </button>
              <p className="text-sm text-muted-foreground">
                {isTranscribing 
                  ? "Transcribing audio..." 
                  : isRecording 
                    ? "Recording... Tap to stop and transcribe" 
                    : "Tap to start recording"}
              </p>
              
              {/* Audio Waveform Visualizer */}
              {(isRecording || isTranscribing) && (
                <div className="w-full max-w-xs mt-4">
                  <AudioWaveform isRecording={isRecording} />
                  {isTranscribing && (
                    <p className="text-xs text-center text-muted-foreground mt-2">Processing audio...</p>
                  )}
                </div>
              )}
            </div>

            {/* Live Transcript Preview */}
            {(transcript || isTranscribing) && (
              <div className="mt-4 p-4 rounded-lg bg-primary/5 border-2 border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-primary">Voice Transcription</p>
                  </div>
                  {transcript && !isTranscribing && (
                    <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                      ✓ Transcribed
                    </span>
                  )}
                  {isTranscribing && (
                    <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing...
                    </span>
                  )}
                </div>
                <div className="max-h-[200px] overflow-y-auto bg-background/50 rounded p-3">
                  {transcript ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{transcript}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Transcribing audio...</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={endSession} disabled={isTranscribing}>
                <Square className="h-4 w-4 mr-2" />
                End Session
              </Button>
            </div>
          </div>

          {/* Notes Panel */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Session Notes</h3>
            </div>
            <Textarea
              placeholder="Type your notes here during the session. Voice transcriptions will be appended automatically..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[300px] resize-none"
            />
          </div>
        </div>
      )}

      {sessionState === "processing" && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Processing Session
          </h2>
          <p className="text-muted-foreground max-w-md">
            AI is analyzing your session notes and generating a summary with action points...
          </p>
        </div>
      )}

      {sessionState === "completed" && (
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="flex items-center gap-4 rounded-xl border border-success/30 bg-success/5 p-4">
            <CheckCircle className="h-6 w-6 text-success" />
            <div>
              <p className="font-medium text-foreground">Session Completed Successfully</p>
              <p className="text-sm text-muted-foreground">
                Summary and action points have been generated and saved to patient history
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Transcription */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Mic className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Transcription</h3>
              </div>
              <div className="max-h-[250px] overflow-y-auto">
                {transcript ? (
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{transcript}</p>
                ) : (
                  <p className="text-muted-foreground italic">No transcription recorded.</p>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">AI Summary</h3>
              </div>
              <div className="max-h-[250px] overflow-y-auto">
                <p className="text-muted-foreground leading-relaxed">{summary}</p>
              </div>
            </div>

            {/* Action Points */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-5 w-5 text-warning" />
                <h3 className="font-semibold text-foreground">Action Points</h3>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {actionPoints.length > 0 ? (
                  <ul className="space-y-3">
                    {actionPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {index + 1}
                        </span>
                        <span className="text-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No action points generated.</p>
                )}
              </div>
              {actionPoints.length > 0 && (
                <Button className="w-full mt-4 gap-2" size="sm">
                  Add to Calendar
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setSessionState("idle")}>
              Start New Session
            </Button>
            <Button variant="outline">Generate Document</Button>
            <Button variant="outline">Email Summary</Button>
          </div>
        </div>
      )}
    </div>
  );
}
