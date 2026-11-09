import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getSignedAudioUrl } from "@/utils/audioUrl";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval, parseISO } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Mic,
  Play,
  Pause,
  Square,
  FileText,
  Clock,
  User,
  Sparkles,
  Info,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Volume2,
  VolumeX,
  Calendar,
  Wallet as Pill,
  Receipt,
  Users,
  ChevronsUpDown,
  Check,
  Search,
  Brain,
  ShieldAlert,
  PenTool,
  FileText as FileTextIcon,
  Download,
  Lock,
  Send,
  Save,
  CalendarCheck,
} from "lucide-react";
import { GeneralLetterEditor } from "@/components/sessions/GeneralLetterEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WealthClientOverview } from "@/features/sessions/components/WealthClientOverview";
import { SessionProcessingDialog } from "@/features/sessions/components/SessionProcessingDialog";
import { SessionTranscriptAccordion } from "@/features/sessions/components/SessionTranscriptAccordion";
import {
  savePausedSession,
  fetchPausedSession,
  deletePausedSession,
  type PausedSessionSnapshot,
} from "@/features/sessions/utils/pausedSession";


import { PostSessionStepDialog, type PostSessionStepType } from "@/features/sessions/components/PostSessionStepDialog";
import { SessionResultPanels } from "@/features/sessions/components/SessionResultPanels";
import { renderAdvisoryHighlights } from "@/features/sessions/lib/advisoryHighlights";
import { Toggle } from "@/components/ui/toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { AudioWaveform } from "@/components/sessions/AudioWaveform";
import { useSessions } from "@/hooks/useSessions";
import { useClients } from "@/hooks/useClients";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlClientId = searchParams.get("client");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(urlClientId);
  const [advisorName, setDoctorName] = useState<string>("Advisor");
  
  // Use URL param if provided, otherwise use selected client
  const clientId = urlClientId || selectedClientId;

  // Fetch logged-in advisor's name and language preference
  useEffect(() => {
    const fetchDoctorProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, preferred_language')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.full_name) {
          setDoctorName(profile.full_name);
        }
        if (profile?.preferred_language) {
          setDoctorLanguage(profile.preferred_language);
        }
      }
    };
    fetchDoctorProfile();
  }, []);
  
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState("");
  const [actionPoints, setActionPoints] = useState<string[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [patientSelectorOpen, setPatientSelectorOpen] = useState(false);
  const [doctorLanguage, setDoctorLanguage] = useState<string>("English");
  const [pastPatientSessions, setPastPatientSessions] = useState<any[]>([]);
  const savedAudioUrlRef = useRef<string | null>(null);
  const [pendingTranscript, setPendingTranscript] = useState<string>("");
  const pendingCompletionRef = useRef(false);
  // Guarantees the post-session chain (documents → follow-up → Vula) runs exactly once
  // per session, no matter how many paths (voice cue, transcription, manual stop) fire.
  const completionRanRef = useRef(false);
  const latestTranscriptRef = useRef<string>("");
  const currentSessionIdRef = useRef<string | null>(null);
  const [isPreparingSession, setIsPreparingSession] = useState(false);
  const [preparingMessage, setPreparingMessage] = useState("");
  const [personalNotes, setPersonalNotes] = useState("");
  const [showAboutRecordingDialog, setShowAboutRecordingDialog] = useState(false);
  const micPreWarmedRef = useRef(false);
  const [showGeneralLetterEditor, setShowGeneralLetterEditor] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const notesRef = useRef<string>("");
  const personalNotesRef = useRef<string>("");
  const personalNotesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const personalNotesHasLoaded = useRef(false);
  const sessionStartTimeRef = useRef<Date | null>(null);

  // Resumable sessions: a paused consultation is persisted as a `paused` session
  // row so it survives reloads and can be resumed later.
  const [pausedDraft, setPausedDraft] = useState<PausedSessionSnapshot | null>(null);
  const [isSavingPause, setIsSavingPause] = useState(false);
  const resumedTranscriptRef = useRef<string>("");
  const pausedSessionIdRef = useRef<string | null>(null);

  const [extractedFollowUp, setExtractedFollowUp] = useState<{ follow_up_date?: string; follow_up_time?: string; notes?: string } | null>(null);
  // Sequential post-session flow: one step (document / schedule) at a time.
  const [postSessionQueue, setPostSessionQueue] = useState<PostSessionStepType[]>([]);
  const [postSessionIndex, setPostSessionIndex] = useState(0);
  const [showPostSessionFlow, setShowPostSessionFlow] = useState(false);
  const doctorIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { doctorIdRef.current = data.user?.id || null; });
  }, []);

  const navigate = useNavigate();
  const { clients, loading: clientsLoading } = useClients();
  const { sessions, loading: sessionsLoading, createSession, completeSession } = useSessions();
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [playingSessionId, setPlayingSessionId] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionDateFrom, setSessionDateFrom] = useState("");
  const [sessionDateTo, setSessionDateTo] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const currentPatient = clients.find(p => p.id === clientId);
  // Arriving from a client profile's "Start Session" link — suppress the
  // client-selector idle screen entirely while the session auto-starts.
  const [autoStartTimedOut, setAutoStartTimedOut] = useState(false);
  const isAutoStarting = searchParams.get("autoStart") === "true" && !autoStartTimedOut;

  // Safety net — if the client never resolves (stale link, load failure), don't
  // trap the advisor on "Starting session..." forever; fall back to manual selection.
  useEffect(() => {
    if (searchParams.get("autoStart") !== "true") return;
    const timer = setTimeout(() => {
      if (!currentPatient) setAutoStartTimedOut(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, [searchParams, currentPatient]);

  // Handle client selection
  const handlePatientSelect = (value: string) => {
    setSelectedClientId(value);
    setSearchParams({ client: value });
  };

  // Pre-warm the mic permission as soon as a client is selected (idle screen), so the
  // browser has already granted access by the time the advisor clicks "Start Session" —
  // the permission prompt is usually what makes that click feel slow.
  useEffect(() => {
    if (!currentPatient || sessionState !== "idle" || micPreWarmedRef.current) return;
    micPreWarmedRef.current = true;
    navigator.mediaDevices?.getUserMedia?.({ audio: true })
      .then((stream) => stream.getTracks().forEach((t) => t.stop()))
      .catch(() => { micPreWarmedRef.current = false; });
  }, [currentPatient, sessionState]);

  // Fetch past sessions for client (for AI consultation context)
  useEffect(() => {
    const fetchPastSessions = async () => {
      if (!clientId) return;
      
      const { data, error } = await supabase
        .from('sessions')
        .select('id, summary, started_at, status')
        .eq('patient_id', clientId)
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setPastPatientSessions(data.map(s => ({
          id: s.id,
          date: format(new Date(s.started_at), 'MMM d, yyyy'),
          summary: s.summary
        })));
      }
    };
    
    fetchPastSessions();
  }, [clientId]);

  // Keep refs in sync with state
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Personal Notes autosave — persisted as a draft (per-client) so a refresh
  // mid-session never loses what the advisor typed, with a reassuring toast.
  // The draft is folded into sessions.private_notes once the session
  // completes (see handleSessionComplete's completeSession call) and cleared.
  useEffect(() => {
    personalNotesRef.current = personalNotes;
    if (!personalNotesHasLoaded.current || !clientId) return;
    if (personalNotesSaveTimer.current) clearTimeout(personalNotesSaveTimer.current);
    personalNotesSaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(`session-personal-notes-draft:${clientId}`, personalNotes);
        toast({ title: "Notes saved", description: "Your personal notes are saved for this consultation." });
      } catch {
        toast({ title: "Error", description: "Failed to save personal notes", variant: "destructive" });
      }
    }, 1200);
    return () => {
      if (personalNotesSaveTimer.current) clearTimeout(personalNotesSaveTimer.current);
    };
  }, [personalNotes, clientId]);

  // Advance to the next step in the sequential post-session queue, closing the
  // flow once every step (documents → schedule) has run.
  const advancePostSession = useCallback(() => {
    setPostSessionIndex((prev) => {
      const next = prev + 1;
      if (next >= postSessionQueue.length) {
        setShowPostSessionFlow(false);
        return prev;
      }
      return next;
    });
  }, [postSessionQueue.length]);

  // Runs the sequential post-session queue: AI summary, then schedule a follow-up.
  const startPostSessionFlow = useCallback(() => {
    setPostSessionQueue(["summary", "schedule"]);
    setPostSessionIndex(0);
    setShowPostSessionFlow(true);
  }, []);



  // Callback to handle session completion after transcription
  const handleSessionComplete = useCallback(async (transcriptText: string) => {
    if (completionRanRef.current) {
      console.log("handleSessionComplete skipped — already ran for this session");
      return;
    }
    completionRanRef.current = true;
    console.log("=== handleSessionComplete START ===");
    setSessionState("processing");
    
    const currentNotes = notesRef.current;
    // A resumed consultation carries the transcript captured before the pause.
    const fullTranscript = [resumedTranscriptRef.current, transcriptText || ""]
      .filter((part) => part && part.trim())
      .join("\n\n");

    try {
      const result = await completeSession(
        null,
        fullTranscript,
        currentNotes,
        {
          patient_id: clientId!,
          title: `Session - ${new Date().toLocaleDateString()}`,
          started_at: sessionStartTimeRef.current?.toISOString() || new Date().toISOString(),
          audio_url: savedAudioUrlRef.current || undefined,
        },
        personalNotesRef.current,
      );

      if (result) {
        setCurrentSessionId(result.id);
        currentSessionIdRef.current = result.id;
        // The paused draft has now been folded into the finished session.
        if (pausedSessionIdRef.current) {
          await deletePausedSession(pausedSessionIdRef.current);
          pausedSessionIdRef.current = null;
          resumedTranscriptRef.current = "";
        }
        if (clientId) {
          try { localStorage.removeItem(`session-personal-notes-draft:${clientId}`); } catch { /* best effort */ }
        }
        setSummary(result.summary || "");
        setActionPoints(result.action_points || []);

        const docs = (result as any)._extractedDocuments;
        if (docs?.follow_up_appointment?.follow_up_date) {
          setExtractedFollowUp(docs.follow_up_appointment);
        }

        startPostSessionFlow();
      } else {
        setSummary("No content was recorded or noted.");
        setActionPoints([]);
      }
    } catch (error: any) {
      console.error("Error in handleSessionComplete:", error);
      setSummary("");
      setActionPoints([]);
      toast({
        title: "Analysis didn't complete",
        description: "The AI analysis failed or timed out, so no summary or action points were produced. Your recording and notes are saved — tap the mic to retry.",
        variant: "destructive",
      });
    }

    setSessionState("completed");
    pendingCompletionRef.current = false;
  }, [completeSession, clientId, startPostSessionFlow]);

  const { 
    isRecording, 
    isPaused,
    isTranscribing, 
    isSavingAudio,
    transcript,
    liveTranscript,
    liveTranscribeError,

    liveMessages,
    isSpeaking,
    audioUrl,
    savedAudioUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearTranscript 
  } = useAudioRecording({
    clientName: currentPatient?.name,
    advisorName: advisorName,
    sessionId: currentSessionId || undefined,
    onEndSessionDetected: () => {
      console.log("End session detected via Web Speech API");
      if (!pendingCompletionRef.current) {
        toast({ title: "🎤 Consultation ending detected", description: "Ending consultation automatically from voice cue." });
        pendingCompletionRef.current = true;
        setPendingTranscript(latestTranscriptRef.current);
        setTimeout(() => { if (isRecording) stopRecording(); }, 100);
        // Documents-first flow: kick off completion now; follow-up + Vula chained after docs.
        setTimeout(() => {
          handleSessionComplete(latestTranscriptRef.current);
          pendingCompletionRef.current = false;
        }, 2000);
      }
    },
    onTranscriptionComplete: (text) => {
      latestTranscriptRef.current = text;
      // The transcript lives in the Session Transcript accordion only — AI Clinician Notes keeps
      // the accumulated live clinical guidance, never a copy of the transcript.

      
      // Whisper fallback: check transcript for end session phrases
      const endPhrases = ['end session', 'end of session', 'end the session', 'conclude the session', 'session ended'];
      if (!pendingCompletionRef.current && isRecording && endPhrases.some(phrase => text.toLowerCase().includes(phrase))) {
        pendingCompletionRef.current = true;
        stopRecording();
        toast({ title: "Consultation Ending", description: "End consultation detected in transcript" });
      }
      
      // If pending completion (from voice detection), trigger session-complete (documents first)
      if (pendingCompletionRef.current) {
        setPendingTranscript(text);
        handleSessionComplete(text);
        pendingCompletionRef.current = false;
      }
    },
    onAudioSaved: async (audioStorageUrl) => {
      console.log("Audio saved to storage:", audioStorageUrl);
      // Store audio URL locally - will be included when session is created on completion
      savedAudioUrlRef.current = audioStorageUrl;
    }
  });

  // Never carry notes across consultations: switching client or starting a
  // new session clears the notes body.
  useEffect(() => {
    setNotes("");
  }, [clientId]);

  // Recording has actually started — drop the "preparing" state so the UI stops guessing.
  useEffect(() => {
    if (isRecording) {
      setIsPreparingSession(false);
      setPreparingMessage("");
    }
  }, [isRecording]);

  // Session timer - only counts when recording
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-start when arriving from a client profile ("Start Session")
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (searchParams.get("autoStart") !== "true") return;
    if (autoStartedRef.current) return;
    if (!clientId || !currentPatient) return;
    autoStartedRef.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete("autoStart");
    setSearchParams(next, { replace: true });
    startSession();
  }, [searchParams, clientId, currentPatient]);

  const startSession = async (resume?: PausedSessionSnapshot) => {
    // Guard against double-invocation (e.g. a stray duplicate click/effect)
    // firing the About Recording prompt twice.
    if (sessionState === "active" || showAboutRecordingDialog) return;
    setSessionState("active");
    setNotes(resume?.notes || "");
    setSummary("");
    setActionPoints([]);
    setSessionDuration(resume?.elapsedSeconds ?? 0);
    setCurrentSessionId(resume?.id || crypto.randomUUID());
    // Everything captured before the pause is replayed into the finished session.
    resumedTranscriptRef.current = resume?.transcript || "";
    pausedSessionIdRef.current = resume?.id || null;
    setPausedDraft(null);
    personalNotesHasLoaded.current = false;
    try {
      const draft = clientId ? localStorage.getItem(`session-personal-notes-draft:${clientId}`) : null;
      setPersonalNotes(resume?.privateNotes || draft || "");
    } catch {
      setPersonalNotes(resume?.privateNotes || "");
    }
    personalNotesHasLoaded.current = true;
    clearTranscript();
    sessionStartTimeRef.current = resume?.startedAt ? new Date(resume.startedAt) : new Date();
    savedAudioUrlRef.current = null;
    completionRanRef.current = false;

    // Give immediate feedback — the mic permission / setup gap is otherwise silent.
    setIsPreparingSession(true);
    setPreparingMessage(resume ? "Resuming your session..." : "Setting up your session...");
    setTimeout(() => setPreparingMessage("Requesting microphone access..."), 400);
    // Safety net — if mic access fails/is denied, don't leave the UI stuck "preparing".
    setTimeout(() => setIsPreparingSession(false), 8000);

    // Recording only actually starts once the advisor has acknowledged the
    // About the Session Recording notice and answered the AI Consult prompt.
    setShowAboutRecordingDialog(true);
  };

  // Look for a paused consultation for this client whenever the page is idle.
  useEffect(() => {
    if (!clientId || sessionState !== "idle") {
      if (sessionState !== "idle") setPausedDraft(null);
      return;
    }
    let cancelled = false;
    fetchPausedSession(clientId).then((draft) => {
      if (!cancelled) setPausedDraft(draft);
    });
    return () => { cancelled = true; };
  }, [clientId, sessionState]);

  /** Pause → persist a resumable draft. Resume → carry on recording. */
  const handlePauseToggle = async () => {
    if (isPaused) {
      resumeRecording();
      return;
    }
    pauseRecording();
    if (!clientId || !currentSessionId) return;
    setIsSavingPause(true);
    const liveText = latestTranscriptRef.current || liveTranscript || transcript || "";
    const combined = [resumedTranscriptRef.current, liveText].filter(Boolean).join("\n\n");
    const saved = await savePausedSession({
      sessionId: currentSessionId,
      clientId,
      transcript: combined,
      notes: notesRef.current || notes || "",
      privateNotes: personalNotesRef.current || personalNotes || "",
      elapsedSeconds: sessionDuration,
      startedAt: sessionStartTimeRef.current?.toISOString() || new Date().toISOString(),
    });
    if (saved) pausedSessionIdRef.current = currentSessionId;
    setIsSavingPause(false);
    toast({
      title: saved ? "Session paused and saved" : "Session paused",
      description: saved
        ? "You can safely leave this page and resume this consultation later."
        : "The pause could not be saved to your records — keep this page open.",
      variant: saved ? undefined : "destructive",
    });
  };

  const discardPausedDraft = async () => {
    if (!pausedDraft) return;
    await deletePausedSession(pausedDraft.id);
    setPausedDraft(null);
    toast({ title: "Paused consultation discarded" });
  };

  /**
   * Close off a consultation that was paused and never ended: no new recording,
   * just fold the saved transcript/notes into the normal completion pipeline.
   */
  const stopPausedDraft = async () => {
    const draft = pausedDraft;
    if (!draft) return;
    setPausedDraft(null);
    setCurrentSessionId(draft.id);
    pausedSessionIdRef.current = draft.id;
    resumedTranscriptRef.current = draft.transcript || "";
    setNotes(draft.notes || "");
    notesRef.current = draft.notes || "";
    setPersonalNotes(draft.privateNotes || "");
    personalNotesRef.current = draft.privateNotes || "";
    personalNotesHasLoaded.current = true;
    setSessionDuration(draft.elapsedSeconds || 0);
    sessionStartTimeRef.current = draft.startedAt ? new Date(draft.startedAt) : new Date();
    savedAudioUrlRef.current = null;
    completionRanRef.current = false;
    await handleSessionComplete("");
  };

  const handleAboutRecordingAck = () => {
    setShowAboutRecordingDialog(false);
    // No auto-record: the Wealth Manager taps the microphone when ready.
    setIsPreparingSession(false);
    setPreparingMessage("");
  };

  const toggleRecording = () => {
    console.log("=== toggleRecording called ===");
    console.log("isRecording:", isRecording);
    if (isRecording) {
      // Manual Stop must trigger the full completion pipeline:
      // transcription → summarize-session → auto-create documents → (Vula awarded last).
      // Flag pending completion BEFORE stopping so onTranscriptionComplete runs handleSessionComplete.
      pendingCompletionRef.current = true;
      setPendingTranscript(latestTranscriptRef.current || transcript || "");
      stopRecording();
    } else {
      startRecording();
    }
  };

  const endSession = async () => {
    if (isRecording || isTranscribing) {
      pendingCompletionRef.current = true;
      if (isRecording) stopRecording();
      return;
    }
    // No recording in progress — go straight to documents-first flow
    const fullContent = latestTranscriptRef.current || transcript || notes;
    setPendingTranscript(fullContent || '');
    handleSessionComplete(fullContent || '');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Session start prompt — dismissible only via the button shown, never Escape/outside-click. */}
      <Dialog open={showAboutRecordingDialog} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-sm p-4"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-sm font-semibold">
              <Info className="h-4 w-4 text-success shrink-0" />
              Session Recordings
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              This session recording is only shared between you and your client. It's
              automatically deleted from our servers within 7 days — download it beforehand
              if either of you wants to keep a copy.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button size="sm" onClick={handleAboutRecordingAck}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sequential post-session flow — one step at a time: AI summary, then
          schedule follow-up. */}
      {showPostSessionFlow && postSessionQueue.length > 0 && (
        <PostSessionStepDialog
          queue={postSessionQueue}
          index={postSessionIndex}
          onAdvance={advancePostSession}
          onFinish={() => setShowPostSessionFlow(false)}
          currentPatient={currentPatient ? { id: currentPatient.id, name: currentPatient.name, patient_user_id: (currentPatient as any).patient_user_id || null } : null}
          advisorId={doctorIdRef.current}
          advisorName={advisorName}
          extractedFollowUp={extractedFollowUp}
          clientName={currentPatient?.name}
          summary={summary}
          actionPoints={actionPoints}
        />
      )}


      {/* Header with Back Link */}
      <div className="flex items-center gap-4">
        {currentPatient && (
          <Link
            to={`/clients/${clientId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {currentPatient.name}
          </Link>
        )}
      </div>

      <div>
        <h1 className="page-title">{t("sessions.sessionMode")}</h1>
        <p className="mt-1 text-muted-foreground text-xs">
          Record, transcribe and summarise client consultations.
        </p>
      </div>

      {/* Session States */}
      {sessionState === "idle" && isAutoStarting && (
        // Arriving from a client's profile "Start Session" link — never show the
        // client-selector widget, it's confusing when a client is already chosen.
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent mb-3">
            <Loader2 className="h-6 w-6 text-accent-foreground animate-spin" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Starting consultation...</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            {currentPatient?.name ? `Getting ready to record for ${currentPatient.name}.` : "Loading client details..."}
          </p>
        </div>
      )}

      {sessionState === "idle" && !isAutoStarting && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent mb-3">
            {currentPatient ? (
              <Play className="h-6 w-6 text-accent-foreground" />
            ) : (
              <Users className="h-6 w-6 text-accent-foreground" />
            )}
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {currentPatient ? "Ready to Start" : "Select a Client"}
          </h2>
          <p className="text-muted-foreground mb-4 max-w-md text-sm">
            {currentPatient
              ? "Begin a consultation to capture notes, record audio, and generate AI summaries."
              : "Choose a client to start a new consultation."}
          </p>

          {/* Client Selector with Search */}
          {!currentPatient && (
            <div className="w-full max-w-xs mb-4">
              <Popover open={patientSelectorOpen} onOpenChange={setPatientSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={patientSelectorOpen}
                    className="w-full justify-between bg-background"
                  >
                    {selectedClientId 
                      ? clients.find(p => p.id === selectedClientId)?.name 
                      : "Search clients..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] min-w-[16rem] p-0 bg-popover z-50 rounded-xl border border-border shadow-lg overflow-hidden"
                  align="center"
                >
                  <Command className="bg-transparent">
                    <CommandInput
                      placeholder="Search clients by name..."
                      className="h-11 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <CommandList className="max-h-[280px]">
                      <CommandEmpty>
                        {clientsLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 py-6 px-4 text-center">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No clients found</p>
                            <p className="text-xs text-muted-foreground">Try a different name or add a client first.</p>
                          </div>
                        )}
                      </CommandEmpty>
                      <CommandGroup className="p-1.5">
                        {[...clients].sort((a, b) => {
                          const surnameA = a.name.trim().split(/\s+/).pop()?.toLowerCase() || '';
                          const surnameB = b.name.trim().split(/\s+/).pop()?.toLowerCase() || '';
                          return surnameA.localeCompare(surnameB);
                        }).map((client) => {
                          const parts = client.name.trim().split(/\s+/);
                          const displayName = parts.length > 1
                            ? `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`
                            : client.name;
                          const initials = parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
                          return (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            className="flex h-11 items-center gap-2.5 rounded-lg px-2 text-sm cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                            onSelect={() => {
                              handlePatientSelect(client.id);
                              setPatientSelectorOpen(false);
                            }}
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-2xs font-semibold text-muted-foreground">
                              {initials || "?"}
                            </span>
                            <span className="flex-1 truncate text-left">{displayName}</span>
                            <Check
                              className={cn(
                                "h-4 w-4 shrink-0 text-primary",
                                selectedClientId === client.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                          );
                        })}
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
                  setSelectedClientId(null);
                  setSearchParams({});
                }}
                className="text-xs text-muted-foreground"
              >
                Change client
              </Button>
            </div>
          )}
          
          {/* Resume a consultation that was paused earlier (persisted draft). */}
          {pausedDraft && currentPatient && (
            <div className="w-full max-w-md rounded-lg border-2 border-warning bg-warning/10 px-3 py-2.5 text-left space-y-1.5">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Pause className="h-3.5 w-3.5" />
                Paused session with {currentPatient.name}
              </p>
              <p className="text-2xs text-muted-foreground">
                Paused {format(new Date(pausedDraft.pausedAt), "d MMM yyyy, HH:mm")} ·{" "}
                {formatDuration(pausedDraft.elapsedSeconds)} recorded
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" className="h-7 gap-1.5 px-2.5 text-xs" onClick={() => startSession(pausedDraft)}>
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 px-2.5 text-xs"
                  onClick={stopPausedDraft}
                >
                  <Square className="h-3.5 w-3.5" />
                  Stop &amp; finish
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs" onClick={discardPausedDraft}>
                  Discard
                </Button>
              </div>
            </div>
          )}

          <Button 
            onClick={() => startSession()} 
            size="lg" 
            className="mt-4 gap-2"
            disabled={!currentPatient}
          >
            <Play className="h-5 w-5" />
            Start New Session
          </Button>


          {/* Past Sessions — quick recap of this client's previous consultations. */}
          {currentPatient && (
            <div className="mt-6 w-full max-w-[54.6rem] text-left rounded-xl border border-primary bg-card shadow-sm overflow-hidden">
              <div className="px-3 py-2 border-b bg-primary/5">
                <h3 className="text-sm font-semibold text-foreground">Past Consultations</h3>
              </div>
              <div className="space-y-2 p-2">
                {pastPatientSessions.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">No previous consultations</p>
                ) : (
                  pastPatientSessions.map((s: any) => (
                    <div key={s.id} className="rounded-xl border border-border p-3 hover:bg-muted/50 transition-colors">
                      <button
                        onClick={() => navigate(`/sessions/${s.id}`)}
                        className="text-xs font-bold text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        {s.date}
                      </button>
                      <p className="text-sm text-foreground leading-relaxed">
                        {renderAdvisoryHighlights(String(s.summary || "No summary"))}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}


      {(sessionState === "active" || sessionState === "processing" || sessionState === "completed") && (
        <>
        {/* Centred progress box — replaces the old status strip and toasts. */}
        <SessionProcessingDialog open={sessionState === "processing" || isTranscribing} />

        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4 items-start">
          {/* Record Session — column 1, row 1 */}
          <div className="rounded-xl border border-primary bg-card shadow-sm flex flex-col order-1 self-start lg:col-start-1 lg:row-start-1">

            {/* Client Info */}
            <div className="flex items-center gap-3 p-4 border-b">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent shrink-0">
                <User className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">
                  {currentPatient?.name || "Current Session"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono">{formatDuration(sessionDuration)}</span>
                </div>
              </div>
            </div>

            {/* Recording Controls - Compact */}
            <div className="flex flex-col items-center gap-3 p-4">
              <div className="flex flex-wrap items-center justify-center gap-3">

                <button
                  onClick={toggleRecording}
                  disabled={isTranscribing || isPreparingSession}
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300",
                    (isTranscribing || isPreparingSession) && "opacity-50 cursor-not-allowed",
                    isRecording
                      ? "bg-destructive text-destructive-foreground animate-pulse-soft shadow-lg"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow"
                  )}
                >
                  {isTranscribing || isPreparingSession ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : isRecording ? (
                    <Square className="h-7 w-7" />
                  ) : (
                    <Mic className="h-7 w-7" />
                  )}
                </button>

                {/* Pause / Resume button — only while recording */}
                {isRecording && !isTranscribing && (
                  <button
                    onClick={handlePauseToggle}
                    disabled={isSavingPause}
                    aria-label={isPaused ? "Resume recording" : "Pause recording"}
                    className={cn(
                      "flex h-12 items-center justify-center gap-2 rounded-full px-4 transition-all duration-300 border-2 text-sm font-medium",
                      isPaused
                        ? "bg-warning text-warning-foreground border-warning"
                        : "bg-card text-foreground border-border hover:bg-muted"
                    )}
                    title={isPaused ? "Resume recording" : "Pause recording"}
                  >
                    {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                    <span className="hidden sm:inline whitespace-nowrap">{isPaused ? "Resume" : "Pause"}</span>
                  </button>
                )}
              </div>


              <p className="text-xs text-muted-foreground text-center">
                {isPreparingSession
                  ? preparingMessage || "Setting up your session..."
                  : isTranscribing
                    ? "Transcribing..."
                    : isRecording
                      ? (isSavingPause
                          ? "Saving paused session..."
                          : isPaused
                            ? "Paused and saved — tap play to resume, or come back later"
                            : "Recording... Tap to stop")
                      : "Tap to record"}
              </p>
              <p className="text-xs text-muted-foreground/60 text-center mt-1 px-2 leading-snug">
                🔒 Only shared between you and the client — auto-deleted from our servers within 7 days. Download it beforehand to keep a copy.
              </p>

              {/* Compact Waveform */}
              {(isRecording || isTranscribing) && (
                <div className="w-full">
                  <AudioWaveform isRecording={isRecording && !isPaused} />
                </div>
              )}
            </div>


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

          </div>

          {/* Client Overview — wide band spanning the workspace beside the recorder. */}
          <div className="flex flex-col gap-4 order-2 min-w-0 lg:col-start-2 lg:row-start-1">
            {/* Client Overview — AI recap of the last 6 months. */}
            <div className="min-h-[210px] flex flex-col">
              <WealthClientOverview client={currentPatient} />
            </div>

            {/* Transcript document — full width beneath Client Overview, shown once
                transcription has finished. Nothing streams while recording. */}
            <SessionTranscriptAccordion transcript={transcript} advisorName={advisorName} />

          </div>


        </div>

        <div className="mt-4">
            <Tabs defaultValue="personal">
              <TabsList className="mb-2 bg-neutral-600">
                <TabsTrigger value="personal" className="gap-1.5 tab-brand whitespace-nowrap text-xs px-1.5 py-1 sm:px-3 sm:py-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  Personal Notes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="mt-0">
                <div className="rounded-xl border border-primary bg-card shadow-sm p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold text-foreground">Personal Notes</p>
                    <span className="text-2xs text-muted-foreground">Private</span>
                  </div>
                  <Textarea
                    value={personalNotes}
                    onChange={(e) => setPersonalNotes(e.target.value)}
                    placeholder="Jot down private thoughts for yourself..."
                    className="min-h-[220px] resize-y text-sm p-2"
                  />
                </div>
              </TabsContent>

            </Tabs>
        </div>
        </>
      )}

      {sessionState === "completed" && (
        <div className="space-y-6 mt-6">


          {/* Shared results layout — identical to opening a past session */}
          <SessionResultPanels
            summary={summary}
            audioUrl={audioUrl}
            actionPoints={actionPoints}
            sessionId={currentSessionId}
            advisorName={advisorName}
            clientName={currentPatient?.name}
          />

          {/* Post-Session Actions: Create Documents */}
          <div className="rounded-xl border border-primary bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-3">Create Document</h3>
            <div className="flex items-center gap-3">
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general_letter">General Letter</SelectItem>
                </SelectContent>
              </Select>
              <Button
                disabled={!selectedDocType || !clientId}
                onClick={() => {
                  if (selectedDocType === 'general_letter') setShowGeneralLetterEditor(true);
                }}
              >
                <FileText className="h-4 w-4 mr-1" />
                Create
              </Button>
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
                <Link to={`/clients/${clientId}`}>View Client Profile</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* General Letter Editor Modal */}
      {showGeneralLetterEditor && currentPatient && clientId && (
        <GeneralLetterEditor
          clientName={currentPatient.name}
          clientId={clientId}
          sessionId={currentSessionId || undefined}
          onClose={() => setShowGeneralLetterEditor(false)}
          onSave={() => setShowGeneralLetterEditor(false)}
        />
      )}
    </div>
  );
}
