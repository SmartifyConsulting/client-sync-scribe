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
  Users,
  ChevronsUpDown,
  Check,
  Search,
  Brain,
  ShieldAlert,
  PenTool,
  FileText as FileTextIcon,
} from "lucide-react";
import { PrescriptionEditor } from "@/components/sessions/PrescriptionEditor";
import { InvoiceEditor } from "@/components/sessions/InvoiceEditor";
import { VisitCategoryDialog } from "@/components/sessions/VisitCategoryDialog";
import { SessionNotepad } from "@/components/sessions/SessionNotepad";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { AudioWaveform } from "@/components/sessions/AudioWaveform";
import { useSessions } from "@/hooks/useSessions";
import { usePatients } from "@/hooks/usePatients";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type SessionState = "idle" | "active" | "processing" | "completed";

export default function Sessions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPatientId = searchParams.get("patient");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(urlPatientId);
  
  // Use URL param if provided, otherwise use selected patient
  const patientId = urlPatientId || selectedPatientId;
  
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
  const [patientSelectorOpen, setPatientSelectorOpen] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<string | null>(null);
  const [isGeneratingDiagnosis, setIsGeneratingDiagnosis] = useState(false);
  const [pastPatientSessions, setPastPatientSessions] = useState<any[]>([]);
  const [showVisitCategoryDialog, setShowVisitCategoryDialog] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState<string>("");
  const pendingCompletionRef = useRef(false);
  const latestTranscriptRef = useRef<string>("");
  const currentSessionIdRef = useRef<string | null>(null);
  const notesRef = useRef<string>("");

  const navigate = useNavigate();
  const { patients, loading: patientsLoading } = usePatients();
  const { sessions, loading: sessionsLoading, createSession, completeSession } = useSessions();
  
  const currentPatient = patients.find(p => p.id === patientId);

  // Handle patient selection
  const handlePatientSelect = (value: string) => {
    setSelectedPatientId(value);
    setSearchParams({ patient: value });
  };

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

  // Fetch past sessions for patient (for AI clinician context)
  useEffect(() => {
    const fetchPastSessions = async () => {
      if (!patientId) return;
      
      const { data, error } = await supabase
        .from('sessions')
        .select('id, summary, started_at, status')
        .eq('patient_id', patientId)
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setPastPatientSessions(data.map(s => ({
          date: format(new Date(s.started_at), 'MMM d, yyyy'),
          summary: s.summary
        })));
      }
    };
    
    fetchPastSessions();
  }, [patientId]);

  // Generate AI Clinician Diagnosis
  const generateAIDiagnosis = async () => {
    if (!currentPatient || !summary) return;
    
    setIsGeneratingDiagnosis(true);
    setAiDiagnosis(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-clinician-diagnosis', {
        body: {
          sessionSummary: summary,
          sessionTranscript: transcript,
          patientName: currentPatient.name,
          patientAge: currentPatient.dob ? calculateAge(currentPatient.dob) : null,
          allergies: currentPatient.allergies,
          currentMedications: currentMedications,
          pastSessions: pastPatientSessions,
          conditions: currentPatient.notes // Using notes field for conditions
        }
      });
      
      if (error) throw error;
      
      if (data?.recommendation) {
        setAiDiagnosis(data.recommendation);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating AI diagnosis:', error);
      setAiDiagnosis('Failed to generate diagnostic recommendation. Please try again.');
    } finally {
      setIsGeneratingDiagnosis(false);
    }
  };

  // Helper to calculate age from DOB
  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Keep refs in sync with state
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Callback to handle session completion after transcription
  const handleSessionComplete = useCallback(async (transcriptText: string, visitCategory?: string | null) => {
    console.log("=== handleSessionComplete START ===");
    console.log("transcriptText length:", transcriptText?.length);
    console.log("visitCategory:", visitCategory);
    
    setSessionState("processing");
    
    const currentNotes = notesRef.current;
    const fullContent = [transcriptText, currentNotes].filter(Boolean).join('\n\n');
    
    console.log("fullContent length:", fullContent?.length);
    
    try {
      // Create session and complete it in one flow (no in_progress state persisted)
      const result = await completeSession(
        null, // no existing session ID
        fullContent || '',
        currentNotes,
        visitCategory || undefined,
        {
          patient_id: patientId!,
          title: `Session - ${new Date().toLocaleDateString()}`,
          started_at: sessionStartTimeRef.current?.toISOString() || new Date().toISOString(),
        }
      );
      
      if (result) {
        setCurrentSessionId(result.id);
        setSummary(result.summary || "Session completed successfully.");
        setActionPoints(result.action_points || []);
      } else {
        setSummary("Session completed. No content was recorded or noted.");
        setActionPoints([]);
      }
    } catch (error) {
      console.error("Error in handleSessionComplete:", error);
      setSummary("Session completed. No content was recorded or noted.");
      setActionPoints([]);
    }
    
    setSessionState("completed");
    pendingCompletionRef.current = false;
    console.log("=== handleSessionComplete END ===");
  }, [completeSession, patientId]);

  // Handle visit category selection
  const handleVisitCategoryConfirm = async (category: string | null) => {
    setShowVisitCategoryDialog(false);
    await handleSessionComplete(pendingTranscript, category);
    setPendingTranscript("");
  };

  const { 
    isRecording, 
    isTranscribing, 
    isSavingAudio,
    transcript, 
    audioUrl,
    savedAudioUrl,
    startRecording, 
    stopRecording,
    clearTranscript 
  } = useAudioRecording({
    patientName: currentPatient?.name,
    doctorName: "Dr. Georgia Adams",
    sessionId: currentSessionId || undefined,
    onTranscriptionComplete: (text) => {
      console.log("=== onTranscriptionComplete ===");
      console.log("text length:", text?.length);
      console.log("pendingCompletionRef:", pendingCompletionRef.current);
      
      // Store transcript
      latestTranscriptRef.current = text;
      setNotes(prev => prev ? `${prev}\n\n${text}` : text);
      
      // If pending completion, show visit category dialog
      if (pendingCompletionRef.current) {
        console.log("Pending completion - showing visit category dialog");
        setPendingTranscript(text);
        setShowVisitCategoryDialog(true);
        pendingCompletionRef.current = false;
      }
    },
    onAudioSaved: async (audioStorageUrl) => {
      console.log("Audio saved to storage:", audioStorageUrl);
      // Update session with audio URL
      if (currentSessionIdRef.current) {
        const { error } = await supabase
          .from('sessions')
          .update({ audio_url: audioStorageUrl })
          .eq('id', currentSessionIdRef.current);
        
        if (error) {
          console.error("Error saving audio URL to session:", error);
        } else {
          console.log("Audio URL saved to session successfully");
        }
      }
    }
  });

  // Session timer - only counts when recording
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Track session start time locally - no DB insert until completion
  const sessionStartTimeRef = useRef<Date | null>(null);

  const startSession = async () => {
    setSessionState("active");
    setNotes("");
    setSummary("");
    setActionPoints([]);
    setSessionDuration(0);
    setPrescription(null);
    setInvoice(null);
    setAiDiagnosis(null);
    setCurrentSessionId(null);
    clearTranscript();
    sessionStartTimeRef.current = new Date();
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
      // Set pending flag - onTranscriptionComplete will show dialog
      console.log("Recording/transcribing in progress, setting pending flag...");
      pendingCompletionRef.current = true;
      if (isRecording) {
        stopRecording();
      }
      return;
    }
    
    // No recording/transcription in progress - show visit category dialog
    console.log("No recording in progress, showing visit category dialog");
    const fullContent = latestTranscriptRef.current || transcript || notes;
    setPendingTranscript(fullContent || '');
    setShowVisitCategoryDialog(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Visit Category Dialog */}
      <VisitCategoryDialog
        open={showVisitCategoryDialog}
        onOpenChange={setShowVisitCategoryDialog}
        onConfirm={handleVisitCategoryConfirm}
        patientName={currentPatient?.name}
      />
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
            {currentPatient ? (
              <Play className="h-8 w-8 text-accent-foreground" />
            ) : (
              <Users className="h-8 w-8 text-accent-foreground" />
            )}
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {currentPatient ? "Ready to Start" : "Select a Patient"}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {currentPatient 
              ? "Begin a new consultation session to capture notes, record audio, and generate AI-powered summaries and action points."
              : "Choose a patient to start a new consultation session."}
          </p>
          
          {/* Patient Selector with Search */}
          {!currentPatient && (
            <div className="w-full max-w-xs mb-6">
              <Popover open={patientSelectorOpen} onOpenChange={setPatientSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={patientSelectorOpen}
                    className="w-full justify-between bg-background"
                  >
                    {selectedPatientId 
                      ? patients.find(p => p.id === selectedPatientId)?.name 
                      : "Search patients..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 bg-popover z-50" align="center">
                  <Command>
                    <CommandInput placeholder="Search by name..." />
                    <CommandList>
                      <CommandEmpty>
                        {patientsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          "No patients found."
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {patients.map((patient) => (
                          <CommandItem
                            key={patient.id}
                            value={patient.name}
                            onSelect={() => {
                              handlePatientSelect(patient.id);
                              setPatientSelectorOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedPatientId === patient.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <User className="mr-2 h-4 w-4 text-muted-foreground" />
                            {patient.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
          
          {currentPatient && (
            <div className="mb-4 space-y-2">
              <p className="text-sm text-primary">
                Session for: <span className="font-medium">{currentPatient.name}</span>
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSelectedPatientId(null);
                  setSearchParams({});
                }}
                className="text-xs text-muted-foreground"
              >
                Change patient
              </Button>
            </div>
          )}
          
          <Button 
            onClick={startSession} 
            size="lg" 
            className="gap-2"
            disabled={!currentPatient}
          >
            <Play className="h-5 w-5" />
            Start New Session
          </Button>
        </div>
      )}

      {sessionState === "active" && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
          {/* Compact Recording Panel - Sidebar */}
          <div className="rounded-xl border border-primary bg-card shadow-sm flex flex-col">
            {/* Patient Info */}
            <div className="flex items-center gap-3 p-4 border-b">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent shrink-0">
                <User className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">
                  {currentPatient?.name || "Current Session"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span className="font-mono">{formatDuration(sessionDuration)}</span>
                </div>
              </div>
            </div>

            {/* Recording Controls - Compact */}
            <div className="flex flex-col items-center gap-3 p-4">
              <button
                onClick={toggleRecording}
                disabled={isTranscribing}
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300",
                  isTranscribing && "opacity-50 cursor-not-allowed",
                  isRecording
                    ? "bg-destructive text-destructive-foreground animate-pulse-soft shadow-lg"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow"
                )}
              >
                {isTranscribing ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : isRecording ? (
                  <Square className="h-7 w-7" />
                ) : (
                  <Mic className="h-7 w-7" />
                )}
              </button>
              
              <p className="text-xs text-muted-foreground text-center">
                {isTranscribing 
                  ? "Transcribing..." 
                  : isRecording 
                    ? "Recording... Tap to stop" 
                    : "Tap to record"}
              </p>
              
              {/* Compact Waveform */}
              {(isRecording || isTranscribing) && (
                <div className="w-full">
                  <AudioWaveform isRecording={isRecording} />
                </div>
              )}
            </div>

            {/* Live Transcript Preview - Collapsible */}
            {(transcript || isTranscribing) && (
              <div className="border-t p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-medium text-primary">Transcript</p>
                  </div>
                  {transcript && !isTranscribing && (
                    <span className="text-xs bg-success/15 text-success px-1.5 py-0.5 rounded">✓</span>
                  )}
                  {isTranscribing && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="max-h-[120px] overflow-y-auto bg-muted/30 rounded p-2">
                  {transcript ? (
                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{transcript}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Transcribing...</p>
                  )}
                </div>
              </div>
            )}

            {/* Audio Playback */}
            {audioUrl && !isRecording && (
              <div className="border-t p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground">Playback</p>
                </div>
                <audio controls className="w-full h-8" src={audioUrl}>
                  Your browser does not support audio.
                </audio>
              </div>
            )}

            {/* End Session Button */}
            <div className="p-3 border-t mt-auto">
              <Button 
                variant="outline" 
                className="w-full gap-2" 
                onClick={endSession} 
                disabled={isTranscribing}
              >
                <Square className="h-4 w-4" />
                End Session
              </Button>
            </div>
          </div>

          {/* Notes/Drawing Panel - Main Content */}
          <div className="min-h-[500px]">
            <SessionNotepad
              patientId={patientId || ""}
              sessionId={currentSessionId}
              patientName={currentPatient?.name}
              notes={notes}
              onNotesChange={setNotes}
              isRecording={isRecording}
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

          {/* Post-Session Actions: Prescription & Invoice */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Prescription Card */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                    <Pill className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Prescription</h3>
                    <p className="text-sm text-muted-foreground">
                      {prescription ? "Prescription recorded" : "Create a prescription for this session"}
                    </p>
                  </div>
                </div>
                <Button 
                  variant={prescription ? "secondary" : "default"}
                  className="gap-2" 
                  onClick={() => setShowPrescriptionEditor(true)}
                >
                  <Pill className="h-4 w-4" />
                  {prescription ? "View/Edit" : "Create"}
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

          {/* AI Clinician Decision Support */}
          <div className="rounded-xl border border-primary/30 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">AI Clinician</h3>
                  <p className="text-sm text-muted-foreground">
                    Get AI-powered diagnostic recommendations based on patient history
                  </p>
                </div>
              </div>
              <Button 
                variant={aiDiagnosis ? "secondary" : "default"}
                className="gap-2" 
                onClick={generateAIDiagnosis}
                disabled={isGeneratingDiagnosis || !summary}
              >
                {isGeneratingDiagnosis ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    {aiDiagnosis ? "Regenerate" : "Generate Analysis"}
                  </>
                )}
              </Button>
            </div>

            {/* Disclaimer Banner */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
              <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>For Clinical Decision Support Only:</strong> This AI analysis is confidential and intended to assist physician judgment. 
                It is not a diagnosis and should not be shared with patients. Always apply clinical expertise.
              </p>
            </div>

            {aiDiagnosis && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border max-h-[400px] overflow-y-auto">
                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                  {aiDiagnosis}
                </pre>
              </div>
            )}
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
          <Badge variant="secondary">{sessions.filter(s => s.status !== 'in_progress').length} sessions</Badge>
        </div>
        
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.filter(s => s.status !== 'in_progress').length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No sessions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {sessions.filter(s => s.status !== 'in_progress').map((session) => (
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
