import { TransactionLogs } from "@/features/wealth-workflow/TransactionLogs";
import { SignedImage } from "@/features/documents/components/SignedImage";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { BiologPanel } from "@/features/biolog/BiologPanel";
import { useV2Demo } from "@/hooks/useV2Demo";
import { PatientProgrammesTab } from "@/features/programmes/components/PatientProgrammesTab";
import { WorkflowMap } from "@/features/wealth-workflow/map/WorkflowMap";
import { LiveWorkspace } from "@/features/wealth-workflow/workspace/LiveWorkspace";

import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  FileText,
  Clock,
  Upload,
  Loader2,
  StickyNote,
  Save,
  AlertCircle,
  AlertTriangle,
  Star,
  Plus,
  Send,
  Mic,
  Video,
  FilePlus,
  GitCompareArrows,
  Eye,
  Edit3,
  Sparkles,
  Trash2,
  RotateCw,
} from "lucide-react";
import { ImageComparisonDialog } from "@/components/documents/ImageComparisonDialog";
import { cn } from "@/lib/utils";
import vulaSymbol from "@/assets/vula-symbol.png";
import { SampleBadge } from "@/components/patients/SampleBadge";
import { isSamplePatient } from "@/lib/samplePatients";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { usePatient } from "@/hooks/usePatients";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logProfileView } from "@/lib/logProfileView";
import { useSessions } from "@/hooks/useSessions";
import { usePatientRewards } from "@/hooks/usePatientRewards";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { SessionCard } from "@/components/patients/SessionCard";
import { SessionHistoryTable } from "@/components/patients/SessionHistoryTable";
import { PatientOverview } from "@/components/patients/PatientOverview";
import { InvitePatientDialog } from "@/components/patients/InvitePatientDialog";
import { EmoticonSender } from "@/components/patients/EmoticonSender";
import { DoctorsOnProfile } from "@/components/patients/DoctorsOnProfile";
import { DocumentsBrowser } from "@/features/documents/components/DocumentsBrowser";
import { PatientDetailsEditor } from "@/components/patients/PatientDetailsEditor";
import { RequestConnectionButton } from "@/components/patients/RequestConnectionButton";
import { RoundTable } from "@/components/patients/RoundTable";
import { AdmissionsView } from "@/components/admissions/AdmissionsView";
import { LollipopDisplay } from "@/components/gamification/LollipopDisplay"; // Vula display
import { useTemplates } from "@/hooks/useTemplates";
import { useDocuments, Document as DocumentRecord } from "@/hooks/useDocuments";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
import { DocumentPreview } from "@/components/sessions/DocumentPreview";
import { useDocumentHeaderFooter } from "@/hooks/useDocumentHeaderFooter";
import { useProfile } from "@/hooks/useProfile";
import { resolveDocumentPreviewContent } from "@/lib/resolveDocumentPreviewContent";
import { renderFormattedContent } from "@/utils/documentFormatting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// DrawingPad hidden for later phase
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { INTAKE_EMAIL_DOMAIN } from "@/lib/mailboxDomain";

