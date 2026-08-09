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
  Info,
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
  Lock,
  Send,
  Save,
  CalendarCheck,
} from "lucide-react";
import { PrescriptionEditor } from "@/components/sessions/PrescriptionEditor";
import { InvoiceEditor } from "@/components/sessions/InvoiceEditor";
import { MedicalCertificateEditor } from "@/components/sessions/MedicalCertificateEditor";
import { ReferralLetterEditor } from "@/components/sessions/ReferralLetterEditor";
import { GeneralLetterEditor } from "@/components/sessions/GeneralLetterEditor";
import { HospitalAdmissionEditor } from "@/components/sessions/HospitalAdmissionEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SessionNotepad } from "@/components/sessions/SessionNotepad";
import { SessionPatientOverview } from "@/features/sessions/components/SessionPatientOverview";
import { SessionDiscStrip } from "@/features/sessions/components/SessionDiscStrip";
import { SessionProcessingDialog } from "@/features/sessions/components/SessionProcessingDialog";
import { SessionTranscriptAccordion } from "@/features/sessions/components/SessionTranscriptAccordion";

import { SessionDiagnosticsModal } from "@/components/sessions/SessionDiagnosticsModal";

import { DrawingPad } from "@/components/drawings/DrawingPad";
import type { MedCertData, PrescriptionData, InvoiceData, ReferralData } from "@/components/sessions/TranscriptionReviewDialogs";
import { GeneratedDocumentsDialog, type GeneratedDoc, type GeneratedDocKey } from "@/features/sessions/components/GeneratedDocumentsDialog";
import { PostSessionStepDialog, type PostSessionStepType } from "@/features/sessions/components/PostSessionStepDialog";
import { SessionGeneratedDocuments } from "@/features/sessions/components/SessionGeneratedDocuments";
import { SessionResultPanels } from "@/features/sessions/components/SessionResultPanels";
import { renderClinicalHighlights } from "@/features/sessions/lib/clinicalHighlights";
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

/**
 * Best-guess price for a standard GP consultation from the doctor's own
 * Service Offerings & Pricing. Scores each service name against consultation
 * keywords and prefers a plain/general consultation over specialised entries.
 * Never returns a hard-coded R0 when any priced service exists.
 */
