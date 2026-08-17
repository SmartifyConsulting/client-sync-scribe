import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Clock,
  Sparkles,
  CheckCircle,
  Circle,
  User,
  Loader2,
  Trash2,
  Volume2,
  Pill,
  Receipt,
  FileText,
  FileBadge,
  FileEdit,
  PenTool,
  Hospital,
  Languages,
  Download,
  Eye,
  AlertTriangle,
  Edit3,
  Send,
  Lock,
  ChevronDown,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { HospitalAdmissionEditor } from "@/components/sessions/HospitalAdmissionEditor";
import { PrescriptionEditor } from "@/components/sessions/PrescriptionEditor";
import { InvoiceEditor } from "@/components/sessions/InvoiceEditor";
import { MedicalCertificateEditor } from "@/components/sessions/MedicalCertificateEditor";
import { ReferralLetterEditor } from "@/components/sessions/ReferralLetterEditor";
import { GeneralLetterEditor } from "@/components/sessions/GeneralLetterEditor";
import { DrawingPad } from "@/components/drawings/DrawingPad";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/useSessions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSessions } from "@/hooks/useSessions";
import { DocumentPreviewWithLetterhead } from "@/features/documents/components/DocumentPreviewWithLetterhead";

import { SessionResultPanels, AISummaryCard } from "@/features/sessions/components/SessionResultPanels";
import { SessionPatientOverview } from "@/features/sessions/components/SessionPatientOverview";
import { SessionDiscStrip } from "@/features/sessions/components/SessionDiscStrip";
import { ClinicianNotesAccordion } from "@/features/sessions/components/ClinicianNotesAccordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsAdmin } from "@/hooks/useIsAdmin";

import { PrivacyBadge } from "@/components/permissions/PrivacyBadge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logProfileView } from "@/lib/logProfileView";
import { getSignedAudioUrl } from "@/utils/audioUrl";

