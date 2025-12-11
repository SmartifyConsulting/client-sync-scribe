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
  Play,
  Pause,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSessions";
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
import { useToast } from "@/hooks/use-toast";

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, loading } = useSession(id || "");
  const { deleteSession } = useSessions();

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
        <div className="rounded-xl border border-border bg-card p-8 text-center">
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

      {/* AI Summary */}
      {session.summary && (
        <div className="rounded-xl border border-primary bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">AI Summary</h2>
              <p className="text-xs text-muted-foreground">Generated from session content</p>
            </div>
          </div>
          <p className="text-foreground leading-relaxed">{session.summary}</p>
        </div>
      )}

      {/* Audio Recording */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
            <Volume2 className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Session Recording</h2>
            <p className="text-xs text-muted-foreground">Audio from the consultation</p>
          </div>
        </div>
        {session.audio_url ? (
          <audio 
            controls 
            className="w-full"
            src={session.audio_url}
          >
            Your browser does not support the audio element.
          </audio>
        ) : (
          <div className="bg-muted/30 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No audio recording available for this session. Audio recordings are only saved when explicitly enabled during recording.
            </p>
          </div>
        )}
      </div>

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
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No content recorded for this session yet.</p>
        </div>
      )}
    </div>
  );
}
