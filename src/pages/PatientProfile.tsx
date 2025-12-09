import { useParams, Link, useNavigate } from "react-router-dom";
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
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { usePatient } from "@/hooks/usePatients";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSessions } from "@/hooks/useSessions";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { SessionCard } from "@/components/patients/SessionCard";
import { PatientOverview } from "@/components/patients/PatientOverview";
import { InvitePatientDialog } from "@/components/patients/InvitePatientDialog";
import { DoctorsOnProfile } from "@/components/patients/DoctorsOnProfile";
import { PatientDetailsEditor } from "@/components/patients/PatientDetailsEditor";
import { RoundTable } from "@/components/patients/RoundTable";

const mockDocuments = [
  { id: "1", name: "Financial Statement Q3.pdf", type: "Report", date: "Nov 15, 2024" },
  { id: "2", name: "Action Plan 2024.docx", type: "Plan", date: "Nov 1, 2024" },
];

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { patient, loading: patientLoading, updatePatient } = usePatient(id || "");
  const { sessions, loading: sessionsLoading } = useSessions(id);
  
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [canViewAllSessions, setCanViewAllSessions] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadRoundTableCount, setUnreadRoundTableCount] = useState(0);

  // Check if current doctor has access to all sessions
  useEffect(() => {
    const checkPermissions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      
      const patientUserId = (patient as any)?.patient_user_id;
      if (!patientUserId || !user) {
        setCanViewAllSessions(true); // Owner sees all
        return;
      }
      
      // Check if this doctor has session_summaries permission from the patient
      const { data: accessRecords } = await supabase
        .from('doctor_patient_access')
        .select('permissions')
        .eq('patient_user_id', patientUserId)
        .eq('is_active', true);

      if (!accessRecords || accessRecords.length === 0) {
        setCanViewAllSessions(true); // If no access records, assume owner
        return;
      }

      // Check if any doctor has session_summaries permission (meaning patient shares across doctors)
      const hasSharedSessions = accessRecords.some(record => 
        record.permissions.includes('session_summaries')
      );
      
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
    navigate(`/sessions?patient=${id}`);
    toast({
      title: "Starting Session",
      description: `Session started for ${patient?.name}`,
    });
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
          Back to Patients
        </Link>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Patient not found</p>
        </div>
      </div>
    );
  }

  const initials = patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  // Only show completed sessions that have actual transcripts
  const completedSessions = sessions.filter(s => s.status === 'completed' && s.transcript && s.transcript.trim().length > 0 && s.transcript !== 'No transcript available for this session.');
  const inProgressSessions = sessions.filter(s => s.status === 'in_progress');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link
        to="/patients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-2xl font-semibold text-accent-foreground">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{patient.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {patient.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {patient.email}
                </span>
              )}
              {patient.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" />
                  {patient.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <InvitePatientDialog patientId={patient.id} patientName={patient.name} />
          <Button variant="outline" className="gap-2" onClick={handleScheduleAppointment}>
            <Calendar className="h-4 w-4" />
            Schedule
          </Button>
          <Button className="gap-2" onClick={handleStartSession}>
            <Clock className="h-4 w-4" />
            Start Session
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Sessions</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {completedSessions.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="mt-1 text-2xl font-semibold text-foreground capitalize">
            {patient.status}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Patient Since</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {format(new Date(patient.created_at), "MMM yyyy")}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Session History</TabsTrigger>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="roundtable" className="gap-1.5">
            Round Table
            {unreadRoundTableCount > 0 && (
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab - AI Summary */}
        <TabsContent value="overview">
          <PatientOverview patient={patient} sessions={sessions} />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {sessionsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : completedSessions.length === 0 && inProgressSessions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              No sessions with recordings yet. Start your first session with this patient!
            </div>
          ) : (
            <>
              {/* In Progress Sessions */}
              {inProgressSessions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">In Progress</h3>
                  {inProgressSessions.map((session, index) => (
                    <div
                      key={session.id}
                      onClick={() => navigate(`/sessions/${session.id}`)}
                      className="rounded-xl border-2 border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between cursor-pointer hover:bg-amber-500/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                          <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground hover:text-primary transition-colors">
                            {format(new Date(session.started_at), "MMM d, yyyy")} - In Progress
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Started at {format(new Date(session.started_at), "h:mm a")}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full">
                        Ongoing
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed Sessions */}
              {completedSessions.length > 0 && (
                <div className="space-y-3">
                  {inProgressSessions.length > 0 && (
                    <h3 className="text-sm font-medium text-muted-foreground mt-6">Completed</h3>
                  )}
                  {completedSessions.map((session, index) => (
                    <SessionCard key={session.id} session={session} index={index} />
                  ))}
                </div>
              )}

              {completedSessions.length === 0 && inProgressSessions.length > 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No completed sessions yet.
                </p>
              )}
            </>
          )}
        </TabsContent>

        {/* Doctors Tab */}
        <TabsContent value="doctors">
          <div className="rounded-xl border border-border bg-card p-6">
            <DoctorsOnProfile patientId={patient.id} patientName={patient.name} />
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {mockDocuments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No documents yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {mockDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                      <FileText className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">{doc.date}</p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {doc.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="details">
          <PatientDetailsEditor patient={patient} onSave={updatePatient} />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <StickyNote className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Additional Notes</h3>
                  <p className="text-xs text-muted-foreground">Add any additional information about this patient</p>
                </div>
              </div>
              <Button 
                onClick={handleSaveNotes} 
                disabled={savingNotes}
                className="gap-2"
              >
                {savingNotes ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Notes
              </Button>
            </div>
            <Textarea
              placeholder="Enter any additional notes, observations, or important information about this patient..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="min-h-[300px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Last updated: {patient.updated_at ? format(new Date(patient.updated_at), "MMM d, yyyy 'at' h:mm a") : "Never"}
            </p>
          </div>
        </TabsContent>

        {/* Round Table Tab */}
        <TabsContent value="roundtable">
          <div className="rounded-xl border border-border bg-card p-6">
            <RoundTable 
              patientId={patient.id} 
              patientName={patient.name}
              onUnreadCountChange={setUnreadRoundTableCount}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}