const LANGUAGES = [
  { code: "en", label: "English" }, { code: "af", label: "Afrikaans" }, { code: "zu", label: "Zulu" },
  { code: "xh", label: "Xhosa" }, { code: "st", label: "Sesotho" }, { code: "tn", label: "Setswana" },
  { code: "ts", label: "Tsonga" }, { code: "ss", label: "Swati" }, { code: "ve", label: "Venda" },
  { code: "nr", label: "Ndebele" }, { code: "nso", label: "Sepedi" }, { code: "fr", label: "French" },
  { code: "de", label: "German" }, { code: "es", label: "Spanish" }, { code: "pt", label: "Portuguese" },
  { code: "it", label: "Italian" }, { code: "nl", label: "Dutch" }, { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" }, { code: "zh", label: "Chinese" }, { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" }, { code: "ru", label: "Russian" }, { code: "sw", label: "Swahili" },
  { code: "yo", label: "Yoruba" }, { code: "ig", label: "Igbo" }, { code: "ha", label: "Hausa" },
  { code: "am", label: "Amharic" },
];

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, loading, refetch } = useSession(id || "");
  const { deleteSession } = useSessions();
  const { isAdmin } = useIsAdmin();
  const [showPrescriptionEditor, setShowPrescriptionEditor] = useState(false);
  const [showInvoiceEditor, setShowInvoiceEditor] = useState(false);
  const [showMedicalCertificateEditor, setShowMedicalCertificateEditor] = useState(false);
  const [showReferralLetterEditor, setShowReferralLetterEditor] = useState(false);
  const [showGeneralLetterEditor, setShowGeneralLetterEditor] = useState(false);
  const [showDrawingPad, setShowDrawingPad] = useState(false);
  const [showHospitalAdmissionEditor, setShowHospitalAdmissionEditor] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [sessionDocs, setSessionDocs] = useState<any[]>([]);
  const [sendingDocId, setSendingDocId] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string>("");
  const [signedAudioUrl, setSignedAudioUrl] = useState<string | null>(null);
  const [editingPrivateNotes, setEditingPrivateNotes] = useState(false);
  const [privateNotesDraft, setPrivateNotesDraft] = useState("");
  const [savingPrivateNotes, setSavingPrivateNotes] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [currentMedications, setCurrentMedications] = useState<Array<{ medication: string; dosage: string; frequency: string }>>([]);


  // Fetch doctor name
  useEffect(() => {
    if (!session?.user_id) return;
    supabase.from('profiles').select('full_name').eq('id', session.user_id).maybeSingle()
      .then(({ data }) => { if (data?.full_name) setDoctorName(data.full_name); });
  }, [session?.user_id]);

  // Log this record view for the patient's "My Views" list
  useEffect(() => {
    if (!session?.patient_id) return;
    logProfileView(session.patient_id, "Session Detail");
  }, [session?.patient_id]);

  // Resolve signed audio URL
  useEffect(() => {
    if (!session?.audio_url) { setSignedAudioUrl(null); return; }
    getSignedAudioUrl(session.audio_url).then(url => setSignedAudioUrl(url));
  }, [session?.audio_url]);

  useEffect(() => {
    if (!session?.patient_id) return;
    supabase
      .from("prescriptions")
      .select("medication, dosage, frequency")
      .eq("patient_id", session.patient_id)
      .eq("status", "active")
      .then(({ data }) => setCurrentMedications(data || []));
  }, [session?.patient_id]);

  // Fetch session documents
  useEffect(() => {
    if (!id) return;
    const fetchDocs = async () => {
      const { data } = await (supabase
        .from('documents')
        .select('*') as any)
        .eq('session_id', id)
        .order('created_at', { ascending: false });
      setSessionDocs(data || []);
    };
    fetchDocs();
  }, [id]);

  const handleSendDocument = async (doc: any) => {
    setSendingDocId(doc.id);
    try {
      // Get patient email for sending
      const { data: patient } = await supabase
        .from('patients')
        .select('email, pharmacy_email, name')
        .eq('id', doc.patient_id)
        .maybeSingle();
      
      const recipientEmail = doc.template_name?.toLowerCase().includes('prescription')
        ? patient?.pharmacy_email || patient?.email
        : patient?.email;

      if (recipientEmail) {
        await supabase.functions.invoke('send-document-email', {
          body: { documentId: doc.id, recipientEmail },
        });
      }

      // Update document status
      await (supabase.from('documents').update({ 
        email_sent_at: new Date().toISOString(),
        is_draft: false,
      } as any) as any).eq('id', doc.id);

      // Mark corresponding todo as completed
      await (supabase.from('todos')
        .update({ status: 'completed', completed_at: new Date().toISOString() }) as any)
        .eq('document_id', doc.id);

      setSessionDocs(prev => prev.map(d => 
        d.id === doc.id ? { ...d, email_sent_at: new Date().toISOString(), is_draft: false } : d
      ));
      toast({ title: "Document sent", description: `${doc.name} has been sent successfully.` });
    } catch (err) {
      toast({ title: "Send failed", variant: "destructive" });
    } finally {
      setSendingDocId(null);
    }
  };


  const handleTranslate = async (langCode: string) => {
    if (!session?.summary || !langCode) return;
    const lang = LANGUAGES.find(l => l.code === langCode);
    if (!lang) return;
    
    setIsTranslating(true);
    setSelectedLanguage(langCode);
    try {
      const { data, error } = await supabase.functions.invoke('summarize-session', {
        body: {
          action: 'translate',
          text: session.summary,
          targetLanguage: lang.label,
        },
      });
      if (error) throw error;
      setTranslatedSummary(data?.translatedText || data?.summary || session.summary);
    } catch (err) {
      console.error('Translation error:', err);
      toast({ title: "Translation failed", description: "Could not translate the summary", variant: "destructive" });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDownloadAudio = async () => {
    if (!session?.audio_url) return;
    const url = signedAudioUrl || await getSignedAudioUrl(session.audio_url);
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-recording-${format(new Date(session.started_at), 'yyyy-MM-dd')}.webm`;
    link.click();
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteSession(id);
    toast({
      title: "Session deleted",
      description: "The session has been removed.",
    });
    navigate(-1);
  };

  const handleSavePrivateNotes = async () => {
    if (!id) return;
    setSavingPrivateNotes(true);
    try {
      const { error } = await (supabase
        .from('sessions')
        .update({ private_notes: privateNotesDraft } as any) as any)
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Private notes saved" });
      setEditingPrivateNotes(false);
      refetch();
    } catch (err: any) {
      toast({ title: "Failed to save notes", description: err?.message, variant: "destructive" });
    } finally {
      setSavingPrivateNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="rounded-xl border border-primary bg-card p-8 text-center">
          <p className="text-muted-foreground">Session not found</p>
        </div>
      </div>
    );
  }

  const audioActionsMenu = (
    <Select
      onValueChange={(value) => {
        if (value === "audio") handleDownloadAudio();
        else if (value === "transcript" && session.transcript) {
          const blob = new Blob([session.transcript], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `transcript-${format(new Date(session.started_at), "yyyy-MM-dd")}.txt`;
          link.click();
          URL.revokeObjectURL(url);
        }
      }}
    >
      <SelectTrigger className="w-[160px] h-8 text-sm">
        <Download className="h-3.5 w-3.5 mr-1.5" />
        <SelectValue placeholder="Download..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="audio" disabled={!session.audio_url} className="text-sm">
          Download audio
        </SelectItem>
        <SelectItem value="transcript" disabled={!session.transcript} className="text-sm">
          Download transcript
        </SelectItem>
      </SelectContent>
    </Select>
  );

  const summaryActionsMenu = (
    <>
      {isTranslating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      <Select value={selectedLanguage} onValueChange={handleTranslate}>
        <SelectTrigger className="w-[150px] h-8 text-xs">
          <Languages className="h-3.5 w-3.5 mr-1.5" />
          <SelectValue placeholder="Translate..." />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code} className="text-sm">
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {translatedSummary && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-8"
          onClick={() => {
            setTranslatedSummary(null);
            setSelectedLanguage("");
          }}
        >
          Original
        </Button>
      )}
    </>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      {session.patient ? (
        <Link
          to={`/patients/${session.patient_id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {session.patient.name}
        </Link>
      ) : (
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <Clock className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Session - {format(new Date(session.started_at), "MMMM d, yyyy")}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>{format(new Date(session.started_at), "h:mm a")}</span>
              {session.duration_minutes && (
                <span>· {session.duration_minutes} minutes</span>
              )}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  session.status === "completed"
                    ? "bg-green-500/15 text-green-700 dark:text-green-400"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                }`}
              >
                {session.status === "completed" ? "Completed" : "In Progress"}
              </span>
              <PrivacyBadge />
            </div>
            {session.patient && (
              <Link
                to={`/patients/${session.patient_id}`}
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <User className="h-4 w-4" />
                {session.patient.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">

          {isAdmin ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Session</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the session record.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Session records are permanent and can only be removed by a system administrator.
            </p>
          )}
        </div>
      </div>


      {/* Quick Actions — brand teal dropdown, right-aligned directly above Patient Overview */}
      {session.status === "completed" && session.patient && (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-between gap-2 rounded-md border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Quick Actions
                <ChevronDown className="h-4 w-4 opacity-80" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={() => setShowPrescriptionEditor(true)}><Pill className="mr-2 h-4 w-4" />Prescription</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShowInvoiceEditor(true)}><Receipt className="mr-2 h-4 w-4" />Invoice</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShowMedicalCertificateEditor(true)}><FileBadge className="mr-2 h-4 w-4" />Medical Certificate</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShowReferralLetterEditor(true)}><FileText className="mr-2 h-4 w-4" />Referral Letter</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShowGeneralLetterEditor(true)}><FileEdit className="mr-2 h-4 w-4" />General Letter</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShowDrawingPad(true)}><PenTool className="mr-2 h-4 w-4" />Drawing Pad</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShowHospitalAdmissionEditor(true)}><Hospital className="mr-2 h-4 w-4" />Hospital Admission</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Same frame arrangement as the live recording screen:
          recorder frame top-left, AI Clinician Notes beneath it,
          Patient Overview as the wide band alongside. */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4 items-start">

        <div className="rounded-xl border border-primary bg-card shadow-sm overflow-hidden lg:col-start-1 lg:row-start-1">
          <div className="flex items-center gap-3 border-b p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent shrink-0">
              <User className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{session.patient?.name || "Recorded Session"}</p>
              <p className="text-xs text-muted-foreground">{session.duration_minutes || 0} minutes</p>
            </div>
          </div>
          <div className="p-4">
            <p className="mb-3 text-xs text-muted-foreground">{format(new Date(session.started_at), "MMM d, yyyy · h:mm a")}</p>
            <AISummaryCard
              summary={translatedSummary || session.summary}
              audioUrl={signedAudioUrl}
              audioActions={audioActionsMenu}
              summaryActions={summaryActionsMenu}
              showRetentionNotice={!!(session.audio_url || session.transcript)}
            />
          </div>
        </div>
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          <SessionPatientOverview
            patient={session.patient}
            currentMedications={currentMedications}
            discSlot={<SessionDiscStrip patientId={session.patient?.id} inline />}
          />
        </div>
      </div>

      {/* AI Clinician Notes — full-width band, same placement as the live "Live AI Clinician" frame */}
      <div className="rounded-xl border border-primary bg-primary/5 p-4">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">AI Clinician Notes</h2>
        </div>
        <p className="mt-1 mb-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Private — Only visible to you. Not shared with the patient or other doctors.</span>{" "}
          AI-generated clinical notes are decision support only and must be reviewed by the treating clinician.
        </p>
        <ClinicianNotesAccordion notes={session.ai_diagnosis || session.notes} />
      </div>


      {/* Session results — same layout as the screen shown right after a recording ends.
          AI Summary now lives in the top-left card above; this slot instead shows
          Private Notes alongside Action Points. */}
      <SessionResultPanels
        transcript={session.transcript}
        doctorName={doctorName}
        sessionId={session.id}
        hideSummary
        leftSlot={
          <div className="rounded-xl border border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/10 p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-600" />
                <h3 className="font-semibold text-sm text-foreground">Private Notes</h3>
              </div>
              <div className="flex items-center gap-2">
                {!editingPrivateNotes ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setPrivateNotesDraft((session as any).private_notes || "");
                      setEditingPrivateNotes(true);
                    }}
                  >
                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      disabled={savingPrivateNotes}
                      onClick={() => { setEditingPrivateNotes(false); setPrivateNotesDraft(""); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-7"
                      disabled={savingPrivateNotes}
                      onClick={handleSavePrivateNotes}
                    >
                      {savingPrivateNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">Only visible to you. Not shared with the patient or other doctors.</p>
            <div className="max-h-[150px] overflow-y-auto">
              {editingPrivateNotes ? (
                <Textarea
                  value={privateNotesDraft}
                  onChange={(e) => setPrivateNotesDraft(e.target.value)}
                  placeholder="Write notes only you can see…"
                  className="text-sm min-h-[120px]"
                />
              ) : (session as any).private_notes ? (
                <p className="text-sm whitespace-pre-wrap text-foreground">{(session as any).private_notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No private notes yet — click Edit to add notes only you can see.</p>
              )}
            </div>
          </div>
        }
        actionPoints={session.action_points || []}
        clinicianNotes={null}
        sessionDate={session.started_at}
        showTodoHint={false}
      />

      {/* Session Documents */}
      {sessionDocs.length > 0 && (
        <div className="rounded-xl border border-primary bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Session Documents</h2>
              <p className="text-xs text-muted-foreground">Auto-generated documents from this session</p>
            </div>
          </div>
          <div className="space-y-1">
            {sessionDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30">
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="flex-1 text-xs font-semibold text-foreground truncate">{doc.name}</span>
                {doc.is_draft && !doc.email_sent_at && (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
                    DRAFT
                  </Badge>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  title="Preview"
                  onClick={() => setPreviewDoc(doc)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  title="Edit"
                  onClick={() => navigate(`/documents?edit=${doc.id}`)}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-6 w-6 ${doc.email_sent_at ? 'text-muted-foreground' : 'text-green-600 hover:text-green-700'}`}
                  disabled={!!doc.email_sent_at || sendingDocId === doc.id}
                  onClick={() => handleSendDocument(doc)}
                >
                  {sendingDocId === doc.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Empty State */}
      {!session.summary && !session.transcript && (!session.action_points || session.action_points.length === 0) && (
        <div className="rounded-xl border border-primary bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No content recorded for this session yet.</p>
        </div>
      )}

      {previewDoc && (
        <DocumentPreviewWithLetterhead document={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

      {/* Prescription Editor Modal */}

      {showPrescriptionEditor && session.patient && (
        <PrescriptionEditor
          patientId={session.patient_id}
          patientName={session.patient.name}
          onClose={() => setShowPrescriptionEditor(false)}
          onSave={(prescription) => {
            toast({
              title: "Prescription created",
              description: "The prescription has been saved successfully.",
            });
          }}
        />
      )}

      {/* Invoice Editor Modal */}
      {showInvoiceEditor && session.patient && (
        <InvoiceEditor
          patientId={session.patient_id}
          patientName={session.patient.name}
          sessionId={id}
          onClose={() => setShowInvoiceEditor(false)}
          onSave={(invoice) => {
            toast({
              title: "Invoice created",
              description: `Invoice #${invoice.invoice_number} has been created.`,
            });
          }}
        />
      )}

      {/* Medical Certificate Editor Modal */}
      {showMedicalCertificateEditor && session.patient && (
        <MedicalCertificateEditor
          patientId={session.patient_id}
          patientName={session.patient.name}
          sessionId={id}
          onClose={() => setShowMedicalCertificateEditor(false)}
          onSave={() => {
            toast({
              title: "Medical Certificate created",
              description: "The medical certificate has been saved.",
            });
          }}
        />
      )}

      {/* Referral Letter Editor Modal */}
      {showReferralLetterEditor && session.patient && (
        <ReferralLetterEditor
          patientId={session.patient_id}
          patientName={session.patient.name}
          sessionId={id}
          onClose={() => setShowReferralLetterEditor(false)}
          onSave={() => {
            toast({
              title: "Referral Letter created",
              description: "The referral letter has been saved.",
            });
          }}
        />
      )}

      {/* General Letter Editor Modal */}
      {showGeneralLetterEditor && session.patient && (
        <GeneralLetterEditor
          patientId={session.patient_id}
          patientName={session.patient.name}
          sessionId={id}
          onClose={() => setShowGeneralLetterEditor(false)}
          onSave={() => {
            toast({
              title: "General Letter created",
              description: "The letter has been saved.",
            });
          }}
        />
      )}

      {/* Hospital Admission Editor Modal */}
      {showHospitalAdmissionEditor && session.patient && (
        <HospitalAdmissionEditor
          patientId={session.patient_id}
          patientName={session.patient.name}
          sessionId={id}
          onClose={() => setShowHospitalAdmissionEditor(false)}
          onSave={() => {
            toast({
              title: "Hospital Admission Form created",
              description: "The form has been saved.",
            });
          }}
        />
      )}

      {/* Drawing Pad Modal */}
      <Dialog open={showDrawingPad} onOpenChange={setShowDrawingPad}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] h-[85vh] p-0">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              Drawing Pad - {session.patient?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden h-full">
            <DrawingPad
              patientId={session.patient_id}
              sessionId={id}
              patientName={session.patient?.name}
              isModal
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
