import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createMaeveSession, type MaeveSessionRow } from "../hooks/useMaeveSession";
import { toast } from "sonner";

export default function AskMaeveHome() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<MaeveSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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
    const id = await createMaeveSession();
    setCreating(false);
    if (!id) {
      toast.error("Could not start an exploration");
      return;
    }
    navigate(`/ask-maeve/${id}`);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-1">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-maeve" />
        <h1 className="font-display text-2xl font-bold text-foreground">Ask Maeve</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        A quiet space to explore something in your own words. Maeve asks the questions — every answer, and every
        meaning, is yours.
      </p>
      <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        Maeve is a facilitation tool, not a clinician. She gives no advice, opinions or diagnoses. These
        conversations are private to you — your clinicians cannot see them.
      </p>

      <Button onClick={start} disabled={creating} className="mt-4 bg-maeve text-maeve-foreground hover:bg-maeve-dark">
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Start an exploration
      </Button>

      <div className="mt-6 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No explorations yet.</p>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/ask-maeve/${s.id}`)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-left transition hover:border-maeve"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{s.title || "New exploration"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString()} · {s.status === "closed" ? "Closed" : "In progress"}
                </p>
              </div>
              <span className="text-maeve">→</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
