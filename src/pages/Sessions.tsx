import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Mic,
  Play,
  Square,
  FileText,
  Clock,
  User,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Volume2,
  Calendar,
  Pill,
  Receipt,
} from "lucide-react";
import { PrescriptionEditor } from "@/components/sessions/PrescriptionEditor";
import { InvoiceEditor } from "@/components/sessions/InvoiceEditor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { AudioWaveform } from "@/components/sessions/AudioWaveform";
import { useSessions } from "@/hooks/useSessions";
import { usePatients } from "@/hooks/usePatients";
import { Badge } from "@/components/ui/badge";

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
  const [showPrescriptionEditor, setShowPrescriptionEditor] = useState(false);
  const [showInvoiceEditor, setShowInvoiceEditor] = useState(false);
  const [prescription, setPrescription] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<{ id: string; invoice_number: string; amount: number } | null>(null);
  const [currentMedications, setCurrentMedications] = useState<{ medication: string; dosage: string; frequency: string }[]>([]);
  const pendingCompletionRef = useRef(false);
  const latestTranscriptRef = useRef<string>("");
  const currentSessionIdRef = useRef<string | null>(null);
  const notesRef = useRef<string>("");

  const navigate = useNavigate();
  const { patients } = usePatients();
  const { sessions, loading: sessionsLoading, createSession, completeSession } = useSessions();
  
  const currentPatient = patients.find(p => p.id === patientId);

  // Fetch active prescriptions when patient changes
  useEffect(() => {
    const fetchActivePrescriptions = async () => {
      if (!patientId) return;
      
      const { data, error } = await supabase
        .from('prescriptions')
        .select('medication, dosage, frequency')
        .eq('patient_id', patientId)
        .eq('status', 'active');
      
      if (!error && data) {
        setCurrentMedications(data);
      }
    };
    
    fetchActivePrescriptions();
  }, [patientId]);

  // Keep refs in sync with state
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Callback to handle session completion after transcription
  const handleSessionComplete = useCallback(async (transcriptText: string) => {
    console.log("=== handleSessionComplete START ===");
    console.log("transcriptText length:", transcriptText?.length);
    console.log("sessionId:", currentSessionIdRef.current);
    
    setSessionState("processing");
    
    const sessionId = currentSessionIdRef.current;
    const currentNotes = notesRef.current;
    const fullContent = [transcriptText, currentNotes].filter(Boolean).join('\n\n');
    
    console.log("fullContent length:", fullContent?.length);
    
    if (sessionId) {
      try {
        if (fullContent) {
          console.log("Calling completeSession with content...");
          const result = await completeSession(sessionId, fullContent, currentNotes);
          console.log("completeSession result:", result);
          if (result) {
            setSummary(result.summary || "Session completed successfully.");
            setActionPoints(result.action_points || []);
          }
        } else {
          // No content but still need to mark session as completed
          console.log("No content, marking session as completed without AI...");
          const { error } = await supabase
            .from('sessions')
            .update({ 
              status: 'completed', 
              ended_at: new Date().toISOString(),
              summary: "Session completed. No content was recorded or noted."
            })
            .eq('id', sessionId);
          
          if (error) console.error("Error updating session:", error);
          setSummary("Session completed. No content was recorded or noted.");
          setActionPoints([]);
        }
      } catch (error) {
        console.error("Error in handleSessionComplete:", error);
        // Still mark as completed even on error
        await supabase
          .from('sessions')
          .update({ status: 'completed', ended_at: new Date().toISOString() })
          .eq('id', sessionId);
      }
    } else {
      console.log("No session ID!");
      setSummary("Session completed. No content was recorded or noted.");
      setActionPoints([]);
    }
    
    setSessionState("completed");
    pendingCompletionRef.current = false;
    console.log("=== handleSessionComplete END ===");
  }, [completeSession]);

  const { 
    isRecording, 
    isTranscribing, 
    transcript, 
    audioUrl,
    startRecording, 
    stopRecording,
    clearTranscript 
  } = useAudioRecording({
    patientName: currentPatient?.name,
    doctorName: "Dr. Georgia Adams",
    onTranscriptionComplete: (text) => {
      console.log("=== onTranscriptionComplete ===");
      console.log("text length:", text?.length);
      console.log("pendingCompletionRef:", pendingCompletionRef.current);
      
      // Store transcript
      latestTranscriptRef.current = text;
      setNotes(prev => prev ? `${prev}\n\n${text}` : text);
      
      // If pending completion, trigger it now with the transcript
      if (pendingCompletionRef.current) {
        console.log("Pending completion - triggering handleSessionComplete with transcript");
        handleSessionComplete(text);
      }
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
    setPrescription(null);
    setInvoice(null);
    clearTranscript();
    
    if (patientId) {
      const session = await createSession(patientId, `Session - ${new Date().toLocaleDateString()}`);
      if (session) {
        setCurrentSessionId(session.id);
      }
    }
  };

  const handleSavePrescription = (prescriptionData: { content: string; rawTranscript: string }) => {
    setPrescription(prescriptionData.content);
    // Append prescription to notes
    setNotes(prev => prev ? `${prev}\n\n--- PRESCRIPTION ---\n${prescriptionData.content}` : `--- PRESCRIPTION ---\n${prescriptionData.content}`);
  };

  const toggleRecording = () => {
    console.log("=== toggleRecording called ===");
    console.log("isRecording:", isRecording);
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const endSession = async () => {
    console.log("=== endSession called ===");
    console.log("isRecording:", isRecording, "isTranscribing:", isTranscribing);
    
    if (isRecording || isTranscribing) {
      // Set pending flag - onTranscriptionComplete will handle completion
      console.log("Recording/transcribing in progress, setting pending flag...");
      pendingCompletionRef.current = true;
      if (isRecording) {
        stopRecording();
      }
      return;
    }
    
    // No recording/transcription in progress - complete immediately
    console.log("No recording in progress, completing immediately");
    const fullContent = latestTranscriptRef.current || transcript || notes;
    await handleSessionComplete(fullContent || '');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Back Link */}
      <div className="flex items-center gap-4">
        {currentPatient && (
          <Link
            to={`/patients/${patientId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {currentPatient.name}
          </Link>
        )}
      </div>

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
        <div className="space-y-6">
          {/* Top Row: Recording Panel + Actions Panel */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recording Panel */}
            <div className="rounded-xl border border-primary bg-card p-6 shadow-sm">
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
                <div className="flex items-center gap-4">
                  {/* Main Record Button */}
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
                      <Square className="h-10 w-10" />
                    ) : (
                      <Mic className="h-10 w-10" />
                    )}
                  </button>
                </div>
                
                <p className="text-sm text-muted-foreground text-center">
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

              {/* Audio Playback */}
              {audioUrl && !isRecording && (
                <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Recording Playback</p>
                  </div>
                  <audio controls className="w-full" src={audioUrl}>
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button variant="outline" className="flex-1" onClick={endSession} disabled={isTranscribing}>
                  <Square className="h-4 w-4 mr-2" />
                  End Session
                </Button>
              </div>
            </div>

            {/* Actions Panel - Prescription & Invoice */}
            <div className="space-y-4">
              {/* Prescription Card */}
              <div className="rounded-xl border border-primary bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                      <Pill className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Prescription</h3>
                      <p className="text-sm text-muted-foreground">
                        {prescription ? "Prescription recorded" : "Voice-record a prescription"}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant={prescription ? "secondary" : "default"}
                    className="gap-2" 
                    onClick={() => setShowPrescriptionEditor(true)}
                  >
                    <Pill className="h-4 w-4" />
                    {prescription ? "View/Edit" : "Record"}
                  </Button>
                </div>
                
                {prescription && (
                  <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-medium text-green-600">Prescription Saved</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Invoice Card */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                      <Receipt className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Invoice</h3>
                      <p className="text-sm text-muted-foreground">
                        {invoice ? `Invoice ${invoice.invoice_number}` : "Generate an invoice for this session"}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant={invoice ? "secondary" : "default"}
                    className="gap-2" 
                    onClick={() => setShowInvoiceEditor(true)}
                    disabled={!patientId}
                  >
                    <Receipt className="h-4 w-4" />
                    {invoice ? "View" : "Generate"}
                  </Button>
                </div>
                
                {invoice && (
                  <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-medium text-green-600">Invoice Created</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">R {invoice.amount.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes Panel - Below */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Session Notes</h3>
            </div>
            <Textarea
              placeholder="Type your notes here during the session. Voice transcriptions will be appended automatically..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[200px] resize-none"
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
                Summary and action points have been generated, saved to patient history, and added to your to-do list
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
              {/* Audio Playback in completed state */}
              {audioUrl && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Listen to recording:</p>
                  <audio controls className="w-full h-10" src={audioUrl}>
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}
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
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Added to To-Do List
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setSessionState("idle")}>
              Start New Session
            </Button>
            <Button variant="outline" asChild>
              <Link to="/todos">View To-Do List</Link>
            </Button>
            {currentPatient && (
              <Button variant="outline" asChild>
                <Link to={`/patients/${patientId}`}>View Patient Profile</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* All Sessions List */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">All Sessions</h2>
          </div>
          <Badge variant="secondary">{sessions.length} sessions</Badge>
        </div>
        
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No sessions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => navigate(`/sessions/${session.id}`)}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{session.title || 'Untitled Session'}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.patient?.name || 'Unknown Patient'} • {format(new Date(session.started_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {session.duration_minutes && (
                    <span className="text-sm text-muted-foreground">
                      {session.duration_minutes} min
                    </span>
                  )}
                  <Badge variant={session.status === 'completed' ? 'default' : session.status === 'in_progress' ? 'secondary' : 'outline'}>
                    {session.status === 'completed' ? 'Completed' : session.status === 'in_progress' ? 'In Progress' : 'Cancelled'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Prescription Editor Modal */}
      {showPrescriptionEditor && currentPatient && patientId && (
        <PrescriptionEditor
          patientName={currentPatient.name}
          patientId={patientId}
          doctorName="Dr. Georgia Adams"
          allergies={currentPatient.allergies}
          currentMedications={currentMedications}
          onClose={() => setShowPrescriptionEditor(false)}
          onSave={handleSavePrescription}
        />
      )}

      {/* Invoice Editor Modal */}
      {showInvoiceEditor && currentPatient && patientId && (
        <InvoiceEditor
          patientId={patientId}
          patientName={currentPatient.name}
          sessionId={currentSessionId || undefined}
          onClose={() => setShowInvoiceEditor(false)}
          onSave={setInvoice}
        />
      )}
    </div>
  );
}
