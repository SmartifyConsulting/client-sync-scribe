import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Loader2, RefreshCw, Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LIFE_EVENTS = ["Marriage", "Divorce", "Birth or adoption", "New job", "Retirement", "Property purchase", "Inheritance", "Death in family", "Beneficiary change", "Policy issued", "Other"];

export async function refreshClientSummary(patientId: string) {
  const { data, error } = await supabase.functions.invoke("client-ai-summary", { body: { patientId } });
  if (error || (data as any)?.error) throw new Error((data as any)?.error || "The summary couldn't be updated.");
  return data as { summary: string; updatedAt: string };
}

/** Always-current AI summary of every consultation and life event for a client. */
export function ClientAISummary({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const key = ["client-ai-summary", patientId];
  const [busy, setBusy] = useState(false);
  const [evType, setEvType] = useState("");
  const [evNotes, setEvNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [{ data: p }, { data: s }, { data: e }] = await Promise.all([
        supabase.from("client_financial_profiles").select("ai_summary, ai_summary_updated_at").eq("patient_id", patientId).maybeSingle(),
        supabase.from("sessions").select("updated_at").eq("patient_id", patientId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("client_life_events" as any).select("created_at").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const latest = [s?.updated_at, (e as any)?.created_at].filter(Boolean).sort().pop() as string | undefined;
      return { summary: (p as any)?.ai_summary as string | null, updatedAt: (p as any)?.ai_summary_updated_at as string | null, latest };
    },
  });

  const run = async (silent = false) => {
    setBusy(true);
    try {
      await refreshClientSummary(patientId);
      qc.invalidateQueries({ queryKey: key });
    } catch (err: any) {
      if (!silent) toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Keep it current: rebuild when a consultation or life event is newer than the summary.
  useEffect(() => {
    if (!data || busy) return;
    const stale = !data.updatedAt || (data.latest && data.latest > data.updatedAt);
    if (stale && (data.latest || !data.summary)) run(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.updatedAt, data?.latest]);

  const addEvent = async () => {
    if (!evType) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("client_life_events" as any).insert({ patient_id: patientId, event_type: evType, notes: evNotes || null, created_by: u.user?.id });
    if (error) return toast.error(`We couldn't save the life event: ${error.message}`);
    setEvType(""); setEvNotes("");
    toast.success("Life event added — updating your summary.");
    run();
  };

  return (
    <section className="rounded-xl border border-primary bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">AI Summary</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {data?.updatedAt ? `Updated ${formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true })}` : ""}
        </span>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => run()} disabled={busy} aria-label="Refresh summary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : (
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {data?.summary || (busy ? "Building your summary…" : "No consultations or life events have been recorded yet.")}
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">Built from all consultations and life events. For information only — not financial advice.</p>
      <div className="flex flex-col sm:flex-row gap-2 border-t border-border pt-3">
        <Select value={evType} onValueChange={setEvType}>
          <SelectTrigger className="h-9 sm:w-48 text-xs"><SelectValue placeholder="Add a life event" /></SelectTrigger>
          <SelectContent>{LIFE_EVENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="h-9 text-xs" placeholder="Notes (optional)" value={evNotes} onChange={(e) => setEvNotes(e.target.value)} />
        <Button size="sm" className="h-9 gap-1" onClick={addEvent} disabled={!evType}><Plus className="h-4 w-4" />Add</Button>
      </div>
    </section>
  );
}
