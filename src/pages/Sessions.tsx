import { useState } from "react";
import {
  Mic,
  MicOff,
  Play,
  Square,
  FileText,
  Clock,
  User,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SessionState = "idle" | "active" | "processing" | "completed";

export default function Sessions() {
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState("");
  const [actionPoints, setActionPoints] = useState<string[]>([]);

  const startSession = () => {
    setSessionState("active");
    setNotes("");
    setSummary("");
    setActionPoints([]);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const endSession = () => {
    setSessionState("processing");
    // Simulate AI processing
    setTimeout(() => {
      setSummary(
        "Client discussed progress on Q4 financial targets. Key concerns include cash flow timing and vendor payment schedules. Agreed to implement new budgeting framework and schedule follow-up review in two weeks."
      );
      setActionPoints([
        "Draft new budgeting framework proposal",
        "Review vendor contracts for payment terms",
        "Schedule follow-up meeting for December 17th",
        "Send summary report to client",
      ]);
      setSessionState("completed");
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Session Mode</h1>
        <p className="mt-1 text-muted-foreground">
          Record, transcribe, and generate AI summaries for client sessions
        </p>
      </div>

      {/* Session States */}
      {sessionState === "idle" && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent mb-4">
            <Play className="h-8 w-8 text-accent-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Ready to Start
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Begin a new consultation session to capture notes, record audio, and
            generate AI-powered summaries and action points.
          </p>
          <Button onClick={startSession} size="lg" className="gap-2">
            <Play className="h-5 w-5" />
            Start New Session
          </Button>
        </div>
      )}

      {sessionState === "active" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recording Panel */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <User className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Current Session</p>
                  <p className="text-sm text-muted-foreground">Select a client</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-mono text-foreground">00:12:34</span>
              </div>
            </div>

            {/* Recording Controls */}
            <div className="flex flex-col items-center gap-4 py-8">
              <button
                onClick={toggleRecording}
                className={cn(
                  "flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300",
                  isRecording
                    ? "bg-destructive text-destructive-foreground animate-pulse-soft shadow-lg"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow"
                )}
              >
                {isRecording ? (
                  <MicOff className="h-10 w-10" />
                ) : (
                  <Mic className="h-10 w-10" />
                )}
              </button>
              <p className="text-sm text-muted-foreground">
                {isRecording ? "Recording in progress..." : "Tap to start recording"}
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={endSession}>
                <Square className="h-4 w-4 mr-2" />
                End Session
              </Button>
            </div>
          </div>

          {/* Notes Panel */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Session Notes</h3>
            </div>
            <Textarea
              placeholder="Type your notes here during the session..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[300px] resize-none"
            />
          </div>
        </div>
      )}

      {sessionState === "processing" && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Processing Session
          </h2>
          <p className="text-muted-foreground max-w-md">
            AI is analyzing your session notes and generating a summary with action points...
          </p>
        </div>
      )}

      {sessionState === "completed" && (
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="flex items-center gap-4 rounded-xl border border-success/30 bg-success/5 p-4">
            <CheckCircle className="h-6 w-6 text-success" />
            <div>
              <p className="font-medium text-foreground">Session Completed Successfully</p>
              <p className="text-sm text-muted-foreground">
                Summary and action points have been generated and saved to client history
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Summary */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">AI Summary</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">{summary}</p>
            </div>

            {/* Action Points */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-5 w-5 text-warning" />
                <h3 className="font-semibold text-foreground">Action Points</h3>
              </div>
              <ul className="space-y-3">
                {actionPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {index + 1}
                    </span>
                    <span className="text-foreground">{point}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full mt-6 gap-2">
                Add to Calendar
              </Button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setSessionState("idle")}>
              Start New Session
            </Button>
            <Button variant="outline">Generate Document</Button>
            <Button variant="outline">Email Summary</Button>
          </div>
        </div>
      )}
    </div>
  );
}
