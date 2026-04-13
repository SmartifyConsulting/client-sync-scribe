import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getSignedAudioUrl } from "@/utils/audioUrl";
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
import { MedicalCertificateEditor } from "@/components/sessions/MedicalCertificateEditor";
import { ReferralLetterEditor } from "@/components/sessions/ReferralLetterEditor";
import { GeneralLetterEditor } from "@/components/sessions/GeneralLetterEditor";
import { HospitalAdmissionEditor } from "@/components/sessions/HospitalAdmissionEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SessionNotepad } from "@/components/sessions/SessionNotepad";
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
          .select('full_name, preferred_languages')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.full_name) {
          setDoctorName(profile.full_name);
        }
        if (profile?.preferred_languages && profile.preferred_languages.length > 0) {
          setDoctorLanguage(profile.preferred_languages[0]);
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
  const latestTranscriptRef = useRef<string>("");
  const currentSessionIdRef = useRef<string | null>(null);
  const [showMedicalCertificateEditor, setShowMedicalCertificateEditor] = useState(false);
  const [showReferralLetterEditor, setShowReferralLetterEditor] = useState(false);
  const [showGeneralLetterEditor, setShowGeneralLetterEditor] = useState(false);
  const [showHospitalAdmissionEditor, setShowHospitalAdmissionEditor] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const notesRef = useRef<string>("");
  const sessionStartTimeRef = useRef<Date | null>(null);

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
  const handleSessionComplete = useCallback(async (transcriptText: string, visitCategories?: string[] | null) => {
    console.log("=== handleSessionComplete START ===");
    console.log("transcriptText length:", transcriptText?.length);
    console.log("visitCategories:", visitCategories);
    
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
        
        // Process AI-extracted documents
        const docs = (result as any)._extractedDocuments;
        if (docs?.medical_certificate) {
          setExtractedMedCert(docs.medical_certificate);
          setShowMedCertReview(true);
        }
        if (docs?.prescription) {
          setExtractedPrescription(docs.prescription);
        }
        if (docs?.invoice) {
          setExtractedInvoice(docs.invoice);
        }
        if (docs?.referral) {
          setExtractedReferral(docs.referral);
        }
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

  // Handle visit category selection (multi-select)
  const handleVisitCategoryConfirm = async (categories: string[] | null) => {
    setShowVisitCategoryDialog(false);
    await handleSessionComplete(pendingTranscript, categories);
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
    doctorName: doctorName,
    sessionId: currentSessionId || undefined,
    onEndSessionDetected: () => {
      console.log("End session detected via Web Speech API");
      if (!pendingCompletionRef.current) {
        toast({ title: "🎤 Session ending detected", description: "Ending session automatically from voice cue." });
        pendingCompletionRef.current = true;
        setPendingTranscript(latestTranscriptRef.current);
        setTimeout(() => { if (isRecording) stopRecording(); }, 100);
        setTimeout(() => {
          setShowVisitCategoryDialog(true);
          pendingCompletionRef.current = false;
        }, 2000);
      }
    },
    onTranscriptionComplete: (text) => {
      console.log("=== onTranscriptionComplete ===");
      console.log("text length:", text?.length);
      console.log("pendingCompletionRef:", pendingCompletionRef.current);
      
      // Store transcript — set directly, don't append (hook already returns full text)
      latestTranscriptRef.current = text;
      setNotes(text);
      
      // Whisper fallback: check transcript for end session phrases
      const endPhrases = ['end session', 'end of session', 'end the session', 'conclude the session', 'session ended'];
      if (!pendingCompletionRef.current && isRecording && endPhrases.some(phrase => text.toLowerCase().includes(phrase))) {
        console.log('End session detected via Whisper transcript fallback');
        pendingCompletionRef.current = true;
        stopRecording();
        toast({ title: "Session Ending", description: "End session detected in transcript" });
      }
      
      // If pending completion (from voice detection), show visit category dialog
      if (pendingCompletionRef.current) {
        console.log("Pending completion - showing visit category dialog");
        setPendingTranscript(text);
        setShowVisitCategoryDialog(true);
        pendingCompletionRef.current = false;
      }
    },
    onAudioSaved: async (audioStorageUrl) => {
      console.log("Audio saved to storage:", audioStorageUrl);
      // Store audio URL locally - will be included when session is created on completion
      savedAudioUrlRef.current = audioStorageUrl;
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

  // Handlers for AI-extracted document approvals
  const handleApproveMedCert = async (data: MedCertData) => {
    if (!patientId || !currentSessionId) return;
    setReviewLoading(true);
    try {
      const content = `<b>MEDICAL CERTIFICATE</b>\n\nPatient: ${data.patient_name || currentPatient?.name}\nDiagnosis: ${data.diagnosis}\nLeave Period: ${data.start_date} to ${data.end_date}${data.notes ? `\nNotes: ${data.notes}` : ''}`;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('documents').insert({
          user_id: user.id,
          patient_id: patientId,
          patient_name: currentPatient?.name || null,
          name: `Medical Certificate - ${new Date().toLocaleDateString()}`,
          content,
          template_name: 'Medical Certificate',
        });
      }
      toast({ title: "Medical Certificate Created", description: "Document saved and ready for sending." });
    } catch (e) { console.error(e); }
    setReviewLoading(false);
    setShowMedCertReview(false);
    // Show next dialog if available
    if (extractedPrescription) setShowPrescriptionReview(true);
    else if (extractedInvoice) setShowInvoiceReview(true);
    else if (extractedReferral) setShowReferralReview(true);
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
      toast({ title: "Prescription Saved", description: `${data.medications.length} medication(s) added.` });
    } catch (e) { console.error(e); }
    setReviewLoading(false);
    setShowPrescriptionReview(false);
    if (extractedInvoice) setShowInvoiceReview(true);
    else if (extractedReferral) setShowReferralReview(true);
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
      toast({ title: "Invoice Created", description: "Invoice saved successfully." });
    } catch (e) { console.error(e); }
    setReviewLoading(false);
    setShowInvoiceReview(false);
    if (extractedReferral) setShowReferralReview(true);
  };

  const handleApproveReferral = async (data: ReferralData) => {
    if (!patientId) return;
    setReviewLoading(true);
    try {
      const content = `<b>REFERRAL LETTER</b>\n\nReferral To: ${data.specialist_type}${data.doctor_name ? ` - ${data.doctor_name}` : ''}\nReason: ${data.reason}\nUrgency: ${data.urgency || 'routine'}`;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('documents').insert({
          user_id: user.id,
          patient_id: patientId,
          patient_name: currentPatient?.name || null,
          name: `Referral Letter - ${data.specialist_type} - ${new Date().toLocaleDateString()}`,
          content,
          template_name: 'Referral Letter',
        });
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
      toast({ title: "Referral Letter Created", description: "Document saved successfully." });
    } catch (e) { console.error(e); }
    setReviewLoading(false);
    setShowReferralReview(false);
  };


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
        transcript={pendingTranscript}
      />


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
        <h1 className="text-2xl font-bold text-foreground">Session Mode</h1>
        <p className="mt-1 text-muted-foreground text-[12px]">
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
          <div className="rounded-xl border border-primary bg-card shadow-sm flex flex-col order-2 lg:order-2">
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
              <p className="text-[10px] text-muted-foreground/70 text-center mt-1">
                💡 Say "End Session" to automatically stop recording
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
                    <div className="space-y-0.5">
                      {transcript.split('\n').map((line, index) => {
                        const colonIndex = line.indexOf(':');
                        if (colonIndex > 0 && colonIndex < 50) {
                          const speaker = line.substring(0, colonIndex);
                          const text = line.substring(colonIndex + 1);
                          const speakerLower = speaker.toLowerCase().trim();
                          const isDoctor = speakerLower.includes('dr') || speakerLower.includes('doctor') || (doctorName && speakerLower.includes(doctorName.toLowerCase()));
                          return (
                            <p key={index} className={`text-xs leading-relaxed ${isDoctor ? 'text-primary' : 'text-foreground'}`}>
                              <span className="font-bold">{speaker}</span>:{text}
                            </p>
                          );
                        }
                        return line.trim() ? <p key={index} className="text-xs text-foreground leading-relaxed">{line}</p> : null;
                      })}
                    </div>
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
                  <FileTextIcon className="h-3 w-3" /> Medical Certificate
                </Button>
              )}
              {extractedPrescription && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowPrescriptionReview(true)}>
                  <Pill className="h-3 w-3" /> Prescription
                </Button>
              )}
              {extractedInvoice && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowInvoiceReview(true)}>
                  <Receipt className="h-3 w-3" /> Invoice
                </Button>
              )}
              {extractedReferral && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowReferralReview(true)}>
                  <Users className="h-3 w-3" /> Referral Letter
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
                    <CheckCircle className="h-3 w-3" />
                    Added to To-Do List
                  </p>
                </div>
              )}
            </div>
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
                    <CheckCircle className="h-3 w-3 text-success" /> Prescription Saved
                  </Badge>
                )}
                {invoice && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="h-3 w-3 text-success" /> Invoice R {invoice.amount.toFixed(2)}
                  </Badge>
                )}
              </div>
            )}
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
                            body: { content: aiDiagnosis, action: 'translate', targetLanguage: 'English' }
                          });
                          if (!error && data?.summary) {
                            setTranslatedDiagnosis(data.summary);
                            setShowTranslated(true);
                          }
                        } catch (e) { console.error('Translation error:', e); }
                        setIsTranslatingDiagnosis(false);
                      }}
                    >
                      {isTranslatingDiagnosis ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {showTranslated ? 'Show Original' : 'Translate to English'}
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
                        const response = await fetch(
                          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrate-briefing`,
                          {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
                    {isNarrating ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
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
            <h2 className="text-sm font-semibold text-foreground">All Sessions</h2>
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
              placeholder="Search by patient name..."
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
        ) : sessions.filter(s => s.status !== 'in_progress').length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No sessions recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {sessions.filter(s => s.status !== 'in_progress').map((session) => (
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
