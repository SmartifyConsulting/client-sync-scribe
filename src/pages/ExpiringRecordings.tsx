import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSignedAudioUrl } from "@/utils/audioUrl";
import { format, parseISO, differenceInDays } from "date-fns";
import { Download, Trash2, Loader2, AlertTriangle, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ExpiringRecordings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["expiring-recordings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Fetch sessions with audio that are 4-7 days old (expiring soon)
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from("sessions")
        .select("id, started_at, audio_url, transcript, patient_id, title, patients(name)")
        .eq("user_id", user.id)
        .not("audio_url", "is", null)
        .gte("started_at", sevenDaysAgo.toISOString())
        .lte("started_at", fourDaysAgo.toISOString())
        .order("started_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  const handleDownload = async (session: any) => {
    if (!session.audio_url) return;
    setDownloadingId(session.id);
    try {
      const url = await getSignedAudioUrl(session.audio_url);
      if (!url) throw new Error("Could not get download URL");
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `session-${format(parseISO(session.started_at), "yyyy-MM-dd")}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({ title: "Download started", description: "Your recording is being downloaded." });
    } catch (err) {
      toast({ title: "Download failed", description: "Could not download the recording.", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (sessionId: string) => {
    setDeletingId(sessionId);
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ audio_url: null, transcript: null })
        .eq("id", sessionId);

      if (error) throw error;

      toast({ title: "Recording deleted", description: "The audio and transcript have been removed." });
      queryClient.invalidateQueries({ queryKey: ["expiring-recordings"] });
    } catch (err) {
      toast({ title: "Delete failed", description: "Could not delete the recording.", variant: "destructive" });
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const getDaysRemaining = (startedAt: string) => {
    const sessionDate = parseISO(startedAt);
    const expiryDate = new Date(sessionDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    return Math.max(0, differenceInDays(expiryDate, new Date()));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="page-title">Expiring Recordings</h1>
        <p className="text-muted-foreground text-xs">
          Session recordings are automatically deleted after 7 days. Download any you want to keep.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No recordings expiring soon.</p>
            <p className="text-sm text-muted-foreground mt-1">Recordings older than 7 days are automatically removed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session: any) => {
            const daysLeft = getDaysRemaining(session.started_at);
            const patientName = session.patients?.name || "Unknown Patient";
            
            return (
              <Card key={session.id} className={daysLeft <= 1 ? "border-destructive/50" : "border-border"}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                      <Mic className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {session.title || patientName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(session.started_at), "MMM d, yyyy · h:mm a")} · {patientName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge 
                      variant={daysLeft <= 1 ? "destructive" : "secondary"}
                      className="gap-1"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      {daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleDownload(session)}
                      disabled={downloadingId === session.id}
                    >
                      {downloadingId === session.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => setConfirmDeleteId(session.id)}
                      disabled={deletingId === session.id}
                    >
                      {deletingId === session.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recording?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the audio recording and transcript. The AI summary and action points will be preserved. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              Delete Recording
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
