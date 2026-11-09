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
  FileText,
  Download,
  Eye,
  AlertTriangle,
  Edit3,
  Send,
  Lock,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/useSessions";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useSessions } from "@/hooks/useSessions";
import { DocumentPreviewWithLetterhead } from "@/features/documents/components/DocumentPreviewWithLetterhead";

import { SessionResultPanels, AISummaryCard } from "@/features/sessions/components/SessionResultPanels";
import { WealthClientOverview } from "@/features/sessions/components/WealthClientOverview";
import { useIsAdmin } from "@/hooks/useIsAdmin";

import { PrivacyBadge } from "@/components/permissions/PrivacyBadge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logProfileView } from "@/lib/logProfileView";
import { getSignedAudioUrl } from "@/utils/audioUrl";

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, loading, refetch } = useSession(id || "");
  const { deleteSession } = useSessions();
  const { isAdmin } = useIsAdmin();
  const [sessionDocs, setSessionDocs] = useState<any[]>([]);
  const [sendingDocId, setSendingDocId] = useState<string | null>(null);
  const [advisorName, setDoctorName] = useState<string>("");
  const [signedAudioUrl, setSignedAudioUrl] = useState<string | null>(null);
  const [editingPrivateNotes, setEditingPrivateNotes] = useState(false);
  const [privateNotesDraft, setPrivateNotesDraft] = useState("");
  const [savingPrivateNotes, setSavingPrivateNotes] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);


  // Fetch advisor name
  useEffect(() => {
    if (!session?.user_id) return;
    supabase.from('profiles').select('full_name').eq('id', session.user_id).maybeSingle()
      .then(({ data }) => { if (data?.full_name) setDoctorName(data.full_name); });
  }, [session?.user_id]);

  // Log this record view for the client's "My Views" list
  useEffect(() => {
    if (!session?.patient_id) return;
    logProfileView(session.patient_id, "Session Detail");
  }, [session?.patient_id]);

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
      // Get client email for sending
      const { data: client } = await supabase
        .from('clients')
        .select('email, pharmacy_email, name')
        .eq('id', doc.patient_id)
        .maybeSingle();
      
      const recipientEmail = doc.template_name?.toLowerCase().includes('prescription')
        ? client?.pharmacy_email || client?.email
        : client?.email;

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
      title: "Consultation deleted",
      description: "The consultation has been removed.",
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
          <p className="text-muted-foreground">Consultation not found</p>
        </div>
      </div>
    );
  }

  const audioActionsMenu = (
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8 shrink-0"
      title="Download audio"
      disabled={!session.audio_url}
      onClick={handleDownloadAudio}
    >
      <Download className="h-4 w-4" />
    </Button>
  );


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      {session.client ? (
        <Link
          to={`/clients/${session.patient_id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {session.client.name}
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
            <h1 className="page-title">
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
                    ? "bg-sky-500/15 text-primary dark:text-primary"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                }`}
              >
                {session.status === "completed" ? "Completed" : "In Progress"}
              </span>
              <PrivacyBadge />
            </div>
            {session.client && (
              <Link
                to={`/clients/${session.patient_id}`}
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <User className="h-4 w-4" />
                {session.client.name}
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
                  <AlertDialogTitle>Delete Consultation</AlertDialogTitle>
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


      {/* Client Overview — full width */}
      <WealthClientOverview client={session.client} />

      {/* AI Summary — directly underneath Client Overview, no outer frame */}
      <div>
        <p className="mb-2 text-xs text-muted-foreground">{format(new Date(session.started_at), "MMM d, yyyy · h:mm a")}</p>
        <AISummaryCard
          summary={session.summary}
          audioUrl={signedAudioUrl}
          audioActions={audioActionsMenu}
          showRetentionNotice={!!session.audio_url}
        />
      </div>

      {/* Session results — Session transcript removed; the transcription is
          available for download from Session Documents below instead. */}
      <SessionResultPanels
        advisorName={advisorName}
        clientName={session.client?.name}
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
            <p className="mb-2 text-xs text-muted-foreground">Only visible to you.</p>
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
              <h2 className="text-sm font-semibold text-foreground">Consultation Documents</h2>
              <p className="text-xs text-muted-foreground">Auto-generated documents from this consultation</p>
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
                  className={`h-6 w-6 ${doc.email_sent_at ? 'text-muted-foreground' : 'text-primary hover:text-primary'}`}
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
          <p className="text-sm text-muted-foreground">No content recorded for this consultation yet.</p>
        </div>
      )}

      {previewDoc && (
        <DocumentPreviewWithLetterhead document={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

    </div>
  );
}
