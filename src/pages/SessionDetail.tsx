import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, loading, refetch } = useSession(id || "");
  const { deleteSession } = useSessions();
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
      toast({ title: t('sessions.documentSent'), description: t('sessions.documentSentMessage', { name: doc.name }) });
    } catch (err) {
      toast({ title: t('sessions.sendFailed'), variant: "destructive" });
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
      toast({ title: t('sessions.translationFailed'), description: t('sessions.translationError'), variant: "destructive" });
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
      title: t('sessions.sessionDeleted'),
      description: t('sessions.sessionRemovedMessage'),
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
      toast({ title: t('sessions.privateNotesSaved') });
      setEditingPrivateNotes(false);
      refetch();
    } catch (err: any) {
      toast({ title: t('sessions.saveNotesFailed'), description: err?.message, variant: "destructive" });
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
          {t('common.back')}
        </button>
        <div className="rounded-xl border border-primary bg-card p-8 text-center">
          <p className="text-muted-foreground">{t('sessions.sessionNotFound')}</p>
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
          className="inline-flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('sessions.backToPatient', { name: session.patient.name })}
        </Link>
      ) : (
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <Clock className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-foreground">
              {t('sessions.sessionTitle')} - {format(new Date(session.started_at), "MMMM d, yyyy")}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
              <span>{format(new Date(session.started_at), "h:mm a")}</span>
              {session.duration_minutes && (
                <span>· {t('sessions.minutesLabel', { count: session.duration_minutes })}</span>
              )}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  session.status === "completed"
                    ? "bg-green-500/15 text-green-700 dark:text-green-400"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                }`}
              >
                {session.status === "completed" ? t('sessions.completed') : t('sessions.inProgress')}
              </span>
              <PrivacyBadge />
            </div>
            {session.patient && (
              <Link
                to={`/patients/${session.patient_id}`}
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-primary hover:underline"
              >
                <User className="h-4 w-4" />
                {session.patient.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2 text-[11px]">
              <Trash2 className="h-4 w-4" />
              {t('sessions.deleteSession')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('sessions.deleteSession')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('sessions.deleteSessionConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>{t('common.delete')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>


      {/* Quick Actions */}
      {session.status === "completed" && session.patient && (
        <div className="rounded-xl border border-primary bg-card p-6">
          <h2 className="text-[12px] font-semibold text-foreground mb-4">{t('sessions.quickActions')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            <Button
              className="gap-1.5 text-[11px] h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowPrescriptionEditor(true)}
            >
              <Pill className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('sessions.prescription')}</span>
            </Button>
            <Button
              className="gap-1.5 text-[11px] h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowInvoiceEditor(true)}
            >
              <Receipt className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('sessions.invoice')}</span>
            </Button>
            <Button
              className="gap-1.5 text-[11px] h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowMedicalCertificateEditor(true)}
            >
              <FileBadge className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('sessions.medicalCertificate')}</span>
            </Button>
            <Button
              className="gap-1.5 text-[11px] h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowReferralLetterEditor(true)}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('sessions.referralLetter')}</span>
            </Button>
            <Button
              className="gap-1.5 text-[11px] h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowGeneralLetterEditor(true)}
            >
              <FileEdit className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('sessions.generalLetter')}</span>
            </Button>
            <Button
              className="gap-1.5 text-[11px] h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowDrawingPad(true)}
            >
              <PenTool className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('sessions.drawingPad')}</span>
            </Button>
            <Button
              className="gap-1.5 text-[11px] h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowHospitalAdmissionEditor(true)}
            >
              <Hospital className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('sessions.hospitalAdmission')}</span>
            </Button>
          </div>
        </div>
      )}

      {/* AI Summary */}
      {session.summary && (
        <div className="rounded-xl border border-primary bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-[12px] font-semibold text-foreground">{t('sessions.aiSummary')}</h2>
                <p className="text-[11px] text-muted-foreground">{t('sessions.generatedFromSession')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isTranslating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Select value={selectedLanguage} onValueChange={handleTranslate}>
                <SelectTrigger className="w-[160px] h-8 text-[11px]">
                  <Languages className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue placeholder={t('sessions.translate')} />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code} className="text-[11px]">
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {translatedSummary && (
                <Button variant="ghost" size="sm" className="text-[11px] h-8" onClick={() => { setTranslatedSummary(null); setSelectedLanguage(""); }}>
                  {t('sessions.original')}
                </Button>
              )}
            </div>
          </div>
          <p className="text-[12px] text-foreground leading-relaxed">{translatedSummary || session.summary}</p>
        </div>
      )}

      {/* Session Notes — combined Audio + Transcript + Notes */}
      {(session.audio_url || session.transcript || session.notes) && (
        <div className="rounded-xl border border-primary bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                <Volume2 className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h2 className="text-[12px] font-semibold text-foreground">{t('sessions.sessionNotes')}</h2>
                <p className="text-[11px] text-muted-foreground">{t('sessions.notesDescription')}</p>
              </div>
            </div>
            {(session.audio_url || session.transcript) && (
              <Select
                onValueChange={(value) => {
                  if (value === "audio") handleDownloadAudio();
                  else if (value === "transcript" && session.transcript) {
                    const blob = new Blob([session.transcript], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `transcript-${format(new Date(session.started_at), 'yyyy-MM-dd')}.txt`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }
                }}
              >
                <SelectTrigger className="w-[160px] h-8 text-[11px]">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue placeholder={t('sessions.download')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="audio" disabled={!session.audio_url} className="text-[11px]">
                    {t('sessions.downloadAudio')}
                  </SelectItem>
                  <SelectItem value="transcript" disabled={!session.transcript} className="text-[11px]">
                    {t('sessions.downloadTranscript')}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Audio subsection */}
          {session.audio_url && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('sessions.audio')}</p>
              <audio controls className="w-full" src={signedAudioUrl || ''}>
                {t('sessions.audioNotSupported')}
              </audio>
              <Alert className="border-amber-500/30 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-[11px] text-amber-700">
                  {t('sessions.recordingDeleteWarning')}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Transcript subsection */}
          {session.transcript && (
            <>
              {session.audio_url && <hr className="my-4 border-border/60" />}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('sessions.transcript')}</p>
                <div className="bg-muted/30 rounded-lg p-4 max-h-[400px] overflow-y-auto space-y-2">
                  {session.transcript.split('\n').map((line, index) => {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > 0 && colonIndex < 50) {
                      const speaker = line.substring(0, colonIndex);
                      const text = line.substring(colonIndex + 1);
                      const speakerLower = speaker.toLowerCase().trim();
                      const isDoctor = speakerLower.includes('dr') || speakerLower.includes('doctor') || (doctorName && speakerLower.includes(doctorName.toLowerCase()));
                      return (
                        <p key={index} className={`text-[12px] leading-relaxed ${isDoctor ? 'text-primary' : 'text-foreground'}`}>
                          <span className="font-bold">{speaker}</span>:{text}
                        </p>
                      );
                    }
                    return line.trim() ? (
                      <p key={index} className="text-[12px] text-foreground leading-relaxed">{line}</p>
                    ) : null;
                  })}
                </div>
              </div>
            </>
          )}

          {/* Notes subsection */}
          {session.notes && (
            <>
              {(session.audio_url || session.transcript) && <hr className="my-4 border-border/60" />}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('sessions.notes')}</p>
                <p className="text-[12px] text-foreground whitespace-pre-wrap">{session.notes}</p>
              </div>
            </>
          )}
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
              <h2 className="text-[12px] font-semibold text-foreground">{t('sessions.privateNotes')}</h2>
              <p className="text-[11px] text-muted-foreground">{t('sessions.privateNotesDescription')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editingPrivateNotes ? (
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-8"
                onClick={() => {
                  setPrivateNotesDraft((session as any).private_notes || "");
                  setEditingPrivateNotes(true);
                }}
              >
                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                {t('common.edit')}
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[11px] h-8"
                  disabled={savingPrivateNotes}
                  onClick={() => { setEditingPrivateNotes(false); setPrivateNotesDraft(""); }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  className="text-[11px] h-8"
                  disabled={savingPrivateNotes}
                  onClick={handleSavePrivateNotes}
                >
                  {savingPrivateNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('common.save')}
                </Button>
              </>
            )}
          </div>
        </div>
        {editingPrivateNotes ? (
          <Textarea
            value={privateNotesDraft}
            onChange={(e) => setPrivateNotesDraft(e.target.value)}
            placeholder={t('sessions.writePrivateNotes')}
            className="text-[12px] min-h-[140px]"
          />
        ) : (session as any).private_notes ? (
          <p className="text-[12px] whitespace-pre-wrap text-foreground">{(session as any).private_notes}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">{t('sessions.noPrivateNotes')}</p>
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
              <h2 className="text-[12px] font-semibold text-foreground">{t('sessions.sessionDocuments')}</h2>
              <p className="text-[11px] text-muted-foreground">{t('sessions.documentsDescription')}</p>
            </div>
          </div>
          <div className="space-y-2">
            {sessionDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="flex-1 text-[12px] font-semibold text-foreground truncate">{doc.name}</span>
                {doc.is_draft && !doc.email_sent_at && (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
                    {t('sessions.draft')}
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

      {/* Action Points / TO-DO List */}
      {session.action_points && session.action_points.length > 0 && (
        <div className="rounded-xl border border-primary bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-[12px] font-semibold text-foreground">{t('sessions.actionPointsTodo')}</h2>
              <p className="text-[11px] text-muted-foreground">{t('sessions.tasksExtracted')}</p>
            </div>
          </div>
          <ul className="space-y-2 ml-4">
            {session.action_points.map((point, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-[12px] text-foreground p-3 rounded-lg bg-muted/30"
              >
                <Circle className="h-4 w-4 text-primary fill-primary shrink-0 mt-0.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty State */}
      {!session.summary && !session.transcript && (!session.action_points || session.action_points.length === 0) && (
        <div className="rounded-xl border border-primary bg-card p-8 text-center">
          <p className="text-[11px] text-muted-foreground">{t('sessions.noContent')}</p>
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
              title: t('sessions.prescriptionCreated'),
              description: t('sessions.prescriptionSavedMessage'),
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
              title: t('sessions.invoiceCreated'),
              description: t('sessions.invoiceCreatedMessage', { number: invoice.invoice_number }),
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
              title: t('sessions.medicalCertificateCreated'),
              description: t('sessions.medicalCertificateSavedMessage'),
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
              title: t('sessions.referralLetterCreated'),
              description: t('sessions.referralLetterSavedMessage'),
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
              title: t('sessions.generalLetterCreated'),
              description: t('sessions.generalLetterSavedMessage'),
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
              title: t('sessions.hospitalAdmissionFormCreated'),
              description: t('sessions.hospitalAdmissionFormSavedMessage'),
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
              {t('sessions.drawingPadTitle', { name: session.patient?.name })}
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
