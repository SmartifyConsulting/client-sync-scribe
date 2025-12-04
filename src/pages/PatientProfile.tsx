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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePatient } from "@/hooks/usePatients";
import { useSessions } from "@/hooks/useSessions";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { SessionCard } from "@/components/patients/SessionCard";

const mockDocuments = [
  { id: "1", name: "Financial Statement Q3.pdf", type: "Report", date: "Nov 15, 2024" },
  { id: "2", name: "Action Plan 2024.docx", type: "Plan", date: "Nov 1, 2024" },
];

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { patient, loading: patientLoading } = usePatient(id || "");
  const { sessions, loading: sessionsLoading } = useSessions(id);

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
  const completedSessions = sessions.filter(s => s.status === 'completed');

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
        <div className="flex gap-3">
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
      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="sessions">Session History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          {sessionsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : completedSessions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              No sessions yet. Start your first session with this patient!
            </div>
          ) : (
            completedSessions.map((session, index) => (
              <SessionCard key={session.id} session={session} index={index} />
            ))
          )}
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
          <div className="rounded-xl border border-border bg-card p-6 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="mt-1 text-foreground">
                  {patient.dob ? format(new Date(patient.dob), "MMMM d, yyyy") : "Not provided"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="mt-1 text-foreground">{patient.address || "Not provided"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="mt-1 text-foreground">{patient.notes || "No notes"}</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}