export default function PatientProfile() {
  const { v2Demo } = useV2Demo();
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { patient, loading: patientLoading, updatePatient } = usePatient(id || "");
  const { sessions, loading: sessionsLoading } = useSessions(id);
  const { lollipopCount } = usePatientRewards(id);
  const { templates, loading: templatesLoading } = useTemplates();
  const { documents, loading: documentsLoading, fetchDocuments, updateDocument } = useDocuments(id);
  const { user } = useAuth();
  const [mailboxAlias, setMailboxAlias] = useState<string | null>(null);
  const [mailboxId, setMailboxId] = useState<string | null>(null);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") || "details";
  const activeTab = rawTab === "live" ? "workflow" : rawTab;
  const handleTabChange = (value: string, group?: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    if (group) next.set("group", group); else next.delete("group");
    setSearchParams(next, { replace: true });
  };



  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("mailbox_id, mailbox_alias")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setMailboxAlias(data.mailbox_alias);
          setMailboxId(data.mailbox_id);
        }
      });
  }, [user?.id]);

  // Log profile view for engagement tracking / "My Views"
  useEffect(() => {
    if (!user?.id || !id) return;
    logProfileView(id, "Patient Profile");
  }, [user?.id, id]);

  const displayEmail = mailboxAlias
    ? `${mailboxAlias}@${INTAKE_EMAIL_DOMAIN}`
    : mailboxId
      ? `docs-${mailboxId.slice(0, 8)}@inbox.holarc.health`
      : "";

  // This patient's own document intake address — readable by every provider in their
  // holarchy via a security-definer lookup, so the care team can share it with labs.
  const [patientDocEmail, setPatientDocEmail] = useState<string>("");
  useEffect(() => {
    if (!id) return;
    let active = true;
    (supabase.rpc as any)("get_patient_document_alias", { _patient_id: id }).then(
      ({ data }: { data: string | null }) => {
        if (active && data) setPatientDocEmail(`${data}@${INTAKE_EMAIL_DOMAIN}`);
      },
    );
    return () => {
      active = false;
    };
  }, [id]);

  const [additionalNotes, setAdditionalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [canViewAllSessions, setCanViewAllSessions] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadRoundTableCount, setUnreadRoundTableCount] = useState(0);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);
  const [editDocName, setEditDocName] = useState("");
  const [editDocContent, setEditDocContent] = useState("");
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
  const [analysisDialog, setAnalysisDialog] = useState<DocumentRecord | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Deep link: /patients/:id?tab=documents&doc=<id> opens the document preview
  const deepLinkDocId = searchParams.get("doc");
  useEffect(() => {
    if (!deepLinkDocId || documentsLoading) return;
    const match = documents.find((d) => d.id === deepLinkDocId);
    if (match) setPreviewDoc(match);
    const next = new URLSearchParams(searchParams);
    next.delete("doc");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkDocId, documentsLoading, documents]);



  // Check if current doctor has access to all sessions
  useEffect(() => {
    const checkPermissions = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const patientUserId = (patient as any)?.patient_user_id;
      if (!patientUserId || !user) {
        setCanViewAllSessions(true); // Owner sees all
        return;
      }

      // Check if this doctor has session_summaries permission from the patient
      const { data: accessRecords } = await supabase
        .from("doctor_patient_access")
        .select("permissions")
        .eq("patient_user_id", patientUserId)
        .eq("is_active", true);

      if (!accessRecords || accessRecords.length === 0) {
        setCanViewAllSessions(true); // If no access records, assume owner
        return;
      }

      // Check if any doctor has session_summaries permission (meaning patient shares across doctors)
      const hasSharedSessions = accessRecords.some((record) => record.permissions.includes("session_summaries"));

      setCanViewAllSessions(hasSharedSessions);
    };

    if (patient) {
      checkPermissions();
    }
  }, [patient]);

  // Initialize notes from patient data
  useEffect(() => {
    if (patient?.notes) {
      setAdditionalNotes(patient.notes);
    }
  }, [patient?.notes]);

  const handleSaveNotes = async () => {
    if (!patient) return;
    setSavingNotes(true);
    await updatePatient({ notes: additionalNotes });
    setSavingNotes(false);
  };

  const handleStartSession = () => {
    navigate(`/sessions?patient=${id}&autoStart=true`);
  };

  const handleScheduleAppointment = () => {
    navigate(`/calendar?patient=${id}`);
  };

  if (patientLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Link
          to="/patients"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("patientProfile.backToPatients")}
        </Link>
        <div className="rounded-xl border border-primary bg-card p-8 text-center">
          <p className="text-muted-foreground">{t("patientProfile.patientNotFound")}</p>
        </div>
      </div>
    );
  }

  const initials = patient.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  // Only show completed sessions that have actual transcripts
  const completedSessions = sessions.filter(
    (s) =>
      s.status === "completed" &&
      s.transcript &&
      s.transcript.trim().length > 0 &&
      s.transcript !== "No transcript available for this session.",
  );
  const inProgressSessions = sessions.filter((s) => s.status === "in_progress");

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back Button */}
      <Link
        to="/patients"
        className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        {t("patientProfile.backToPatients")}
      </Link>

      {/* Header Card */}
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary">
              {initials}
            </div>
            <div>
              <h1 className="page-title flex items-center gap-2">
                {patient.name}
                <div className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", patient.status === "active" ? "bg-sky-500" : "bg-red-400")} />
                {isSamplePatient(patient) && <SampleBadge size="md" />}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-base text-muted-foreground mt-1">
                {patient.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary/70" />
                    {patient.email}
                  </span>
                )}
                {patient.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary/70" />
                    {patient.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(patient as any).patient_user_id !== currentUserId && (
              <>
                {(patient as any).patient_user_id && (
                  <EmoticonSender
                    recipientId={(patient as any).patient_user_id}
                    patientId={patient.id}
                    recipientName={patient.name}
                  />
                )}
                {null}

              </>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleScheduleAppointment}>
              <Calendar className="h-3.5 w-3.5" />
              {t("patientProfile.schedule")}
            </Button>
            {(patient as any).patient_user_id !== currentUserId && (
              <Button size="sm" className="gap-1.5" onClick={handleStartSession}>
                <Clock className="h-3.5 w-3.5" />
                {t("patientProfile.startSession")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards - hide when doctor views their own patient record */}
      {(patient as any).patient_user_id !== currentUserId && (
        <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
          <div className="rounded-lg bg-card p-2 shadow-sm border border-border/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{t("patientProfile.totalSessions")}</p>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-1 text-sm font-bold text-foreground">{completedSessions.length}</p>
          </div>
          <div className="rounded-lg bg-card p-2 shadow-sm border border-border/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{t("patientProfile.lastSeen")}</p>
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-1 text-sm font-bold text-foreground">
              {patient.last_visit ? (
                format(new Date(patient.last_visit), "MMM d")
              ) : (
                <span className="text-muted-foreground text-xs font-medium">—</span>
              )}
            </p>
          </div>
          <div className="rounded-lg bg-card p-2 shadow-sm border border-border/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{t("patientProfile.since")}</p>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-1 text-sm font-bold text-foreground">
              {format(new Date(patient.created_at), "MMM yy")}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="flex w-full flex-nowrap overflow-x-auto bg-primary justify-start">
          <TabsTrigger
            value="details"
            className="tab-brand whitespace-nowrap text-xs px-3 py-1.5"
          >
            {t("patientProfile.tabDetails")}
          </TabsTrigger>
          <TabsTrigger
            value="overview"
            className="tab-brand whitespace-nowrap text-xs px-3 py-1.5"
          >
            {t("patientProfile.tabOverview")}
          </TabsTrigger>
          <TabsTrigger
            value="workflow"
            className="tab-brand whitespace-nowrap text-xs px-3 py-1.5"
          >
            Live Workspace
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="tab-brand whitespace-nowrap text-xs px-3 py-1.5"
          >
            {t("patientProfile.tabSessions")}
          </TabsTrigger>
          <TabsTrigger
            value="doctors"
            className="tab-brand whitespace-nowrap text-xs px-3 py-1.5"
          >
            {t("patientProfile.tabProviders")}
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="tab-brand whitespace-nowrap text-xs px-3 py-1.5"
          >
            {t("patientProfile.tabDocuments")}
          </TabsTrigger>
          <TabsTrigger value="logs" className="tab-brand whitespace-nowrap text-xs px-3 py-1.5">
            Activity Log
          </TabsTrigger>
        </TabsList>
        <TabsContent value="logs">
          <TransactionLogs patientId={patient.id} />
        </TabsContent>

        {/* Overview Tab - AI Summary */}
        <TabsContent value="overview">
          <PatientOverview patient={patient} sessions={sessions} />
        </TabsContent>

        <TabsContent value="workflow">
          <WorkflowMap patientId={patient.id} clientName={patient.name} onOpenDocuments={() => handleTabChange("documents")}
            initialGroup={searchParams.get("group") ?? undefined} />
        </TabsContent>


        <TabsContent value="sessions" className="space-y-4">
          {sessionsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : completedSessions.length === 0 && inProgressSessions.length === 0 ? (
            <div className="rounded-2xl bg-card p-10 text-center shadow-card">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No consultations with recordings yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Start your first consultation with this client!</p>
            </div>
          ) : (
            <>
              {/* In Progress Sessions */}
              {inProgressSessions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">In Progress</h3>
                  {inProgressSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => navigate(`/sessions/${session.id}`)}
                      className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-5 flex items-center justify-between cursor-pointer hover:bg-amber-500/10 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                          <Clock className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {format(new Date(session.started_at), "MMM d, yyyy")} - In Progress
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Started at {format(new Date(session.started_at), "h:mm a")}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-medium bg-amber-500/15 text-amber-600 px-3 py-1.5 rounded-full">
                        Ongoing
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed Sessions Table */}
              {completedSessions.length > 0 && (
                <div className="space-y-3">
                  {inProgressSessions.length > 0 && (
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-8">
                      Completed
                    </h3>
                  )}
                  <SessionHistoryTable
                    sessions={completedSessions}
                    patientId={patient.id}
                    patientName={patient.name}
                    allergies={patient.allergies}
                  />
                </div>
              )}

              {completedSessions.length === 0 && inProgressSessions.length > 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No completed consultations yet.</p>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="admissions" className="space-y-4">
          <AdmissionsView
            patientId={patient.id}
            patientHeight={(patient as any).height_cm}
            patientWeight={(patient as any).weight_kg}
            canEdit={true}
          />
        </TabsContent>

        {/* Doctors Tab */}
        <TabsContent value="doctors">
          <div className="rounded-2xl bg-card p-6 shadow-card">
            <DoctorsOnProfile patientId={patient.id} patientName={patient.name} />
          </div>
        </TabsContent>

        {/* Biolog Tab — the care team reviews the patient's own Biolog */}
        <TabsContent value="biolog">
          {!v2Demo ? null : (patient as any).patient_user_id ? (
            <BiologPanel ownerUserId={(patient as any).patient_user_id} readOnly />
          ) : (
            <div className="rounded-2xl bg-card p-6 text-sm text-muted-foreground shadow-card">
              This patient has not activated their app account yet, so there is no Biolog to show.
            </div>
          )}
        </TabsContent>

        {/* Programmes Tab — eating plan, exercise programme and weigh-ins */}
        <TabsContent value="programmes">
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <PatientProgrammesTab
              patientId={patient.id}
              patientName={patient.name}
              canManage
              isSelf={(patient as any).patient_user_id === currentUserId}
            />
          </div>
        </TabsContent>


        <TabsContent value="documents" className="space-y-4">
          {/* Document intake address — own record uses your alias, otherwise the patient's */}
          {(() => {
            const isOwnRecord =
              patient.email?.toLowerCase() === user?.email?.toLowerCase();
            const intakeEmail = isOwnRecord ? displayEmail : patientDocEmail;
            if (!intakeEmail) return null;
            return (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Documents can be emailed by external parties (e.g. radiologists, labs) to{" "}
                  <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground break-all">
                    {intakeEmail}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(intakeEmail);
                      toast({ title: "Copied!", description: "Email address copied to clipboard." });
                    }}
                    className="inline-flex items-center ml-1.5 text-primary hover:text-primary/80"
                    title="Copy email address"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  , and they will be saved under {isOwnRecord ? "your" : `${patient.name}'s`} Documents.
                </p>
              </div>
            </div>
            );
          })()}

          {/* Quick action icon buttons */}
          <div className="flex items-center gap-3 justify-center">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl"
              title="Record Audio"
              onClick={async () => {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                  const recorder = new MediaRecorder(stream);
                  const chunks: Blob[] = [];
                  recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                  };
                  recorder.onstop = async () => {
                    stream.getTracks().forEach((t) => t.stop());
                    const blob = new Blob(chunks, { type: "audio/webm" });
                    if (blob.size > 5 * 1024 * 1024) {
                      toast({
                        title: "File too large",
                        description: "Audio recording exceeds 5MB limit",
                        variant: "destructive",
                      });
                      return;
                    }
                    const fileName = `${patient.id}/${Date.now()}.webm`;
                    const { error: uploadError } = await supabase.storage
                      .from("patient-media")
                      .upload(fileName, blob, { contentType: "audio/webm" });
                    if (uploadError) {
                      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
                      return;
                    }
                    const {
                      data: { publicUrl },
                    } = supabase.storage.from("patient-media").getPublicUrl(fileName);
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();
                    if (!user) return;
                    await supabase
                      .from("documents")
                      .insert({
                        name: `Audio Recording ${format(new Date(), "dd MMM yyyy HH:mm")}`,
                        content: "[AUDIO Recording]",
                        user_id: user.id,
                        patient_id: patient.id,
                        patient_name: patient.name,
                        media_url: publicUrl,
                        media_type: "audio",
                      });
                    toast({ title: "Audio saved" });
                    fetchDocuments();
                  };
                  recorder.start();
                  toast({
                    title: "🎙️ Recording...",
                    description: "Click the microphone again or wait — recording for 60s max.",
                  });
                  setTimeout(() => {
                    if (recorder.state === "recording") recorder.stop();
                  }, 60000);
                  // Store recorder to stop on next click — simplified: auto-stop after 60s
                } catch {
                  toast({
                    title: "Permission denied",
                    description: "Microphone access is required",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl"
              title="Record Video"
              onClick={async () => {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: { facingMode: "environment" },
                  });
                  const recorder = new MediaRecorder(stream);
                  const chunks: Blob[] = [];
                  recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                  };
                  recorder.onstop = async () => {
                    stream.getTracks().forEach((t) => t.stop());
                    const blob = new Blob(chunks, { type: "video/webm" });
                    if (blob.size > 5 * 1024 * 1024) {
                      toast({
                        title: "File too large",
                        description: "Video recording exceeds 5MB limit",
                        variant: "destructive",
                      });
                      return;
                    }
                    const fileName = `${patient.id}/${Date.now()}.webm`;
                    const { error: uploadError } = await supabase.storage
                      .from("patient-media")
                      .upload(fileName, blob, { contentType: "video/webm" });
                    if (uploadError) {
                      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
                      return;
                    }
                    const {
                      data: { publicUrl },
                    } = supabase.storage.from("patient-media").getPublicUrl(fileName);
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();
                    if (!user) return;
                    await supabase
                      .from("documents")
                      .insert({
                        name: `Video Recording ${format(new Date(), "dd MMM yyyy HH:mm")}`,
                        content: "[VIDEO Recording]",
                        user_id: user.id,
                        patient_id: patient.id,
                        patient_name: patient.name,
                        media_url: publicUrl,
                        media_type: "video",
                      });
                    toast({ title: "Video saved" });
                    fetchDocuments();
                  };
                  recorder.start();
                  toast({ title: "🎥 Recording video...", description: "Auto-stops after 5 minutes." });
                  setTimeout(() => {
                    if (recorder.state === "recording") recorder.stop();
                  }, 300000);
                } catch {
                  toast({
                    title: "Permission denied",
                    description: "Camera access is required",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Video className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl"
              title="Upload File"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "audio/*,video/*,image/*,.pdf,.doc,.docx";
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  if (
                    (file.type.startsWith("audio/") || file.type.startsWith("video/")) &&
                    file.size > 5 * 1024 * 1024
                  ) {
                    toast({
                      title: "File too large",
                      description: "Audio/video files must be under 5MB",
                      variant: "destructive",
                    });
                    return;
                  }
                  try {
                    const fileName = `${patient.id}/${Date.now()}-${file.name}`;
                    const { error: uploadError } = await supabase.storage.from("patient-media").upload(fileName, file);
                    if (uploadError) throw uploadError;
                    const {
                      data: { publicUrl },
                    } = supabase.storage.from("patient-media").getPublicUrl(fileName);
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();
                    if (!user) throw new Error("Not authenticated");
                    await supabase.from("documents").insert({
                      name: file.name,
                      content: `[Uploaded File] ${file.name}`,
                      user_id: user.id,
                      patient_id: patient.id,
                      patient_name: patient.name,
                      media_url: publicUrl,
                      media_type: file.type.startsWith("video")
                        ? "video"
                        : file.type.startsWith("audio")
                          ? "audio"
                          : "file",
                    });
                    toast({ title: "File uploaded", description: `${file.name} saved to documents` });
                    fetchDocuments();
                  } catch (err: any) {
                    toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                  }
                };
                input.click();
              }}
            >
              <Upload className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl"
              title="Create New Document"
              onClick={() => setShowTemplateSelector(true)}
            >
              <FilePlus className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl"
              title="Compare Images"
              onClick={() => setShowCompareDialog(true)}
            >
              <GitCompareArrows className="h-5 w-5" />
            </Button>
          </div>
          <DocumentsBrowser patientId={patient.id} patientName={patient.name} />
        </TabsContent>

        <TabsContent value="details">
          <PatientDetailsEditor patient={patient} onSave={updatePatient} />
        </TabsContent>

        {/* Notes tab removed - notes now in General Notes frame under Details */}

        {/* Round Table Tab */}
        <TabsContent value="roundtable">
          <div className="rounded-2xl bg-card p-6 shadow-card">
            <RoundTable
              patientId={patient.id}
              patientName={patient.name}
              onUnreadCountChange={setUnreadRoundTableCount}
              hideHeader
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Selector Dialog */}
      <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select a Template</DialogTitle>
          </DialogHeader>
          {templatesLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </div>
          ) : templates.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No templates available.</p>
              <Button className="mt-4" onClick={() => navigate("/documents")}>
                Create Templates
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowTemplateSelector(false);
                  }}
                  className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{template.name}</p>
                    {template.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{template.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Editor */}
      {selectedTemplate && patient && (
        <DocumentEditor
          template={selectedTemplate}
          preSelectedPatientId={patient.id}
          onClose={() => setSelectedTemplate(null)}
          onSave={() => {
            setSelectedTemplate(null);
            fetchDocuments();
            toast({
              title: "Document created",
              description: "The document has been saved to this client's profile.",
            });
          }}
        />
      )}

      {/* Image Comparison Dialog */}
      {patient && (
        <ImageComparisonDialog open={showCompareDialog} onOpenChange={setShowCompareDialog} patientId={patient.id} />
      )}

      {/* Document Preview */}
      {previewDoc && (
        <DocumentPreviewWithLetterhead document={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

      {/* Edit Document Dialog */}
      <Dialog
        open={!!editingDoc}
        onOpenChange={(open) => {
          if (!open) setEditingDoc(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>Update the document name and content</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-doc-name">Document Name</Label>
              <Input
                id="edit-doc-name"
                value={editDocName}
                onChange={(e) => setEditDocName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-doc-content">Content (HTML)</Label>
              <textarea
                id="edit-doc-content"
                value={editDocContent}
                onChange={(e) => setEditDocContent(e.target.value)}
                className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              />
            </div>
            {editDocContent && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="border border-border rounded-lg p-4 bg-card">
                  <div
                    className="whitespace-pre-wrap text-sm text-foreground"
                    dangerouslySetInnerHTML={{ __html: renderFormattedContent(editDocContent) }}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDoc(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (editingDoc) {
                  const success = await updateDocument(editingDoc.id, {
                    name: editDocName,
                    content: editDocContent,
                  });
                  if (success) {
                    setEditingDoc(null);
                    fetchDocuments();
                  }
                }
              }}
              disabled={!editDocName.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Analysis Dialog */}
      <Dialog open={!!analysisDialog} onOpenChange={(open) => !open && setAnalysisDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              AI Image Analysis
            </DialogTitle>
            <DialogDescription>{analysisDialog?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(analysisDialog as any)?.media_url && (
              <div className="rounded-lg overflow-hidden border bg-muted">
                <SignedImage
                  src={(analysisDialog as any).media_url}
                  alt={analysisDialog?.name}
                  className="w-full max-h-64 object-contain"
                />
              </div>
            )}
            {(analysisDialog as any)?.ai_analysis ? (
              <div className="space-y-3">
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {(analysisDialog as any).ai_analysis}
                </div>
                {(analysisDialog as any)?.ai_analyzed_at && (
                  <p className="text-xs text-muted-foreground">
                    Analysed on {format(new Date((analysisDialog as any).ai_analyzed_at), "dd MMM yyyy 'at' HH:mm")}
                  </p>
                )}
              </div>
            ) : analyzingDocId === analysisDialog?.id ? (
              <div className="flex items-center justify-center py-12 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Analysing image...</span>
              </div>
            ) : null}
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  This AI analysis is for informational purposes only and does not constitute a medical diagnosis. Always consult a qualified healthcare professional for clinical interpretation and treatment decisions.
                </p>
              </div>
            </div>
          </div>
          {(analysisDialog as any)?.ai_analysis && (
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                disabled={analyzingDocId === analysisDialog?.id}
                className="gap-1.5"
                onClick={async () => {
                  if (!analysisDialog) return;
                  const mediaUrl = (analysisDialog as any).media_url;
                  setAnalyzingDocId(analysisDialog.id);
                  setAnalysisDialog({ ...analysisDialog, ai_analysis: null, ai_analyzed_at: null } as any);
                  try {
                    const { data, error } = await supabase.functions.invoke("analyze-medical-image", {
                      body: { imageUrl: mediaUrl, documentId: analysisDialog.id },
                    });
                    if (error) throw error;
                    setAnalysisDialog({ ...analysisDialog, ai_analysis: data.analysis, ai_analyzed_at: data.analyzedAt } as any);
                    fetchDocuments();
                    toast({ title: "Re-analysis Complete" });
                  } catch (err: any) {
                    toast({ title: "Re-analysis Failed", description: err.message || "Could not re-analyse", variant: "destructive" });
                  } finally {
                    setAnalyzingDocId(null);
                  }
                }}
              >
                {analyzingDocId === analysisDialog?.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCw className="h-3.5 w-3.5" />
                )}
                Re-analyse
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this document?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The document {docToDelete?.name ? `"${docToDelete.name}"` : ""} will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={async () => {
                if (!docToDelete) return;
                setIsDeleting(true);
                try {
                  const mediaUrl = (docToDelete as any).media_url as string | undefined;
                  if (mediaUrl) {
                    const marker = "/patient-media/";
                    const idx = mediaUrl.indexOf(marker);
                    if (idx !== -1) {
                      const path = mediaUrl.substring(idx + marker.length).split("?")[0];
                      try {
                        await supabase.storage.from("patient-media").remove([path]);
                      } catch {}
                    }
                  }
                  const { error } = await supabase.from("documents").delete().eq("id", docToDelete.id);
                  if (error) throw error;
                  toast({ title: "Document deleted" });
                  setDocToDelete(null);
                  fetchDocuments();
                } catch (err: any) {
                  toast({ title: "Delete failed", description: err.message, variant: "destructive" });
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentPreviewWithLetterhead({
  document,
  onClose,
}: {
  document: DocumentRecord;
  onClose: () => void;
}) {
  const { headerFooter, templateFontFamily } = useDocumentHeaderFooter(document);
  const { profile } = useProfile();
  const [resolvedContent, setResolvedContent] = useState<string>(document.content);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(profile?.logo_url || undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resolved = await resolveDocumentPreviewContent({
          id: document.id,
          content: document.content,
          user_id: document.user_id,
          patient_id: document.patient_id,
          template_name: document.template_name,
          session_id: (document as any).session_id ?? null,
          name: document.name,
        });
        if (cancelled) return;
        setResolvedContent(resolved.resolvedContent);
        if (resolved.logoUrl) setLogoUrl(resolved.logoUrl);
      } catch (err) {
        console.error('Preview resolve error:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [document.id]);

  return (
    <DocumentPreview
      title={document.name}
      subtitle={document.patient_name ? `Patient: ${document.patient_name}` : undefined}
      content={resolvedContent}
      logoUrl={logoUrl}
      fontFamily={templateFontFamily || headerFooter?.font_family || undefined}
      headerFooter={headerFooter}
      onClose={onClose}
    />
  );
}