async function lookupConsultationPrice(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { data: prices } = await supabase
      .from("service_prices")
      .select("default_price, service_name")
      .eq("user_id", user.id)
      .limit(100);
    const rows = (prices || []).filter((p: any) => Number(p.default_price) > 0);
    if (!rows.length) return 0;

    const score = (name: string) => {
      const n = (name || "").toLowerCase();
      let s = 0;
      if (n.includes("consult")) s += 10;
      if (n.includes("gp") || n.includes("general practitioner")) s += 6;
      if (n.includes("general")) s += 4;
      if (n.includes("standard") || n.includes("basic")) s += 3;
      if (n.includes("follow")) s -= 6;
      if (n.includes("after hours") || n.includes("after-hours") || n.includes("emergency")) s -= 6;
      if (n.includes("specialist") || n.includes("procedure") || n.includes("home visit")) s -= 5;
      // Shorter, plainer names are usually the standard consult.
      s -= Math.min(3, Math.floor(n.length / 25));
      return s;
    };

    const best = [...rows].sort((a: any, b: any) => score(b.service_name) - score(a.service_name))[0];
    return Number(best?.default_price) || Number(rows[0]?.default_price) || 0;
  } catch (e) {
    console.error("Pricing lookup failed:", e);
    return 0;
  }
}

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
  const [aiConsultEnabled, setAiConsultEnabled] = useState(false);
  const [showAboutRecordingDialog, setShowAboutRecordingDialog] = useState(false);
  const [showAiConsultPrompt, setShowAiConsultPrompt] = useState(false);
  const micPreWarmedRef = useRef(false);
  const [showMedicalCertificateEditor, setShowMedicalCertificateEditor] = useState(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [findingsNote, setFindingsNote] = useState("");
  const [showReferralLetterEditor, setShowReferralLetterEditor] = useState(false);
  const [showGeneralLetterEditor, setShowGeneralLetterEditor] = useState(false);
  const [showHospitalAdmissionEditor, setShowHospitalAdmissionEditor] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const notesRef = useRef<string>("");
  const sessionStartTimeRef = useRef<Date | null>(null);

  // AI-extracted document state
  const [extractedMedCert, setExtractedMedCert] = useState<MedCertData | null>(null);
  const [extractedPrescription, setExtractedPrescription] = useState<PrescriptionData | null>(null);
  const [extractedInvoice, setExtractedInvoice] = useState<InvoiceData | null>(null);
  const [extractedReferral, setExtractedReferral] = useState<ReferralData | null>(null);
  // Single summary dialog for all documents generated from this session
  const [showGeneratedDocsDialog, setShowGeneratedDocsDialog] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([]);
  const [previewDocKey, setPreviewDocKey] = useState<GeneratedDocKey | null>(null);
  const [extractedFollowUp, setExtractedFollowUp] = useState<{ follow_up_date?: string; follow_up_time?: string; notes?: string } | null>(null);
  // Sequential post-session flow: one step (document / schedule / invoice / vula) at a time.
  const [postSessionQueue, setPostSessionQueue] = useState<PostSessionStepType[]>([]);
  const [postSessionIndex, setPostSessionIndex] = useState(0);
  const [showPostSessionFlow, setShowPostSessionFlow] = useState(false);
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
  // Arriving from a patient profile's "Start Session" link — suppress the
  // patient-selector idle screen entirely while the session auto-starts.
  const [autoStartTimedOut, setAutoStartTimedOut] = useState(false);
  const isAutoStarting = searchParams.get("autoStart") === "true" && !autoStartTimedOut;

  // Safety net — if the patient never resolves (stale link, load failure), don't
  // trap the doctor on "Starting session..." forever; fall back to manual selection.
  useEffect(() => {
    if (searchParams.get("autoStart") !== "true") return;
    const timer = setTimeout(() => {
      if (!currentPatient) setAutoStartTimedOut(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, [searchParams, currentPatient]);

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

  // Pre-warm the mic permission as soon as a patient is selected (idle screen), so the
  // browser has already granted access by the time the doctor clicks "Start Session" —
  // the permission prompt is usually what makes that click feel slow.
  useEffect(() => {
    if (!currentPatient || sessionState !== "idle" || micPreWarmedRef.current) return;
    micPreWarmedRef.current = true;
    navigator.mediaDevices?.getUserMedia?.({ audio: true })
      .then((stream) => stream.getTracks().forEach((t) => t.stop()))
      .catch(() => { micPreWarmedRef.current = false; });
  }, [currentPatient, sessionState]);

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
          id: s.id,
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

  // Advance to the next step in the sequential post-session queue, closing the
  // flow once every step (documents → schedule → invoice → vula) has run.
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

  // --- Silent document creation (no per-document review dialog) ---
  const createMedCertDocument = async (data: MedCertData): Promise<GeneratedDoc | null> => {
    if (!patientId) return null;
    try {
      const content = `<b>MEDICAL CERTIFICATE</b>\n\nPatient: ${data.patient_name || currentPatient?.name}\nDiagnosis: ${data.diagnosis}\nLeave Period: ${data.start_date} to ${data.end_date}${data.notes ? `\nNotes: ${data.notes}` : ''}`;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: doc } = await supabase.from('documents').insert({
        user_id: user.id,
        patient_id: patientId,
        patient_name: currentPatient?.name || null,
        name: `Medical Certificate - ${new Date().toLocaleDateString()}`,
        content,
        template_name: 'Medical Certificate',
      }).select('id').single();
      return {
        key: 'medcert',
        label: 'Medical Certificate',
        documentId: doc?.id || null,
        content,
        recipientEmail: (currentPatient as any)?.email || null,
        recipientName: currentPatient?.name || null,
      };
    } catch (e) { console.error(e); return null; }
  };

  const createPrescriptionDocument = async (data: PrescriptionData): Promise<GeneratedDoc | null> => {
    if (!patientId || !currentSessionIdRef.current) return null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      for (const med of data.medications) {
        await supabase.from('prescriptions').insert({
          patient_id: patientId,
          doctor_id: user.id,
          session_id: currentSessionIdRef.current,
          medication: med.medication,
          dosage: med.dosage,
          frequency: med.frequency,
          instructions: [med.duration, med.instructions].filter(Boolean).join('. ') || null,
        });
      }
      const content = `<b>PRESCRIPTION</b>\n\nPatient: ${currentPatient?.name || ''}\n\n${data.medications.map(m => `• ${m.medication} — ${m.dosage}, ${m.frequency}${m.duration ? ` (${m.duration})` : ''}${m.instructions ? `\n  ${m.instructions}` : ''}`).join('\n')}`;
      const { data: doc } = await supabase.from('documents').insert({
        user_id: user.id,
        patient_id: patientId,
        patient_name: currentPatient?.name || null,
        name: `Prescription - ${new Date().toLocaleDateString()}`,
        content,
        template_name: 'Prescription',
      }).select('id').single();
      return {
        key: 'prescription',
        label: 'Prescription',
        documentId: doc?.id || null,
        content,
        recipientEmail: (currentPatient as any)?.pharmacy_email || (currentPatient as any)?.email || null,
        recipientName: currentPatient?.name || null,
      };
    } catch (e) { console.error(e); return null; }
  };

  const createInvoiceDocument = async (data: InvoiceData): Promise<GeneratedDoc | null> => {
    if (!patientId || !currentSessionIdRef.current) return null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
      const description = data.items.map(i => `${i.description}: R${i.amount}`).join('; ');
      const total = data.total || data.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
      const { data: inv } = await supabase.from('invoices').insert({
        patient_id: patientId,
        doctor_id: user.id,
        session_id: currentSessionIdRef.current,
        invoice_number: invoiceNumber,
        description,
        amount: total,
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      }).select().single();
      if (inv) setInvoice({ id: inv.id, invoice_number: inv.invoice_number, amount: inv.amount });
      const content = `<b>INVOICE ${invoiceNumber}</b>\n\nPatient: ${currentPatient?.name || ''}\n\n${data.items.map(i => `• ${i.description} — R${i.amount}`).join('\n')}\n\nTotal: R${total}`;
      const { data: doc } = await supabase.from('documents').insert({
        user_id: user.id,
        patient_id: patientId,
        patient_name: currentPatient?.name || null,
        name: `Invoice ${invoiceNumber}`,
        content,
        template_name: 'Invoice',
      }).select('id').single();
      return {
        key: 'invoice',
        label: 'Invoice',
        documentId: doc?.id || null,
        content,
        recipientEmail: (currentPatient as any)?.email || null,
        recipientName: currentPatient?.name || null,
      };
    } catch (e) { console.error(e); return null; }
  };

  const createReferralDocument = async (data: ReferralData): Promise<GeneratedDoc | null> => {
    if (!patientId) return null;
    try {
      const content = `<b>REFERRAL LETTER</b>\n\nReferral To: ${data.specialist_type}${data.doctor_name ? ` - ${data.doctor_name}` : ''}\nReason: ${data.reason}\nUrgency: ${data.urgency || 'routine'}`;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: doc } = await supabase.from('documents').insert({
        user_id: user.id,
        patient_id: patientId,
        patient_name: currentPatient?.name || null,
        name: `Referral Letter - ${data.specialist_type} - ${new Date().toLocaleDateString()}`,
        content,
        template_name: 'Referral Letter',
      }).select('id').single();
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
      return {
        key: 'referral',
        label: 'Referral Letter',
        documentId: doc?.id || null,
        content,
        recipientEmail: (currentPatient as any)?.email || null,
        recipientName: currentPatient?.name || null,
      };
    } catch (e) { console.error(e); return null; }
  };

  // Silently generate every AI-detected document, then show ONE summary dialog
  // instead of chaining separate popups together.
  const generateAllDocuments = useCallback(async () => {
    const results: GeneratedDoc[] = [];
    if (extractedMedCert) {
      const d = await createMedCertDocument(extractedMedCert);
      if (d) results.push(d);
    }
    if (extractedPrescription) {
      const d = await createPrescriptionDocument(extractedPrescription);
      if (d) results.push(d);
    }
    if (extractedInvoice) {
      const d = await createInvoiceDocument(extractedInvoice);
      if (d) results.push(d);
    }
    if (extractedReferral) {
      const d = await createReferralDocument(extractedReferral);
      if (d) results.push(d);
    }
    // Every consultation is billable — if the AI didn't pick up explicit billing
    // talk, still raise a standard consultation invoice so the doctor always has
    // a document to review, send or discard.
    if (!extractedInvoice) {
      const amount = await lookupConsultationPrice();
      const d = await createInvoiceDocument({
        items: [{ description: `Consultation — ${new Date().toLocaleDateString()}`, amount }],
        total: amount,
      } as InvoiceData);
      if (d) results.push(d);
    }
    setGeneratedDocs(results);

    // Build the sequential post-session queue from only the documents that were
    // actually generated this session, then always end with schedule → invoice → vula.
    const steps: PostSessionStepType[] = [];
    if (extractedPrescription) steps.push("prescription");
    if (extractedMedCert) steps.push("medcert");
    if (extractedReferral) steps.push("referral");
    steps.push("schedule", "invoice", "vula");
    setPostSessionQueue(steps);
    setPostSessionIndex(0);
    setShowPostSessionFlow(true);

  }, [extractedMedCert, extractedPrescription, extractedInvoice, extractedReferral, patientId, currentPatient]);

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
        setSummary(result.summary || "");
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
          const amount = await lookupConsultationPrice();
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
        // Silently create every detected document, then show one summary dialog.
        setTimeout(() => generateAllDocuments(), 0);
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
        description:
          "The AI analysis failed or timed out, so no summary, action points or documents were produced. Your recording and notes are saved — tap the mic and use AI Consult to retry.",
        variant: "destructive",
      });
    }

    setSessionState("completed");
    pendingCompletionRef.current = false;
  }, [completeSession, patientId, generateAllDocuments]);

  // Visit-category dialog runs as the final step of the post-session queue (Vula award).
  // PostSessionStepDialog calls onFinish() itself right after this resolves.
  const handleVisitCategoryConfirm = async (categories: string[] | null) => {
    if (categories && categories.length > 0 && currentSessionId) {
      // Persist visit categories to the already-created session
      try {
        await (supabase.from('sessions').update({ visit_category: categories[0] } as any) as any).eq('id', currentSessionId);
      } catch (e) { console.error(e); }
    }
  };

  const { 
    isRecording, 
    isPaused,
    isTranscribing, 
    isSavingAudio,
    transcript,
    liveTranscript,
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
      // The transcript lives in the Session Transcript accordion only — AI Clinician Notes keeps
      // the accumulated live clinical guidance, never a copy of the transcript.

      
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
    enabled: isRecording && !isPaused && aiConsultEnabled,
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

  // The live hints ARE the AI Clinician Notes: each new hint is merged into a
  // running, de-duplicated clinical note instead of being appended verbatim, so
  // the note stays readable and free of repetition.
  const hintImpressionRef = useRef<string>("");
  const hintLinesRef = useRef<Set<string>>(new Set());
  const hintSectionsRef = useRef<{ alerts: string[]; differentials: string[]; investigations: string[] }>({
    alerts: [],
    differentials: [],
    investigations: [],
  });
  useEffect(() => {
    if (!liveHint) return;
    const s = hintSectionsRef.current;
    const addAll = (bucket: string[], items?: string[]) => {
      (items || []).forEach((raw) => {
        const item = String(raw).trim();
        if (!item) return;
        const key = item.toLowerCase();
        if (hintLinesRef.current.has(key)) return;
        hintLinesRef.current.add(key);
        bucket.push(item);
      });
    };

    if (liveHint.suggestion?.trim()) hintImpressionRef.current = liveHint.suggestion.trim();
    addAll(
      s.alerts,
      (liveHint.alerts || []).map(
        (a) => `[${a.severity === "critical" ? "CRITICAL" : a.severity === "caution" ? "CAUTION" : "NOTE"}] ${a.message}`,
      ),
    );
    addAll(s.alerts, (liveHint.red_flags || []).map((r) => `[CAUTION] Rule out: ${r}`));
    addAll(s.differentials, liveHint.differentials);
    addAll(s.investigations, liveHint.suggested_investigations);

    const composed = [
      hintImpressionRef.current ? `WORKING IMPRESSION\n${hintImpressionRef.current}` : null,
      s.alerts.length ? `SAFETY CHECKS\n${s.alerts.map((a) => `• ${a}`).join("\n")}` : null,
      s.differentials.length ? `DIFFERENTIALS\n${s.differentials.map((d) => `• ${d}`).join("\n")}` : null,
      s.investigations.length ? `SUGGESTED CHECKS\n${s.investigations.map((i) => `• ${i}`).join("\n")}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    if (composed) setNotes(composed);
  }, [liveHint]);


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

  const sendDeliveryDocument = async (target: { documentId: string | null; recipientEmail?: string | null }) => {
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
    // Guard against double-invocation (e.g. a stray duplicate click/effect)
    // firing the About/AI-Consult prompts twice.
    if (sessionState === "active" || showAboutRecordingDialog || showAiConsultPrompt) return;
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
    hintImpressionRef.current = "";
    hintLinesRef.current.clear();
    hintSectionsRef.current = { alerts: [], differentials: [], investigations: [] };
    sessionStartTimeRef.current = new Date();
    savedAudioUrlRef.current = null;
    completionRanRef.current = false;

    // Give immediate feedback — the mic permission / setup gap is otherwise silent.
    setIsPreparingSession(true);
    setPreparingMessage("Setting up your session...");
    setTimeout(() => setPreparingMessage("Requesting microphone access..."), 400);
    // Safety net — if mic access fails/is denied, don't leave the UI stuck "preparing".
    setTimeout(() => setIsPreparingSession(false), 8000);

    // Recording only actually starts once the doctor has acknowledged the
    // About the Session Recording notice and answered the AI Consult prompt.
    setShowAboutRecordingDialog(true);
  };

  const handleAboutRecordingAck = () => {
    setShowAboutRecordingDialog(false);
    setShowAiConsultPrompt(true);
  };

  const handleAiConsultChoice = (enabled: boolean) => {
    setAiConsultEnabled(enabled);
    setShowAiConsultPrompt(false);
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

      {/* Session start prompts — a SINGLE Dialog root that swaps its content between the
          two steps (Session Recordings notice, then AI Consult opt-in). Using one Dialog
          instead of two separate ones avoids Radix briefly double-mounting a dialog while
          one closes and the other opens, which read as "the AI Consult box popping up
          twice". Dismissible only via the buttons shown, never Escape/outside-click. */}
      <Dialog open={showAboutRecordingDialog || showAiConsultPrompt} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {showAboutRecordingDialog ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-success shrink-0" />
                  Session Recordings
                </DialogTitle>
                <DialogDescription className="text-base">
                  This session recording is only shared between you and your patient. It's
                  automatically deleted from our servers within 7 days — download it beforehand
                  if either of you wants to keep a copy.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={handleAboutRecordingAck}>Got it</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Run AI Consult in parallel?</DialogTitle>
                <DialogDescription className="text-base">
                  The AI Clinician can analyse the conversation as it happens and surface
                  differentials, red flags, and suggestions while you record. Would you like to
                  run it alongside this session?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleAiConsultChoice(false)}>Not this time</Button>
                <Button onClick={() => handleAiConsultChoice(true)}>Yes, run AI Consult</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Documents Generated — single summary dialog with View → Edit/Send/Save per document */}
      <GeneratedDocumentsDialog
        open={showGeneratedDocsDialog}
        openDocKey={previewDocKey}
        onOpenChange={(next) => {
          setShowGeneratedDocsDialog(next);
          if (!next) setPreviewDocKey(null);
        }}
        documents={generatedDocs}
        onSend={async (doc) => {
          const ok = await sendDeliveryDocument({ documentId: doc.documentId, recipientEmail: doc.recipientEmail });
          if (ok) {
            await completeSessionTodo(doc.label);
            setGeneratedDocs((prev) => prev.map((d) => (d.key === doc.key ? { ...d, sent: true } : d)));
            toast({ title: 'Sent', description: `${doc.label} emailed to ${doc.recipientName || 'the patient'}.` });
          }
        }}
        onSaveEdit={async (doc, newContent) => {
          if (doc.documentId) {
            await supabase.from('documents').update({ content: newContent } as any).eq('id', doc.documentId);
          }
          setGeneratedDocs((prev) => prev.map((d) => (d.key === doc.key ? { ...d, content: newContent } : d)));
          toast({ title: 'Saved' });
        }}
        onContinue={() => {
          setShowGeneratedDocsDialog(false);
        }}
      />

      {/* Sequential post-session flow — one step at a time: generated documents,
          then schedule follow-up, then invoice, then Award Vula. */}
      {showPostSessionFlow && postSessionQueue.length > 0 && (
        <PostSessionStepDialog
          queue={postSessionQueue}
          index={postSessionIndex}
          documents={generatedDocs}
          onSend={async (doc) => {
            const ok = await sendDeliveryDocument({ documentId: doc.documentId, recipientEmail: doc.recipientEmail });
            if (ok) {
              await completeSessionTodo(doc.label);
              setGeneratedDocs((prev) => prev.map((d) => (d.key === doc.key ? { ...d, sent: true } : d)));
            }
          }}
          onSaveEdit={async (doc, newContent) => {
            if (doc.documentId) {
              await supabase.from('documents').update({ content: newContent } as any).eq('id', doc.documentId);
            }
            setGeneratedDocs((prev) => prev.map((d) => (d.key === doc.key ? { ...d, content: newContent } : d)));
          }}
          onAdvance={advancePostSession}
          onFinish={() => setShowPostSessionFlow(false)}
          currentPatient={currentPatient ? { id: currentPatient.id, name: currentPatient.name, patient_user_id: (currentPatient as any).patient_user_id || null } : null}
          doctorId={doctorIdRef.current}
          doctorName={doctorName}
          extractedFollowUp={extractedFollowUp}
          patientName={currentPatient?.name}
          transcript={pendingTranscript}
          onVulaConfirm={handleVisitCategoryConfirm}
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
      {sessionState === "idle" && isAutoStarting && (
        // Arriving from a patient's profile "Start Session" link — never show the
        // patient-selector widget, it's confusing when a patient is already chosen.
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent mb-3">
            <Loader2 className="h-6 w-6 text-accent-foreground animate-spin" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Starting session...</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            {currentPatient?.name ? `Getting ready to record for ${currentPatient.name}.` : "Loading patient details..."}
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

          {/* Past Sessions — quick recap of this patient's previous consultations. */}
          {currentPatient && (
            <div className="mt-6 w-full max-w-2xl text-left rounded-xl border border-primary bg-card shadow-sm overflow-hidden">
              <div className="px-3 py-2 border-b bg-primary/5">
                <h3 className="text-sm font-semibold text-foreground">Past Sessions</h3>
              </div>
              <div className="divide-y divide-border">
                {pastPatientSessions.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">No previous sessions</p>
                ) : (
                  pastPatientSessions.map((s: any) => (
                    <div key={s.id} className="p-3 hover:bg-muted/50 transition-colors">
                      <button
                        onClick={() => navigate(`/sessions/${s.id}`)}
                        className="text-xs font-bold text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        {s.date}
                      </button>
                      <p className="text-sm text-foreground leading-relaxed">
                        {renderClinicalHighlights(String(s.summary || "No summary"))}
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

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
          {/* Record Session — column 1, full height (rows 1-3) */}
          <div className="rounded-xl border border-primary bg-card shadow-sm flex flex-col order-1 lg:min-h-[700px]">
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
                      ? (isPaused ? "Paused — tap play to resume" : "Recording... Tap to stop")
                      : "Tap to record"}
              </p>
              <p className="text-xs text-muted-foreground/60 text-center mt-1 px-2 leading-snug">
                🔒 Only shared between you and the patient — auto-deleted from our servers within 7 days. Download it beforehand to keep a copy.
              </p>

              {/* Compact Waveform */}
              {(isRecording || isTranscribing) && (
                <div className="w-full">
                  <AudioWaveform isRecording={isRecording && !isPaused} />
                </div>
              )}
            </div>

            {/* Transcript — collapsed accordion, only once transcription has finished.
                Nothing is streamed on screen while recording (the waveform above shows progress). */}
            <SessionTranscriptAccordion transcript={transcript} doctorName={doctorName} />


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

          {/* Column 2 — Patient Overview (DISC at top), Live AI Clinician, then AI Clinician Notes. */}
          <div className="flex flex-col gap-4 order-2">
            {/* Patient Overview — AI recap of the last 6 months with DISC descriptors on top. */}
            <div className="min-h-[210px] flex flex-col">
              <SessionPatientOverview
                patient={currentPatient}
                currentMedications={currentMedications}
                discSlot={<SessionDiscStrip patientId={currentPatient?.id} inline />}
              />
            </div>

            {/* Live AI Clinician — sits directly above the AI Clinician Notes frame. */}
            {isRecording && aiConsultEnabled && (liveHint || liveHintLoading) && (
              <div className="rounded-xl border border-primary bg-primary/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <p className="text-sm font-medium text-primary-dark">Live AI Clinician</p>
                  </div>
                  {liveHintLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </div>

                {/* Safety alerts first — this is what the doctor must see before prescribing */}
                {liveHint?.alerts && liveHint.alerts.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {liveHint.alerts.map((a, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-start gap-1.5 rounded-md border px-2 py-1.5",
                          a.severity === "critical"
                            ? "border-destructive/40 bg-destructive/10"
                            : a.severity === "caution"
                              ? "border-warning/40 bg-warning/10"
                              : "border-border bg-muted/40",
                        )}
                      >
                        <ShieldAlert
                          className={cn(
                            "h-3.5 w-3.5 mt-0.5 shrink-0",
                            a.severity === "critical"
                              ? "text-destructive"
                              : a.severity === "caution"
                                ? "text-warning"
                                : "text-muted-foreground",
                          )}
                        />
                        <p
                          className={cn(
                            "text-sm leading-relaxed",
                            a.severity === "critical" ? "text-destructive font-medium" : "text-foreground",
                          )}
                        >
                          {a.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {liveHint?.suggestion && (
                    <p className="text-sm text-foreground leading-relaxed">{liveHint.suggestion}</p>
                  )}
                  {liveHint?.differentials && liveHint.differentials.length > 0 && (
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-bold">Consider:</span> {liveHint.differentials.join(" · ")}
                    </p>
                  )}
                  {liveHint?.red_flags && liveHint.red_flags.length > 0 && (
                    <p className="text-sm text-destructive leading-relaxed">
                      <span className="font-bold">Rule out:</span> {liveHint.red_flags.join(" · ")}
                    </p>
                  )}
                  {liveHint?.suggested_investigations && liveHint.suggested_investigations.length > 0 && (
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-bold">Checks:</span> {liveHint.suggested_investigations.join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            )}

            <Tabs defaultValue="notes">
              <TabsList className="mb-2">
                <TabsTrigger value="notes" className="gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  AI Clinician Notes
                </TabsTrigger>
                <TabsTrigger value="personal" className="gap-1.5 text-xs">
                  <Lock className="h-3.5 w-3.5" />
                  Personal Notes
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
                  disclaimer={
                    <p className="text-xs text-muted-foreground leading-snug">
                      <span className="font-semibold text-foreground">
                        Private — not shared with the patient and only available for the duration of the session.
                      </span>{" "}
                      Disclaimer: AI-generated clinical notes are decision support only. They may be incomplete or
                      inaccurate and must be reviewed and confirmed by the treating clinician before any clinical use.
                    </p>
                  }
                />
              </TabsContent>

              <TabsContent value="personal" className="mt-0">
                <div className="rounded-xl border border-primary bg-card shadow-sm p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold text-foreground">Personal Notes</p>
                    <span className="text-[10px] text-muted-foreground">Private</span>
                  </div>
                  <Textarea
                    value={personalNotes}
                    onChange={(e) => setPersonalNotes(e.target.value)}
                    placeholder="Jot down private thoughts for yourself..."
                    className="min-h-[220px] resize-y text-sm p-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="drawing" className="mt-0">
                <DrawingPad
                  patientId={patientId || ""}
                  sessionId={currentSessionId || undefined}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        </>
      )}

      {sessionState === "completed" && (
        <div className="space-y-6 mt-6">


          {/* Documents from this session — inline preview cards (dialog still available). */}
          <SessionGeneratedDocuments
            documents={generatedDocs}
            onPreview={(doc) => {
              setPreviewDocKey(doc.key);
              setShowGeneratedDocsDialog(true);
            }}
            onSend={async (doc) => {
              const ok = await sendDeliveryDocument({ documentId: doc.documentId, recipientEmail: doc.recipientEmail });
              if (ok) {
                await completeSessionTodo(doc.label);
                setGeneratedDocs((prev) => prev.map((d) => (d.key === doc.key ? { ...d, sent: true } : d)));
                toast({ title: 'Sent', description: `${doc.label} emailed to ${doc.recipientName || 'the patient'}.` });
              }
            }}
            onSaveForReview={(doc) => {
              toast({
                title: 'Saved for review',
                description: `${doc.label} is saved to the patient's documents for later review.`,
              });
            }}
          />

          {/* Shared results layout — identical to opening a past session */}
          <SessionResultPanels
            summary={summary}
            audioUrl={audioUrl}
            actionPoints={actionPoints}
            clinicianNotes={showTranslated && translatedDiagnosis ? translatedDiagnosis : aiDiagnosis}
            clinicianActions={
              <div className="flex items-center gap-2">
                {isGeneratingDiagnosis && (
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </span>
                )}
                {aiDiagnosis && doctorLanguage !== 'English' && (
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
                {aiDiagnosis && (
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
                )}
              </div>
            }
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
