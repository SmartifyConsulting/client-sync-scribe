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
  AlertTriangle,
  Edit3,
  Send,
  Lock,
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
import { SessionResultPanels } from "@/features/sessions/components/SessionResultPanels";
import { useIsAdmin } from "@/hooks/useIsAdmin";

import { PrivacyBadge } from "@/components/permissions/PrivacyBadge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

  // Fetch doctor name
  useEffect(() => {
    if (!session?.user_id) return;
    supabase.from('profiles').select('full_name').eq('id', session.user_id).maybeSingle()
      .then(({ data }) => { if (data?.full_name) setDoctorName(data.full_name); });
  }, [session?.user_id]);

  // Resolve signed audio URL
  useEffect(() => {
    if (!session?.audio_url) { setSignedAudioUrl(null); return; }
    getSignedAudioUrl(session.audio_url).then(url => setSignedAudioUrl(url));
  }, [session?.audio_url]);

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


      {/* Quick Actions */}
      {session.status === "completed" && session.patient && (
        <div className="rounded-xl border border-primary bg-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            <Button
              className="gap-1.5 text-sm h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowPrescriptionEditor(true)}
            >
              <Pill className="h-4 w-4 shrink-0" />
              <span className="truncate">Prescription</span>
            </Button>
            <Button
              className="gap-1.5 text-sm h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowInvoiceEditor(true)}
            >
              <Receipt className="h-4 w-4 shrink-0" />
              <span className="truncate">Invoice</span>
            </Button>
            <Button
              className="gap-1.5 text-sm h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowMedicalCertificateEditor(true)}
            >
              <FileBadge className="h-4 w-4 shrink-0" />
              <span className="truncate">Medical Certificate</span>
            </Button>
            <Button
              className="gap-1.5 text-sm h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowReferralLetterEditor(true)}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">Referral Letter</span>
            </Button>
            <Button
              className="gap-1.5 text-sm h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowGeneralLetterEditor(true)}
            >
              <FileEdit className="h-4 w-4 shrink-0" />
              <span className="truncate">General Letter</span>
            </Button>
            <Button
              className="gap-1.5 text-sm h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowDrawingPad(true)}
            >
              <PenTool className="h-4 w-4 shrink-0" />
              <span className="truncate">Drawing Pad</span>
            </Button>
            <Button
              className="gap-1.5 text-sm h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowHospitalAdmissionEditor(true)}
            >
              <Hospital className="h-4 w-4 shrink-0" />
              <span className="truncate">Hospital Admission</span>
            </Button>
          </div>
        </div>
      )}

      {/* Session results — same layout as the screen shown right after a recording ends */}
      <SessionResultPanels
        transcript={session.transcript}
        doctorName={doctorName}
        summary={translatedSummary || session.summary}
        audioUrl={signedAudioUrl}
        audioActions={
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
        }
        actionPoints={session.action_points || []}
        clinicianNotes={(session as any).ai_diagnosis}
        showTodoHint={false}
        summaryActions={
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
        }
      />

      {/* Retention notice — downloads now sit directly under the audio player */}
      {(session.audio_url || session.transcript) && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Volume2 className="h-3.5 w-3.5 text-primary" />
          Voice recordings and transcriptions are automatically deleted after 7 days. AI summaries remain
          permanently.
        </p>
      )}

      {/* Manual session notes */}
      {session.notes && (
        <div className="rounded-xl border border-primary bg-card p-4">
          <p className="text-sm font-semibold text-foreground mb-2">Notes</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{session.notes}</p>
        </div>
      )}

      {/* Private Notes — doctor-only */}
      <div className="rounded-xl border border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
              <Lock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Private Notes</h2>
              <p className="text-sm text-muted-foreground">Only visible to you. Not shared with the patient or other doctors.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editingPrivateNotes ? (
              <Button
                variant="outline"
                size="sm"
                className="text-sm h-8"
                onClick={() => {
                  setPrivateNotesDraft((session as any).private_notes || "");
                  setEditingPrivateNotes(true);
                }}
              >
                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm h-8"
                  disabled={savingPrivateNotes}
                  onClick={() => { setEditingPrivateNotes(false); setPrivateNotesDraft(""); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="text-sm h-8"
                  disabled={savingPrivateNotes}
                  onClick={handleSavePrivateNotes}
                >
                  {savingPrivateNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                </Button>
              </>
            )}
          </div>
        </div>
        {editingPrivateNotes ? (
          <Textarea
            value={privateNotesDraft}
            onChange={(e) => setPrivateNotesDraft(e.target.value)}
            placeholder="Write notes only you can see…"
            className="text-sm min-h-[140px]"
          />
        ) : (session as any).private_notes ? (
          <p className="text-sm whitespace-pre-wrap text-foreground">{(session as any).private_notes}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No private notes yet — click Edit to add notes only you can see.</p>
        )}
      </div>

      {/* Session Documents */}
      {sessionDocs.length > 0 && (
        <div className="rounded-xl border border-primary bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Session Documents</h2>
              <p className="text-sm text-muted-foreground">Auto-generated documents from this session</p>
            </div>
          </div>
          <div className="space-y-2">
            {sessionDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="flex-1 text-sm font-semibold text-foreground truncate">{doc.name}</span>
                {doc.is_draft && !doc.email_sent_at && (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
                    DRAFT
                  </Badge>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => navigate(`/documents?view=${doc.id}`)}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-7 w-7 ${doc.email_sent_at ? 'text-muted-foreground' : 'text-green-600 hover:text-green-700'}`}
                  disabled={!!doc.email_sent_at || sendingDocId === doc.id}
                  onClick={() => handleSendDocument(doc)}
                >
                  {sendingDocId === doc.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
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
