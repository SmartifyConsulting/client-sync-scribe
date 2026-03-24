import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Clock,
  Sparkles,
  Mic,
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
  Star,
  Edit3,
  Send,
} from "lucide-react";
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
import { StarRatingDialog } from "@/components/sessions/StarRatingDialog";
import { PrivacyBadge } from "@/components/permissions/PrivacyBadge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const { session, loading } = useSession(id || "");
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
  const [showStarRating, setShowStarRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [sessionDocs, setSessionDocs] = useState<any[]>([]);
  const [sendingDocId, setSendingDocId] = useState<string | null>(null);

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

  // Check if user has already rated this session
  useEffect(() => {
    if (!id) return;
    const checkRating = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('visit_ratings' as any)
        .select('id')
        .eq('session_id', id)
        .eq('rater_id', user.id)
        .maybeSingle();
      setHasRated(!!data);
    };
    checkRating();
  }, [id]);

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

  const handleDownloadAudio = () => {
    if (!session?.audio_url) return;
    const link = document.createElement('a');
    link.href = session.audio_url;
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
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
            <Clock className="h-7 w-7 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
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
          {session.status === "completed" && !hasRated && session.patient && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowStarRating(true)}>
              <Star className="h-4 w-4" />
              Rate Visit
            </Button>
          )}
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
        </div>
      </div>

      {/* Star Rating Dialog */}
      {session.patient && id && (
        <StarRatingDialog
          open={showStarRating}
          onOpenChange={setShowStarRating}
          sessionId={id}
          ratedUserId={(session.patient as any).patient_user_id || session.patient_id}
          ratedUserName={session.patient.name}
          raterRole="doctor"
          onRated={() => setHasRated(true)}
        />
      )}

      {/* Quick Actions */}
      {session.status === "completed" && session.patient && (
        <div className="rounded-xl border border-primary bg-card p-6">
          <h2 className="font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            <Button
              className="gap-1.5 text-sm h-10 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowPrescriptionEditor(true)}
            >
              <Pill className="h-4 w-4 shrink-0" />
              <span className="truncate">Prescription</span>
            </Button>
            <Button
              className="gap-1.5 text-sm h-10 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowInvoiceEditor(true)}
            >
              <Receipt className="h-4 w-4 shrink-0" />
              <span className="truncate">Invoice</span>
            </Button>
            <Button
              className="gap-1.5 text-sm h-10 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowMedicalCertificateEditor(true)}
            >
              <FileBadge className="h-4 w-4 shrink-0" />
              <span className="truncate">Medical Certificate</span>
            </Button>
            <Button
              className="gap-1.5 text-sm h-10 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowReferralLetterEditor(true)}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">Referral Letter</span>
            </Button>
            <Button
              className="gap-1.5 text-sm h-10 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowGeneralLetterEditor(true)}
            >
              <FileEdit className="h-4 w-4 shrink-0" />
              <span className="truncate">General Letter</span>
            </Button>
            <Button
              className="gap-1.5 text-sm h-10 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowDrawingPad(true)}
            >
              <PenTool className="h-4 w-4 shrink-0" />
              <span className="truncate">Drawing Pad</span>
            </Button>
            <Button
              className="gap-1.5 text-sm h-10 px-3 bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => setShowHospitalAdmissionEditor(true)}
            >
              <Hospital className="h-4 w-4 shrink-0" />
              <span className="truncate">Hospital Admission</span>
            </Button>
          </div>
        </div>
      )}

      {/* AI Summary */}
      {session.summary && (
        <div className="rounded-xl border border-primary bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">AI Summary</h2>
                <p className="text-xs text-muted-foreground">Generated from session content</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isTranslating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Select value={selectedLanguage} onValueChange={handleTranslate}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <Languages className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue placeholder="Translate..." />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code} className="text-xs">
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {translatedSummary && (
                <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setTranslatedSummary(null); setSelectedLanguage(""); }}>
                  Original
                </Button>
              )}
            </div>
          </div>
          <p className="text-foreground leading-relaxed">{translatedSummary || session.summary}</p>
        </div>
      )}

      {/* Audio Recording */}
      <div className="rounded-xl border border-primary bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Volume2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Session Recording</h2>
              <p className="text-xs text-muted-foreground">Audio from the consultation</p>
            </div>
          </div>
          {session.audio_url && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadAudio}>
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          )}
        </div>
        {session.audio_url ? (
          <>
            <audio 
              controls 
              className="w-full"
              src={session.audio_url}
            >
              Your browser does not support the audio element.
            </audio>
            <Alert className="mt-4 border-amber-500/30 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-700">
                Voice recordings are automatically deleted after 7 days. Download recordings you wish to keep.
                Transcriptions will remain available permanently.
              </AlertDescription>
            </Alert>
          </>
        ) : (
          <div className="bg-muted/30 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No audio recording available for this session. Audio recordings are only saved when explicitly enabled during recording.
            </p>
          </div>
        )}
      </div>

      {/* Session Documents */}
      {sessionDocs.length > 0 && (
        <div className="rounded-xl border border-primary bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Session Documents</h2>
              <p className="text-xs text-muted-foreground">Auto-generated documents from this session</p>
            </div>
          </div>
          <div className="space-y-2">
            {sessionDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="flex-1 text-sm font-medium text-foreground truncate">{doc.name}</span>
                {doc.is_draft && !doc.email_sent_at && (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
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

      {/* Action Points / TO-DO List */}
      {session.action_points && session.action_points.length > 0 && (
        <div className="rounded-xl border border-primary bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Action Points / TO-DO</h2>
              <p className="text-xs text-muted-foreground">Tasks extracted from this session</p>
            </div>
          </div>
          <ul className="space-y-2 ml-4">
            {session.action_points.map((point, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-foreground p-3 rounded-lg bg-muted/30"
              >
                <Circle className="h-4 w-4 text-primary fill-primary shrink-0 mt-0.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transcription */}
      {session.transcript && (
        <div className="rounded-xl border border-primary bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Mic className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Full Transcription</h2>
              <p className="text-xs text-muted-foreground">Voice recording transcript</p>
            </div>
          </div>
          <div className="bg-muted/30 rounded-lg p-4 max-h-[400px] overflow-y-auto space-y-2">
            {session.transcript.split('\n').map((line, index) => {
              const colonIndex = line.indexOf(':');
              if (colonIndex > 0 && colonIndex < 50) {
                const speaker = line.substring(0, colonIndex);
                const text = line.substring(colonIndex + 1);
                const isDoctor = speaker.toLowerCase().includes('dr') || speaker.toLowerCase().includes('doctor');
                
                  return (
                   <p key={index} className={`leading-relaxed ${isDoctor ? 'text-primary' : 'text-foreground'}`}>
                     <span className="font-bold">{speaker}</span>:{text}
                   </p>
                 );
              }
              return line.trim() ? (
                <p key={index} className="text-foreground leading-relaxed">{line}</p>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      {session.notes && (
        <div className="rounded-xl border border-primary bg-card p-6">
          <h2 className="font-semibold text-foreground mb-3">Session Notes</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{session.notes}</p>
        </div>
      )}

      {/* Empty State */}
      {!session.summary && !session.transcript && (!session.action_points || session.action_points.length === 0) && (
        <div className="rounded-xl border border-primary bg-card p-8 text-center">
          <p className="text-muted-foreground">No content recorded for this session yet.</p>
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
