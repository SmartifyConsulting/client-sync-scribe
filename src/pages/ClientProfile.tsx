import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  FileText,
  Clock,
  Plus,
  Upload,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const mockClient = {
  id: "1",
  name: "Sarah Johnson",
  email: "sarah.j@email.com",
  phone: "+1 (555) 123-4567",
  dob: "March 15, 1985",
  address: "123 Main Street, New York, NY 10001",
  notes: "Prefers morning appointments. Working on business expansion strategy.",
  totalSessions: 12,
  lastSession: "Today",
  joinedDate: "January 2024",
};

const mockSessions = [
  {
    id: "1",
    date: "Dec 3, 2024",
    time: "9:00 AM",
    duration: "45 min",
    summary:
      "Discussed Q4 financial review and identified three key areas for improvement in cash flow management.",
    actionPoints: ["Review budget allocations", "Schedule follow-up with accountant"],
  },
  {
    id: "2",
    date: "Nov 26, 2024",
    time: "10:30 AM",
    duration: "60 min",
    summary:
      "Strategic planning session for 2025. Outlined expansion goals and resource requirements.",
    actionPoints: ["Draft expansion proposal", "Research market trends"],
  },
  {
    id: "3",
    date: "Nov 19, 2024",
    time: "9:00 AM",
    duration: "30 min",
    summary: "Quick check-in on progress with implementation of previous recommendations.",
    actionPoints: ["Update progress tracker"],
  },
];

const mockDocuments = [
  { id: "1", name: "Financial Statement Q3.pdf", type: "Report", date: "Nov 15, 2024" },
  { id: "2", name: "Action Plan 2024.docx", type: "Plan", date: "Nov 1, 2024" },
  { id: "3", name: "Meeting Notes Oct.pdf", type: "Notes", date: "Oct 28, 2024" },
];

export default function ClientProfile() {
  const { id } = useParams();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link
        to="/clients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Clients
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-2xl font-semibold text-accent-foreground">
            SJ
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{mockClient.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                {mockClient.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" />
                {mockClient.phone}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </Button>
          <Button className="gap-2">
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
            {mockClient.totalSessions}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Last Session</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {mockClient.lastSession}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Client Since</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {mockClient.joinedDate}
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
          {mockSessions.map((session, index) => (
            <div
              key={session.id}
              className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                    <Clock className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{session.date}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.time} · {session.duration}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{session.summary}</p>
              {session.actionPoints.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Action Points
                  </p>
                  <ul className="mt-2 space-y-1">
                    {session.actionPoints.map((point, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
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
          </div>
        </TabsContent>

        <TabsContent value="details">
          <div className="rounded-xl border border-border bg-card p-6 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="mt-1 text-foreground">{mockClient.dob}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="mt-1 text-foreground">{mockClient.address}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="mt-1 text-foreground">{mockClient.notes}</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
