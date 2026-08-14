import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, FileText, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { createMaeveSession, type MaeveMessage, type MaeveSessionRow } from "../hooks/useMaeveSession";
import { SessionTitleEditor } from "../components/SessionTitleEditor";
import { deleteMaeveSession } from "../lib/deleteSession";
import { buildTranscript, downloadTranscript, transcriptFileName } from "../lib/transcript";
import { downloadTranscriptPdf } from "../lib/maevePdf";
import holarcLogoAsset from "@/assets/holarc-health-logo.png.asset.json";
import { toast } from "sonner";

const logo = holarcLogoAsset.url;

/** Loads every message of a past exploration so it can be exported. */
async function loadMessages(sessionId: string): Promise<MaeveMessage[]> {
  const { data } = await supabase
    .from("ask_maeve_messages" as any)
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  return ((data as any) ?? []) as MaeveMessage[];
}

export default function AskMaeveHome() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<MaeveSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [startError, setStartError] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MaeveSessionRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const exportSession = async (s: MaeveSessionRow, kind: "txt" | "pdf") => {
    setBusy(`${s.id}-${kind}`);
    try {
      const messages = await loadMessages(s.id);
      if (messages.length === 0) {
        toast.error("This exploration has no conversation yet");
        return;
      }
      if (kind === "txt") {
        downloadTranscript(buildTranscript(s, messages), transcriptFileName(s));
        toast.success("Transcript saved to your device");
        return;
      }
      const ok = await downloadTranscriptPdf(s, messages);
      toast[ok ? "success" : "error"](ok ? "PDF saved to your device" : "Could not create the PDF");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    supabase
      .from("ask_maeve_sessions" as any)
      .select("id, title, status, conversation_state, session_summary, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        setSessions((data ?? []) as MaeveSessionRow[]);
        setLoading(false);
      });
  }, []);

  const start = async () => {
    setCreating(true);
    setStartError(false);
    const id = await createMaeveSession();
    setCreating(false);
    if (!id) {
      setStartError(true);
      toast.error("Could not start an exploration");
      return;
    }
    navigate(`/ask-maeve/${id}`, { state: { fresh: true } });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const ok = await deleteMaeveSession(pendingDelete.id);
    setDeleting(false);
    if (!ok) {
      toast.error("Could not delete that exploration");
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== pendingDelete.id));
    setPendingDelete(null);
    toast.success("Exploration deleted");
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-1">
      <div className="flex justify-center pb-4 pt-2">
        <img src={logo} alt="Holarc Health" className="h-24 w-auto" />
      </div>

      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-maeve" />
        <h1 className="font-display text-2xl font-bold text-foreground">Ask Angel</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        A quiet space to explore something in your own words. Angel asks the questions — every answer, and every
        meaning, is yours.
      </p>
      <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        Angel is a facilitation tool, not a clinician. She gives no advice, opinions or diagnoses. These
        conversations are private to you — your clinicians cannot see them.
      </p>

      <Button onClick={start} disabled={creating} className="mt-4 bg-maeve text-maeve-foreground hover:bg-maeve-dark">
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Start an exploration
      </Button>

      {startError && (
        <p className="mt-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-foreground">
          Angel could not open a new exploration just now. Tap "Start an exploration" to try again.
        </p>
      )}

      <div className="mt-6 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No explorations yet.</p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 transition hover:border-maeve"
            >
              <div className="min-w-0 flex-1">
                <SessionTitleEditor
                  sessionId={s.id}
                  title={s.title}
                  onTitleClick={() => navigate(`/ask-maeve/${s.id}`)}
                  onRenamed={(title) =>
                    setSessions((prev) => prev.map((x) => (x.id === s.id ? { ...x, title } : x)))
                  }
                />
                <button onClick={() => navigate(`/ask-maeve/${s.id}`)} className="block w-full text-left">
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()} · {s.status === "closed" ? "Closed" : "In progress"}
                  </p>
                </button>
              </div>
              <button
                aria-label="Download transcript"
                title="Download transcript"
                disabled={busy === `${s.id}-txt`}
                onClick={() => exportSession(s, "txt")}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-maeve/10 hover:text-maeve-dark disabled:opacity-50"
              >
                {busy === `${s.id}-txt` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </button>
              <button
                aria-label="Download PDF"
                title="Download PDF"
                disabled={busy === `${s.id}-pdf`}
                onClick={() => exportSession(s, "pdf")}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-maeve/10 hover:text-maeve-dark disabled:opacity-50"
              >
                {busy === `${s.id}-pdf` ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              </button>
              <button
                aria-label="Delete exploration"
                onClick={() => setPendingDelete(s)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <span className="text-maeve">→</span>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this exploration?</AlertDialogTitle>
            <AlertDialogDescription>
              The whole conversation will be permanently removed. If you'd like to keep it, save or share the
              transcript first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
