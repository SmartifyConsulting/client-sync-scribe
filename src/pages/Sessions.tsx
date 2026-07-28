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
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Volume2,
  VolumeX,
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
  Download,
} from "lucide-react";
import { PrescriptionEditor } from "@/components/sessions/PrescriptionEditor";
import { InvoiceEditor } from "@/components/sessions/InvoiceEditor";
import { VisitCategoryDialog } from "@/components/sessions/VisitCategoryDialog";
import { FollowUpAppointmentDialog } from "@/features/sessions/components/FollowUpAppointmentDialog";
import { MedicalCertificateEditor } from "@/components/sessions/MedicalCertificateEditor";
import { ReferralLetterEditor } from "@/components/sessions/ReferralLetterEditor";
import { GeneralLetterEditor } from "@/components/sessions/GeneralLetterEditor";
import { HospitalAdmissionEditor } from "@/components/sessions/HospitalAdmissionEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SessionNotepad } from "@/components/sessions/SessionNotepad";
import { SessionDiagnosticsModal } from "@/components/sessions/SessionDiagnosticsModal";
import { DocumentDeliveryProgress, type DocumentDeliveryTarget } from "@/components/sessions/DocumentDeliveryProgress";

import { DrawingPad } from "@/components/drawings/DrawingPad";
import {
  MedCertReviewDialog,
  PrescriptionReviewDialog,
  InvoiceReviewDialog,
  ReferralReviewDialog,
} from "@/components/sessions/TranscriptionReviewDialogs";
import type { MedCertData, PrescriptionData, InvoiceData, ReferralData } from "@/components/sessions/TranscriptionReviewDialogs";
import { Toggle } from "@/components/ui/toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useLiveDiagnosticHint } from "@/hooks/useLiveDiagnosticHint";
import { AudioWaveform } from "@/components/sessions/AudioWaveform";
import { useSessions } from "@/hooks/useSessions";
import { usePatients } from "@/hooks/usePatients";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPatientId = searchParams.get("patient");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(urlPatientId);
  const [doctorName, setDoctorName] = useState<string>("Doctor");
  
  // Use URL param if provided, otherwise use selected patient
  const patientId = urlPatientId || selectedPatientId;

  // Fetch logged-in doctor's name and language preference
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
  const [showPrescriptionEditor, setShowPrescriptionEditor] = useState(false);
  const [showInvoiceEditor, setShowInvoiceEditor] = useState(false);
  const [prescription, setPrescription] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<{ id: string; invoice_number: string; amount: number } | null>(null);
  const [currentMedications, setCurrentMedications] = useState<{ medication: string; dosage: string; frequency: string }[]>([]);
  const [patientSelectorOpen, setPatientSelectorOpen] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<string | null>(null);
  const [isGeneratingDiagnosis, setIsGeneratingDiagnosis] = useState(false);
  const [translatedDiagnosis, setTranslatedDiagnosis] = useState<string | null>(null);
  const [isTranslatingDiagnosis, setIsTranslatingDiagnosis] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const narrationAudioRef = useRef<HTMLAudioElement | null>(null);
  const [doctorLanguage, setDoctorLanguage] = useState<string>("English");
  const [pastPatientSessions, setPastPatientSessions] = useState<any[]>([]);
  const savedAudioUrlRef = useRef<string | null>(null);
  const [showVisitCategoryDialog, setShowVisitCategoryDialog] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState<string>("");
  const pendingCompletionRef = useRef(false);
  // Guarantees the post-session chain (documents → follow-up → Vula) runs exactly once
  // per session, no matter how many paths (voice cue, transcription, manual stop) fire.
  const completionRanRef = useRef(false);
  const latestTranscriptRef = useRef<string>("");
  const currentSessionIdRef = useRef<string | null>(null);
  const [showMedicalCertificateEditor, setShowMedicalCertificateEditor] = useState(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [findingsNote, setFindingsNote] = useState("");
  const [showReferralLetterEditor, setShowReferralLetterEditor] = useState(false);
  const [showGeneralLetterEditor, setShowGeneralLetterEditor] = useState(false);
  const [showHospitalAdmissionEditor, setShowHospitalAdmissionEditor] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const notesRef = useRef<string>("");
  const sessionStartTimeRef = useRef<Date | null>(null);

  // Per-document generate → send progress state
  const [delivery, setDelivery] = useState<DocumentDeliveryTarget | null>(null);
  const deliveryNextRef = useRef<(() => void) | null>(null);


  // AI-extracted document review state
  const [showMedCertReview, setShowMedCertReview] = useState(false);
  const [showPrescriptionReview, setShowPrescriptionReview] = useState(false);
  const [showInvoiceReview, setShowInvoiceReview] = useState(false);
  const [showReferralReview, setShowReferralReview] = useState(false);
  const [extractedMedCert, setExtractedMedCert] = useState<MedCertData | null>(null);
  const [extractedPrescription, setExtractedPrescription] = useState<PrescriptionData | null>(null);
  const [extractedInvoice, setExtractedInvoice] = useState<InvoiceData | null>(null);
  const [extractedReferral, setExtractedReferral] = useState<ReferralData | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [extractedFollowUp, setExtractedFollowUp] = useState<{ follow_up_date?: string; follow_up_time?: string; notes?: string } | null>(null);
  const doctorIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { doctorIdRef.current = data.user?.id || null; });
  }, []);

  const navigate = useNavigate();
  const { patients, loading: patientsLoading } = usePatients();
  const { sessions, loading: sessionsLoading, createSession, completeSession } = useSessions();
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [playingSessionId, setPlayingSessionId] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionDateFrom, setSessionDateFrom] = useState("");
  const [sessionDateTo, setSessionDateTo] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const currentPatient = patients.find(p => p.id === patientId);

  // Handle patient selection
  const handlePatientSelect = (value: string) => {
    setSelectedPatientId(value);
    setSearchParams({ patient: value });
  };

  // Fetch active prescriptions when patient changes — refreshable on med updates
  const fetchActivePrescriptions = useCallback(async () => {
    if (!patientId) return;
    const { data, error } = await supabase
      .from('prescriptions')
      .select('medication, dosage, frequency')
      .eq('patient_id', patientId)
      .eq('status', 'active');
    if (!error && data) {
      setCurrentMedications(data);
    }
  }, [patientId]);

  useEffect(() => {
    fetchActivePrescriptions();
  }, [fetchActivePrescriptions]);

  // Listen for cross-component medication updates
  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    import("@/lib/utils").then(({ medicationSyncBus }) => {
      if (cancelled) return;
      const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail as { patientId?: string } | undefined;
        if (!detail?.patientId || detail.patientId === patientId) fetchActivePrescriptions();
      };
      medicationSyncBus.addEventListener("medications-updated", handler);
      unsubscribe = () => medicationSyncBus.removeEventListener("medications-updated", handler);
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [patientId, fetchActivePrescriptions]);

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
  const generateAIDiagnosis = async (override?: { summary?: string; transcript?: string }) => {
    const summaryText = override?.summary ?? summary;
    const transcriptText = override?.transcript ?? transcript;
    if (!currentPatient || !summaryText) return;

    setIsGeneratingDiagnosis(true);
    setAiDiagnosis(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-clinician-diagnosis', {
        body: {
          sessionSummary: summaryText,
          sessionTranscript: transcriptText,

          patientName: currentPatient.name,
          patientAge: currentPatient.dob ? calculateAge(currentPatient.dob) : null,
          allergies: currentPatient.allergies,
          currentMedications: currentMedications,
          pastSessions: pastPatientSessions,
          conditions: currentPatient.notes,
          language: doctorLanguage
        }
      });
      
      if (error) throw error;
      
      if (data?.recommendation) {
        setAiDiagnosis(data.recommendation);
        setTranslatedDiagnosis(null);
        setShowTranslated(false);
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

  // Manual AI Clinician consult — can be triggered at any point during a session.
  const handleAiConsult = async () => {
    const consultText =
      latestTranscriptRef.current || transcript || liveTranscript || notes || "";
    if (!consultText.trim()) {
      toast({
        title: "Nothing to analyse yet",
        description: "Record or type some session content first.",
      });
      return;
    }
    setShowDiagnosticsModal(true);
    await generateAIDiagnosis({ summary: summary || consultText, transcript: consultText });
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

  // Helper: chain to next post-session step (after all doc dialogs are processed)
  const advanceToFollowUp = useCallback(() => {
    if (currentPatient && doctorIdRef.current) {
      setShowFollowUpDialog(true);
    } else {
      // No patient context — skip directly to vula
      setShowVisitCategoryDialog(true);
    }
  }, [currentPatient]);

  // Persist the AI assessment + doctor findings note against the session row
  const persistAssessment = useCallback(async (note?: string) => {
    const sid = currentSessionIdRef.current;
    if (!sid) return;
    try {
      await supabase
        .from("sessions")
        .update({
          ai_diagnosis: aiDiagnosis ?? null,
          ...(note !== undefined ? { ai_findings_note: note || null } : {}),
        } as any)
        .eq("id", sid);
    } catch (e) {
      console.error("Failed to persist AI assessment:", e);
    }
  }, [aiDiagnosis]);

  // Begin the sequential document review chain
  const startDocumentReview = useCallback(() => {
    if (extractedMedCert) setShowMedCertReview(true);
    else if (extractedPrescription) setShowPrescriptionReview(true);
    else if (extractedInvoice) setShowInvoiceReview(true);
    else if (extractedReferral) setShowReferralReview(true);
    else setTimeout(() => advanceToFollowUp(), 300);
  }, [extractedMedCert, extractedPrescription, extractedInvoice, extractedReferral, advanceToFollowUp]);

  const handleFollowUpDone = useCallback(() => {
    setShowVisitCategoryDialog(true);
  }, []);

  // Callback to handle session completion after transcription
  const handleSessionComplete = useCallback(async (transcriptText: string, visitCategories?: string[] | null) => {
    if (completionRanRef.current) {
      console.log("handleSessionComplete skipped — already ran for this session");
      return;
    }
    completionRanRef.current = true;
    console.log("=== handleSessionComplete START ===");
    setSessionState("processing");
    
    const currentNotes = notesRef.current;
    const fullContent = [transcriptText, currentNotes].filter(Boolean).join('\n\n');
    
    let hasDocs = false;
    try {
      const result = await completeSession(
        null,
        fullContent || '',
        currentNotes,
        visitCategories?.[0] || undefined,
        {
          patient_id: patientId!,
          title: `Session - ${new Date().toLocaleDateString()}`,
          started_at: sessionStartTimeRef.current?.toISOString() || new Date().toISOString(),
          audio_url: savedAudioUrlRef.current || undefined,
        }
      );
      
      if (result) {
        setCurrentSessionId(result.id);
        setSummary(result.summary || "Session completed successfully.");
        setActionPoints(result.action_points || []);
        // No automatic AI assessment — the doctor triggers it manually via "AI Consult".

        const docs = (result as any)._extractedDocuments;
        if (docs?.follow_up_appointment?.follow_up_date) {
          setExtractedFollowUp(docs.follow_up_appointment);
        }
        if (docs?.medical_certificate) {
          setExtractedMedCert(docs.medical_certificate);
          hasDocs = true;
        }
        if (docs?.prescription) {
          setExtractedPrescription(docs.prescription);
          if (!hasDocs) { hasDocs = true; }
        }
        if (docs?.invoice?.items?.length) {
          setExtractedInvoice(docs.invoice);
          if (!hasDocs) { hasDocs = true; }
        } else if (fullContent?.trim()) {
          // A consultation always bills — synthesise a default line item so the
          // doctor is always offered an invoice to review (amount pre-filled from
          // their Service Offerings & Pricing where available).
          let amount = 0;
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: price } = await supabase
                .from('service_prices')
                .select('default_price, service_name')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true })
                .limit(20);
              const consult = (price || []).find((p: any) =>
                (p.service_name || '').toLowerCase().includes('consult'));
              amount = Number(consult?.default_price ?? (price?.[0] as any)?.default_price ?? 0) || 0;
            }
          } catch (e) { console.error('Pricing lookup failed:', e); }
          setExtractedInvoice({
            items: [{ description: `Consultation — ${new Date().toLocaleDateString()}`, amount }],
            total: amount,
          } as any);
          if (!hasDocs) { hasDocs = true; }
        }
        if (docs?.referral) {
          setExtractedReferral(docs.referral);
          if (!hasDocs) { hasDocs = true; }
        }
        // Go straight into the sequential document review.
        setTimeout(() => startDocumentReview(), 0);
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
  }, [completeSession, patientId, advanceToFollowUp, startDocumentReview]);

  // Visit-category dialog now runs at the END of the post-session chain (Vula award)
  const handleVisitCategoryConfirm = async (categories: string[] | null) => {
    setShowVisitCategoryDialog(false);
    if (!categories || categories.length === 0 || !currentSessionId) return;
    // Persist visit categories to the already-created session
    try {
      await (supabase.from('sessions').update({ visit_category: categories[0] } as any) as any).eq('id', currentSessionId);
    } catch (e) { console.error(e); }
  };

  const { 
    isRecording, 
    isPaused,
    isTranscribing, 
    isSavingAudio,
    transcript,
    liveTranscript,
    audioUrl,
    savedAudioUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearTranscript 
  } = useAudioRecording({
    patientName: currentPatient?.name,
    doctorName: doctorName,
    sessionId: currentSessionId || undefined,
    onEndSessionDetected: () => {
      console.log("End session detected via Web Speech API");
      if (!pendingCompletionRef.current) {
        toast({ title: "🎤 Session ending detected", description: "Ending session automatically from voice cue." });
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
      setNotes(text);
      
      // Whisper fallback: check transcript for end session phrases
      const endPhrases = ['end session', 'end of session', 'end the session', 'conclude the session', 'session ended'];
      if (!pendingCompletionRef.current && isRecording && endPhrases.some(phrase => text.toLowerCase().includes(phrase))) {
        pendingCompletionRef.current = true;
        stopRecording();
        toast({ title: "Session Ending", description: "End session detected in transcript" });
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

  // Live AI diagnostic hint while doctor is recording (before they conclude)
  const { hint: liveHint, isLoading: liveHintLoading } = useLiveDiagnosticHint({
    enabled: isRecording && !isPaused,
    transcript: liveTranscript || transcript,
    patientAge: (currentPatient as any)?.dob
      ? Math.max(0, Math.floor((Date.now() - new Date((currentPatient as any).dob).getTime()) / 31557600000))
      : ((currentPatient as any)?.age ?? null),

    patientSex: (currentPatient as any)?.gender ?? null,
    currentMedications: currentMedications?.length ? currentMedications : ((currentPatient as any)?.current_medications ?? null),
    chronicConditions: (currentPatient as any)?.chronic_conditions ?? null,
    allergies: (currentPatient as any)?.allergies ?? null,
    pastSessions: pastPatientSessions,

    language: (typeof doctorLanguage === "string" ? doctorLanguage : undefined),
  });

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

  // Mark the matching "Review ..." to-do as done so sent/handled documents leave the list
  const completeSessionTodo = async (match: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentSessionId) return;
      await supabase
        .from('todos')
        .update({ status: 'completed', completed_at: new Date().toISOString() } as any)
        .eq('user_id', user.id)
        .eq('session_id', currentSessionId)
        .ilike('title', `%${match}%`);
    } catch (e) { console.error(e); }
  };

  // Show the generate → send progress for a document, then continue the chain
  const runDelivery = (target: DocumentDeliveryTarget, next: () => void) => {
    deliveryNextRef.current = next;
    setDelivery(target);
  };

  const sendDeliveryDocument = async (target: DocumentDeliveryTarget) => {
    try {
      const { error } = await supabase.functions.invoke('send-document-email', {
        body: { documentId: target.documentId, recipientEmail: target.recipientEmail },
      });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Send failed:', e);
      toast({ title: 'Send failed', description: 'The document was generated but could not be emailed.', variant: 'destructive' });
      return false;
    }
  };

  const nextAfterMedCert = () => {
    if (extractedPrescription) setShowPrescriptionReview(true);
    else if (extractedInvoice) setShowInvoiceReview(true);
    else if (extractedReferral) setShowReferralReview(true);
    else advanceToFollowUp();
  };
  const nextAfterPrescription = () => {
    if (extractedInvoice) setShowInvoiceReview(true);
    else if (extractedReferral) setShowReferralReview(true);
    else advanceToFollowUp();
  };
  const nextAfterInvoice = () => {
    if (extractedReferral) setShowReferralReview(true);
    else advanceToFollowUp();
  };

  // Handlers for AI-extracted document approvals
  const handleApproveMedCert = async (data: MedCertData) => {
    if (!patientId || !currentSessionId) return;
    setReviewLoading(true);
    let docId: string | null = null;
    try {
      const content = `<b>MEDICAL CERTIFICATE</b>\n\nPatient: ${data.patient_name || currentPatient?.name}\nDiagnosis: ${data.diagnosis}\nLeave Period: ${data.start_date} to ${data.end_date}${data.notes ? `\nNotes: ${data.notes}` : ''}`;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: doc } = await supabase.from('documents').insert({
          user_id: user.id,
          patient_id: patientId,
          patient_name: currentPatient?.name || null,
          name: `Medical Certificate - ${new Date().toLocaleDateString()}`,
          content,
          template_name: 'Medical Certificate',
        }).select('id').single();
        docId = doc?.id || null;
      }
    } catch (e) { console.error(e); }
    setReviewLoading(false);
    setShowMedCertReview(false);
    runDelivery(
      {
        label: 'Medical Certificate',
        documentId: docId,
        recipientEmail: (currentPatient as any)?.email || null,
        recipientName: currentPatient?.name || null,
      },
      nextAfterMedCert,
    );

  };

  const handleApprovePrescription = async (data: PrescriptionData) => {
    if (!patientId || !currentSessionId) return;
    setReviewLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        for (const med of data.medications) {
          await supabase.from('prescriptions').insert({
            patient_id: patientId,
            doctor_id: user.id,
            session_id: currentSessionId,
            medication: med.medication,
            dosage: med.dosage,
            frequency: med.frequency,
            instructions: [med.duration, med.instructions].filter(Boolean).join('. ') || null,
          });
        }
      }
    } catch (e) { console.error(e); }
    setReviewLoading(false);
    setShowPrescriptionReview(false);
    runDelivery({ label: 'Prescription' }, nextAfterPrescription);

  };

  const handleApproveInvoice = async (data: InvoiceData) => {
    if (!patientId || !currentSessionId) return;
    setReviewLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
        const description = data.items.map(i => `${i.description}: R${i.amount}`).join('; ');
        const total = data.total || data.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const { data: inv } = await supabase.from('invoices').insert({
          patient_id: patientId,
          doctor_id: user.id,
          session_id: currentSessionId,
          invoice_number: invoiceNumber,
          description,
          amount: total,
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        }).select().single();
        if (inv) setInvoice({ id: inv.id, invoice_number: inv.invoice_number, amount: inv.amount });
      }
    } catch (e) { console.error(e); }
    setReviewLoading(false);
    setShowInvoiceReview(false);
    runDelivery({ label: 'Invoice' }, nextAfterInvoice);

  };

  const handleApproveReferral = async (data: ReferralData) => {
    if (!patientId) return;
    setReviewLoading(true);
    let docId: string | null = null;
    try {
      const content = `<b>REFERRAL LETTER</b>\n\nReferral To: ${data.specialist_type}${data.doctor_name ? ` - ${data.doctor_name}` : ''}\nReason: ${data.reason}\nUrgency: ${data.urgency || 'routine'}`;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: doc } = await supabase.from('documents').insert({
          user_id: user.id,
          patient_id: patientId,
          patient_name: currentPatient?.name || null,
          name: `Referral Letter - ${data.specialist_type} - ${new Date().toLocaleDateString()}`,
          content,
          template_name: 'Referral Letter',
        }).select('id').single();
        docId = doc?.id || null;
        // Increment referral count if doctor exists in referral_doctors
        if (data.doctor_name) {
          const { data: refDoc } = await supabase.from('referral_doctors')
            .select('id, referral_count')
            .eq('user_id', user.id)
            .ilike('last_name', `%${data.doctor_name.split(' ').pop()}%`)
            .maybeSingle();
          if (refDoc) {
            await supabase.from('referral_doctors')
              .update({ referral_count: (refDoc.referral_count || 0) + 1 })
              .eq('id', refDoc.id);
          }
        }
      }
    } catch (e) { console.error(e); }
    setReviewLoading(false);
    setShowReferralReview(false);
    runDelivery(
      {
        label: 'Referral Letter',
        documentId: docId,
        recipientEmail: (currentPatient as any)?.email || null,
        recipientName: currentPatient?.name || null,
      },
      advanceToFollowUp,
    );
  };



  // Auto-start when arriving from a patient profile ("Start Session")
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (searchParams.get("autoStart") !== "true") return;
    if (autoStartedRef.current) return;
    if (!patientId || !currentPatient) return;
    autoStartedRef.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete("autoStart");
    setSearchParams(next, { replace: true });
    startSession();
  }, [searchParams, patientId, currentPatient]);

  const startSession = async () => {
    setSessionState("active");
    setNotes("");
    setSummary("");
    setActionPoints([]);
    setSessionDuration(0);
    setPrescription(null);
    setInvoice(null);
    setAiDiagnosis(null);
    setCurrentSessionId(crypto.randomUUID());
    clearTranscript();
    sessionStartTimeRef.current = new Date();
    savedAudioUrlRef.current = null;
    completionRanRef.current = false;
    // Auto-start recording when session begins
    startRecording();
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
      {/* Session Diagnostics Modal */}
      <SessionDiagnosticsModal
        open={showDiagnosticsModal}
        fullDiagnosis={aiDiagnosis}
        diagnosisLoading={isGeneratingDiagnosis}
        patientName={currentPatient?.name}
        sessionDate={new Date().toLocaleDateString()}
        onClose={() => {
          setShowDiagnosticsModal(false);
          persistAssessment();
        }}
      />




      {/* Per-document generate → send progress */}
      <DocumentDeliveryProgress
        target={delivery}
        onSend={sendDeliveryDocument}
        onFinish={async (sent) => {
          const label = delivery?.label;
          setDelivery(null);
          if (sent && label) await completeSessionTodo(label);
          const next = deliveryNextRef.current;
          deliveryNextRef.current = null;
          setTimeout(() => next?.(), 200);
        }}
      />


      {/* Visit Category Dialog */}
      <VisitCategoryDialog
        open={showVisitCategoryDialog}
        onOpenChange={setShowVisitCategoryDialog}
        onConfirm={handleVisitCategoryConfirm}
        patientName={currentPatient?.name}
        transcript={pendingTranscript}
      />

      {/* Follow-up Appointment Dialog (after documents, before Vula award) */}
      {currentPatient && doctorIdRef.current && (
        <FollowUpAppointmentDialog
          open={showFollowUpDialog}
          onOpenChange={setShowFollowUpDialog}
          doctorId={doctorIdRef.current}
          doctorName={doctorName}
          patientId={currentPatient.id}
          patientUserId={(currentPatient as any).patient_user_id || null}
          patientName={currentPatient.name}
          suggestedDate={extractedFollowUp?.follow_up_date}
          suggestedTime={extractedFollowUp?.follow_up_time}
          onDone={handleFollowUpDone}
        />
      )}


      {/* AI-Extracted Document Review Dialogs */}
      {extractedMedCert && (
        <MedCertReviewDialog
          open={showMedCertReview}
          onOpenChange={setShowMedCertReview}
          data={extractedMedCert}
          patientName={currentPatient?.name || ""}
          onApprove={handleApproveMedCert}
          loading={reviewLoading}
        />
      )}
      {extractedPrescription && (
        <PrescriptionReviewDialog
          open={showPrescriptionReview}
          onOpenChange={setShowPrescriptionReview}
          data={extractedPrescription}
          onApprove={handleApprovePrescription}
          loading={reviewLoading}
        />
      )}
      {extractedInvoice && (
        <InvoiceReviewDialog
          open={showInvoiceReview}
          onOpenChange={setShowInvoiceReview}
          data={extractedInvoice}
          onApprove={handleApproveInvoice}
          loading={reviewLoading}
        />
      )}
      {extractedReferral && (
        <ReferralReviewDialog
          open={showReferralReview}
          onOpenChange={setShowReferralReview}
          data={extractedReferral}
          onApprove={handleApproveReferral}
          loading={reviewLoading}
        />
      )}

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
        <h1 className="text-3xl font-bold text-foreground">{t("sessions.sessionMode")}</h1>
        <p className="mt-1 text-muted-foreground text-xs">
          Record, transcribe, and generate AI summaries for patient sessions
        </p>
      </div>

      {/* Session States */}
      {sessionState === "idle" && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent mb-3">
            {currentPatient ? (
              <Play className="h-6 w-6 text-accent-foreground" />
            ) : (
              <Users className="h-6 w-6 text-accent-foreground" />
            )}
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {currentPatient ? "Ready to Start" : "Select a Patient"}
          </h2>
          <p className="text-muted-foreground mb-4 max-w-md text-sm">
            {currentPatient 
              ? "Begin a consultation to capture notes, record audio, and generate AI summaries."
              : "Choose a patient to start a new consultation session."}
          </p>
          
          {/* Patient Selector with Search */}
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
                        {[...patients].sort((a, b) => {
                          const surnameA = a.name.trim().split(/\s+/).pop()?.toLowerCase() || '';
                          const surnameB = b.name.trim().split(/\s+/).pop()?.toLowerCase() || '';
                          return surnameA.localeCompare(surnameB);
                        }).map((patient) => {
                          const parts = patient.name.trim().split(/\s+/);
                          const displayName = parts.length > 1
                            ? `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`
                            : patient.name;
                          return (
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
                            {displayName}
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
           {/* Notes/Drawing Panel - Tabbed Interface */}
           <div className="min-h-[500px] order-2 lg:order-1">
              <Tabs defaultValue="notes" className="h-full">
                <TabsList className="mb-2">
                  <TabsTrigger value="notes" className="gap-1.5 text-xs">
                    <FileText className="h-3.5 w-3.5" />
                    Session Notes
                  </TabsTrigger>
                  <TabsTrigger value="drawing" className="gap-1.5 text-xs">
                    <PenTool className="h-3.5 w-3.5" />
                    Drawing Pad
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="notes" className="mt-0">
                  <SessionNotepad
                    patientId={patientId || ""}
                    sessionId={currentSessionId}
                    patientName={currentPatient?.name}
                    notes={notes}
                    onNotesChange={setNotes}
                    isRecording={isRecording}
                  />
                </TabsContent>
                <TabsContent value="drawing" className="mt-0">
                  <DrawingPad
                    patientId={patientId || ""}
                    sessionId={currentSessionId || undefined}
                  />
                </TabsContent>
              </Tabs>
            </div>

          {/* Compact Recording Panel - Sidebar */}
          <div className="rounded-xl border border-primary bg-card shadow-sm flex flex-col order-1 lg:order-2">
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
                  <Clock className="h-4 w-4" />
                  <span className="font-mono">{formatDuration(sessionDuration)}</span>
                </div>
              </div>
            </div>

            {/* Recording Controls - Compact */}
            <div className="flex flex-col items-center gap-3 p-4">
              <div className="flex items-center gap-3">
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

                {/* Pause / Resume button — only while recording */}
                {isRecording && !isTranscribing && (
                  <button
                    onClick={() => (isPaused ? resumeRecording() : pauseRecording())}
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
                    <span>{isPaused ? "Resume recording" : "Pause recording"}</span>
                  </button>
                )}

                {/* Manual AI Clinician consult — available at any point in the session */}
                <button
                  onClick={handleAiConsult}
                  disabled={isGeneratingDiagnosis}
                  aria-label="AI Consult"
                  title="Ask the AI Clinician for findings so far"
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 rounded-full px-4 border-2 border-primary text-sm font-medium transition-all duration-300",
                    "bg-primary/10 text-primary hover:bg-primary/20",
                    isGeneratingDiagnosis && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {isGeneratingDiagnosis ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  <span>AI Consult</span>
                </button>
              </div>

              
              <p className="text-xs text-muted-foreground text-center">
                {isTranscribing 
                  ? "Transcribing..." 
                  : isRecording 
                    ? (isPaused ? "Paused — tap play to resume" : "Recording... Tap to stop")
                    : "Tap to record"}
              </p>
              <p className="text-xs text-muted-foreground/70 text-center mt-1">
                💡 Say "End Session" to automatically stop recording
              </p>
              
              {/* Compact Waveform */}
              {(isRecording || isTranscribing) && (
                <div className="w-full">
                  <AudioWaveform isRecording={isRecording && !isPaused} />
                </div>
              )}
            </div>

            {/* Live AI diagnostic hint - only while recording */}
            {isRecording && (liveHint || liveHintLoading) && (
              <div className="border-t bg-primary/5 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-medium text-primary-dark">Live AI hint</p>
                  </div>
                  {liveHintLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </div>
                {liveHint?.suggestion && (
                  <p className="text-[10px] text-foreground leading-relaxed">{liveHint.suggestion}</p>
                )}
                {liveHint?.differentials && liveHint.differentials.length > 0 && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    <span className="font-medium text-foreground">Consider:</span> {liveHint.differentials.join(" · ")}
                  </p>
                )}
                {liveHint?.red_flags && liveHint.red_flags.length > 0 && (
                  <p className="mt-1 text-[10px] text-destructive">
                    <span className="font-medium">Rule out:</span> {liveHint.red_flags.join(" · ")}
                  </p>
                )}
              </div>
            )}

            {/* Live Transcript Preview - Collapsible */}
            {(transcript || isTranscribing) && (
              <div className="border-t p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-medium text-primary-dark">Transcript</p>
                  </div>
                  {transcript && !isTranscribing && (
                    <span className="text-xs bg-success/15 text-success px-1.5 py-0.5 rounded">✓</span>
                  )}
                  {isTranscribing && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="max-h-[120px] overflow-y-auto bg-muted/30 rounded p-2">
                  {transcript ? (
                    <div className="space-y-0.5">
                      {transcript.split('\n').map((line, index) => {
                        const colonIndex = line.indexOf(':');
                        if (colonIndex > 0 && colonIndex < 50) {
                          const speaker = line.substring(0, colonIndex);
                          const text = line.substring(colonIndex + 1);
                          const speakerLower = speaker.toLowerCase().trim();
                          const isDoctor = speakerLower.includes('dr') || speakerLower.includes('doctor') || (doctorName && speakerLower.includes(doctorName.toLowerCase()));
                          return (
                            <p key={index} className={`text-[10px] leading-relaxed ${isDoctor ? 'text-primary' : 'text-foreground'}`}>
                              <span className="font-bold">{speaker}</span>:{text}
                            </p>
                          );
                        }
                        return line.trim() ? <p key={index} className="text-[10px] text-foreground leading-relaxed">{line}</p> : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic">Transcribing...</p>
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

            {/* Stop recording = ends session and triggers transcription pipeline.
                Use the main Mic/Square button above — no duplicate End Session button here. */}
          </div>

        </div>
      )}

      {sessionState === "processing" && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-primary bg-card p-12 text-center">
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

          {/* AI-Detected Documents Banner */}
          {(extractedMedCert || extractedPrescription || extractedInvoice || extractedReferral) && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">AI detected documents from this session:</span>
              {extractedMedCert && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowMedCertReview(true)}>
                  <FileTextIcon className="h-4 w-4" /> Medical Certificate
                </Button>
              )}
              {extractedPrescription && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowPrescriptionReview(true)}>
                  <Pill className="h-4 w-4" /> Prescription
                </Button>
              )}
              {extractedInvoice && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowInvoiceReview(true)}>
                  <Receipt className="h-4 w-4" /> Invoice
                </Button>
              )}
              {extractedReferral && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowReferralReview(true)}>
                  <Users className="h-4 w-4" /> Referral Letter
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-3">
            {/* Transcription */}
            <div className="rounded-xl border border-primary bg-card p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Transcription</h3>
              </div>
              <div className="max-h-[150px] overflow-y-auto space-y-1">
                {transcript ? (
                  transcript.split('\n').map((line, index) => {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > 0 && colonIndex < 50) {
                      const speaker = line.substring(0, colonIndex);
                      const text = line.substring(colonIndex + 1);
                      const speakerLower = speaker.toLowerCase().trim();
                      const isDoctor = speakerLower.includes('dr') || speakerLower.includes('doctor') || (doctorName && speakerLower.includes(doctorName.toLowerCase()));
                      return (
                        <p key={index} className={`text-sm leading-relaxed ${isDoctor ? 'text-primary' : 'text-foreground'}`}>
                          <span className="font-bold">{speaker}</span>:{text}
                        </p>
                      );
                    }
                    return line.trim() ? <p key={index} className="text-sm text-foreground leading-relaxed">{line}</p> : null;
                  })
                ) : (
                  <p className="text-sm text-muted-foreground italic">No transcription recorded.</p>
                )}
              </div>
              {audioUrl && (
                <div className="mt-2 pt-2 border-t border-border">
                  <audio controls className="w-full h-8" src={audioUrl}>
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-primary bg-card p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">AI Summary</h3>
              </div>
              <div className="max-h-[150px] overflow-y-auto">
                <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
              </div>
            </div>

            {/* Action Points */}
            <div className="rounded-xl border border-primary bg-card p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                <h3 className="font-semibold text-sm text-foreground">Action Points</h3>
              </div>
              <div className="max-h-[150px] overflow-y-auto">
                {actionPoints.length > 0 ? (
                  <ul className="space-y-1.5">
                    {actionPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <span className="text-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No action points generated.</p>
                )}
              </div>
              {actionPoints.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Added to To-Do List
                  </p>
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
              {isGeneratingDiagnosis && (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </span>
              )}

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
              <>
                <div className="flex items-center gap-2 mb-2">
                  {doctorLanguage !== 'English' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      disabled={isTranslatingDiagnosis}
                      onClick={async () => {
                        if (translatedDiagnosis) {
                          setShowTranslated(!showTranslated);
                          return;
                        }
                        setIsTranslatingDiagnosis(true);
                        try {
                          const { data, error } = await supabase.functions.invoke('summarize-session', {
                            body: { content: aiDiagnosis, action: 'translate', targetLanguage: doctorLanguage }
                          });
                          if (!error && data?.summary) {
                            setTranslatedDiagnosis(data.summary);
                            setShowTranslated(true);
                          }
                        } catch (e) { console.error('Translation error:', e); }
                        setIsTranslatingDiagnosis(false);
                      }}
                    >
                      {isTranslatingDiagnosis ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {showTranslated ? 'Show Original' : `Translate to ${doctorLanguage}`}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs"
                    onClick={async () => {
                      if (isNarrating) {
                        narrationAudioRef.current?.pause();
                        narrationAudioRef.current = null;
                        setIsNarrating(false);
                        return;
                      }
                      setIsNarrating(true);
                      try {
                        const textToNarrate = showTranslated && translatedDiagnosis ? translatedDiagnosis : aiDiagnosis;
                        const { data: { session: authSession } } = await supabase.auth.getSession();
                        const accessToken = authSession?.access_token;
                        if (!accessToken) throw new Error('Not authenticated');
                        const response = await fetch(
                          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrate-briefing`,
                          {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                              'Authorization': `Bearer ${accessToken}`,
                            },
                            body: JSON.stringify({ text: textToNarrate }),
                          }
                        );
                        if (!response.ok) throw new Error('Narration failed');
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const audio = new Audio(url);
                        audio.onended = () => { setIsNarrating(false); narrationAudioRef.current = null; };
                        audio.play();
                        narrationAudioRef.current = audio;
                      } catch (e) {
                        console.error('Narration error:', e);
                        setIsNarrating(false);
                        toast({ title: "Narration failed", variant: "destructive" });
                      }
                    }}
                  >
                    {isNarrating ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    {isNarrating ? 'Stop' : 'Narrate'}
                  </Button>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border max-h-[400px] overflow-y-auto">
                  <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                    {showTranslated && translatedDiagnosis ? translatedDiagnosis : aiDiagnosis}
                  </pre>
                </div>
              </>
            )}
          </div>

          {/* Post-Session Actions: Create Documents */}
          <div className="rounded-xl border border-primary bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-3">Create Document</h3>
            <div className="flex items-center gap-3">
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prescription">Prescription</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="medical_certificate">Medical Certificate</SelectItem>
                  <SelectItem value="referral_letter">Referral Letter</SelectItem>
                  <SelectItem value="general_letter">General Letter</SelectItem>
                  <SelectItem value="hospital_admission">Hospital Admission</SelectItem>
                </SelectContent>
              </Select>
              <Button
                disabled={!selectedDocType || !patientId}
                onClick={() => {
                  if (selectedDocType === 'prescription') setShowPrescriptionEditor(true);
                  else if (selectedDocType === 'invoice') setShowInvoiceEditor(true);
                  else if (selectedDocType === 'medical_certificate') setShowMedicalCertificateEditor(true);
                  else if (selectedDocType === 'referral_letter') setShowReferralLetterEditor(true);
                  else if (selectedDocType === 'general_letter') setShowGeneralLetterEditor(true);
                  else if (selectedDocType === 'hospital_admission') setShowHospitalAdmissionEditor(true);
                }}
              >
                <FileText className="h-4 w-4 mr-1" />
                Create
              </Button>
            </div>
            {(prescription || invoice) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {prescription && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="h-4 w-4 text-success" /> Prescription Saved
                  </Badge>
                )}
                {invoice && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="h-4 w-4 text-success" /> Invoice R {invoice.amount.toFixed(2)}
                  </Badge>
                )}
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
      <div className="rounded-xl border border-primary bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{t("sessions.allSessions")}</h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedRecordings.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={isDownloading}
                onClick={async () => {
                  setIsDownloading(true);
                  const selectedSessions = sessions.filter(s => selectedRecordings.has(s.id) && s.audio_url);
                  for (const s of selectedSessions) {
                    try {
                      const signedUrl = await getSignedAudioUrl(s.audio_url!);
                      if (!signedUrl) continue;
                      const link = document.createElement('a');
                      link.href = signedUrl;
                      link.download = `session-${format(new Date(s.started_at), 'yyyy-MM-dd')}.webm`;
                      link.click();
                      // Clear audio_url after download
                      await supabase.from('sessions').update({ audio_url: null }).eq('id', s.id);
                    } catch (e) { console.error('Download error:', e); }
                  }
                  setSelectedRecordings(new Set());
                  setIsDownloading(false);
                  toast({ title: "Downloads started", description: `${selectedSessions.length} recording(s) downloaded. They will be removed from servers.` });
                }}
              >
                {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Download {selectedRecordings.size} Recording{selectedRecordings.size > 1 ? 's' : ''}
              </Button>
            )}
            <Badge variant="secondary">{sessions.filter(s => s.status !== 'in_progress').length} sessions</Badge>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("sessions.searchByPatient")}
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={sessionDateFrom}
              onChange={(e) => setSessionDateFrom(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-lg border border-border bg-background"
              placeholder="From"
            />
            <input
              type="date"
              value={sessionDateTo}
              onChange={(e) => setSessionDateTo(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-lg border border-border bg-background"
              placeholder="To"
            />
          </div>
        </div>

        <Alert className="mb-4 border-amber-500/30 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-700">
            Voice recordings and transcriptions are deleted after 7 days. Download them to keep. AI summaries remain permanently.
          </AlertDescription>
        </Alert>
        
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (() => {
          const filteredSessions = sessions.filter(s => {
            if (s.status === 'in_progress') return false;
            if (sessionSearch) {
              const patientName = (s.patient?.name || '').toLowerCase();
              const title = (s.title || '').toLowerCase();
              const q = sessionSearch.toLowerCase();
              if (!patientName.includes(q) && !title.includes(q)) return false;
            }
            if (sessionDateFrom) {
              const sessionDate = new Date(s.started_at).toISOString().split('T')[0];
              if (sessionDate < sessionDateFrom) return false;
            }
            if (sessionDateTo) {
              const sessionDate = new Date(s.started_at).toISOString().split('T')[0];
              if (sessionDate > sessionDateTo) return false;
            }
            return true;
          });
          const now = new Date();
          const weekStart = startOfWeek(now, { weekStartsOn: 1 });
          const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
          const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

          const thisWeekSessions = filteredSessions.filter(s => {
            const d = parseISO(s.started_at);
            return d >= weekStart && d <= now;
          });
          const lastWeekSessions = filteredSessions.filter(s => {
            const d = parseISO(s.started_at);
            return isWithinInterval(d, { start: lastWeekStart, end: lastWeekEnd });
          });
          const olderSessions = filteredSessions.filter(s => {
            const d = parseISO(s.started_at);
            return d < lastWeekStart;
          });

          // Group older sessions by month
          const monthGroups: Record<string, typeof olderSessions> = {};
          olderSessions.forEach(s => {
            const key = format(parseISO(s.started_at), 'MMMM yyyy');
            if (!monthGroups[key]) monthGroups[key] = [];
            monthGroups[key].push(s);
          });

          const renderSessionRow = (session: typeof filteredSessions[0]) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-2 rounded-lg border border-border bg-background hover:bg-accent/50 transition-colors"
            >
              {(() => {
                const daysSinceCreation = Math.floor((Date.now() - new Date(session.created_at).getTime()) / (1000 * 60 * 60 * 24));
                const isExpired = daysSinceCreation > 7;
                return (
                  <div className="mr-3" onClick={(e) => e.stopPropagation()}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Checkbox
                              checked={selectedRecordings.has(session.id)}
                              disabled={isExpired}
                              className={isExpired ? "opacity-40" : ""}
                              onCheckedChange={(checked) => {
                                setSelectedRecordings(prev => {
                                  const next = new Set(prev);
                                  if (checked) next.add(session.id);
                                  else next.delete(session.id);
                                  return next;
                                });
                              }}
                            />
                          </span>
                        </TooltipTrigger>
                        {isExpired && <TooltipContent>Recording expired</TooltipContent>}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                );
              })()}
              <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/sessions/${session.id}`)}>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{session.title || 'Untitled Session'}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.patient?.name || 'Unknown Patient'} • {format(new Date(session.started_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {session.audio_url && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (playingSessionId === session.id) {
                        audioRef.current?.pause();
                        audioRef.current = null;
                        setPlayingSessionId(null);
                      } else {
                        audioRef.current?.pause();
                        const signedUrl = await getSignedAudioUrl(session.audio_url!);
                        if (!signedUrl) return;
                        const audio = new Audio(signedUrl);
                        audio.onended = () => setPlayingSessionId(null);
                        audio.play();
                        audioRef.current = audio;
                        setPlayingSessionId(session.id);
                      }
                    }}
                    className="text-primary hover:text-primary/80 transition-colors"
                    title={playingSessionId === session.id ? "Stop recording" : "Play recording"}
                  >
                    {playingSessionId === session.id ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>
                )}
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
          );

          return (
          <div className="space-y-4">
            {/* This Week - always expanded, not collapsible */}
            {thisWeekSessions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  This Week <Badge variant="secondary" className="text-xs">{thisWeekSessions.length}</Badge>
                </h3>
                <div className="space-y-1.5">
                  {thisWeekSessions.map(renderSessionRow)}
                </div>
              </div>
            )}

            {/* Last Week & Monthly groups - collapsible, default collapsed */}
            {(lastWeekSessions.length > 0 || Object.keys(monthGroups).length > 0) && (
              <Accordion type="multiple">
                {lastWeekSessions.length > 0 && (
                  <AccordionItem value="last-week">
                    <AccordionTrigger className="group text-sm font-semibold px-3 py-2 hover:no-underline border-0 rounded-none bg-transparent data-[state=open]:bg-primary data-[state=open]:text-white [&_svg]:group-data-[state=open]:text-white">
                      <span className="flex items-center gap-2">
                        Last Week <Badge variant="secondary" className="text-xs">{lastWeekSessions.length}</Badge>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1.5">
                        {lastWeekSessions.map(renderSessionRow)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
                {Object.entries(monthGroups).map(([month, sessions]) => (
                  <AccordionItem key={month} value={month}>
                    <AccordionTrigger className="group text-sm font-semibold px-3 py-2 hover:no-underline border-0 rounded-none bg-transparent data-[state=open]:bg-primary data-[state=open]:text-white [&_svg]:group-data-[state=open]:text-white">
                      <span className="flex items-center gap-2">
                        {month} <Badge variant="secondary" className="text-xs">{sessions.length}</Badge>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1.5">
                        {sessions.map(renderSessionRow)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            {thisWeekSessions.length === 0 && lastWeekSessions.length === 0 && Object.keys(monthGroups).length === 0 && (
              <p className="text-muted-foreground text-center py-8">No sessions match your search.</p>
            )}
          </div>
          );
        })()}
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

      {/* Medical Certificate Editor Modal */}
      {showMedicalCertificateEditor && currentPatient && patientId && (
        <MedicalCertificateEditor
          patientName={currentPatient.name}
          patientId={patientId}
          sessionId={currentSessionId || undefined}
          onClose={() => setShowMedicalCertificateEditor(false)}
          onSave={() => setShowMedicalCertificateEditor(false)}
        />
      )}

      {/* Referral Letter Editor Modal */}
      {showReferralLetterEditor && currentPatient && patientId && (
        <ReferralLetterEditor
          patientName={currentPatient.name}
          patientId={patientId}
          sessionId={currentSessionId || undefined}
          onClose={() => setShowReferralLetterEditor(false)}
          onSave={() => setShowReferralLetterEditor(false)}
        />
      )}

      {/* General Letter Editor Modal */}
      {showGeneralLetterEditor && currentPatient && patientId && (
        <GeneralLetterEditor
          patientName={currentPatient.name}
          patientId={patientId}
          sessionId={currentSessionId || undefined}
          onClose={() => setShowGeneralLetterEditor(false)}
          onSave={() => setShowGeneralLetterEditor(false)}
        />
      )}

      {/* Hospital Admission Editor Modal */}
      {showHospitalAdmissionEditor && currentPatient && patientId && (
        <HospitalAdmissionEditor
          patientName={currentPatient.name}
          patientId={patientId}
          sessionId={currentSessionId || undefined}
          onClose={() => setShowHospitalAdmissionEditor(false)}
          onSave={() => setShowHospitalAdmissionEditor(false)}
        />
      )}
    </div>
  );
}
