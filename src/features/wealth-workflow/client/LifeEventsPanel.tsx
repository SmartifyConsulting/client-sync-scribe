import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const EVENTS = ["Marriage", "New baby", "New job", "Retirement", "Property purchase", "Divorce", "Death in the family", "Other"];
const DISCLAIMER = "This is general guidance, not financial advice. Please speak to your Wealth Manager before making changes.";

export function LifeEventsPanel({ patientId, workflowId }: { patientId: string | null; workflowId?: string | null }) {
  const { toast } = useToast();
  const [type, setType] = useState(EVENTS[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  if (!patientId) return null;

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("client_life_events").insert({ patient_id: patientId, event_type: type, event_date: date, notes: note || null, created_by: user?.id });
    setSaving(false);
    if (error) return toast({ title: "Couldn't save the event", description: error.message, variant: "destructive" });
    setNote("");
    setQuestion(`How could "${type.toLowerCase()}" affect my policies and plan?`);
    toast({ title: "Life event saved", description: "Your Wealth Manager can now see it." });
  };

  const ask = async () => {
    if (question.trim().length < 3) return;
    setAsking(true); setAnswer(null);
    const { data, error } = await supabase.functions.invoke("life-event-advice", { body: { patientId, question } });
    setAsking(false);
    if (error || data?.error) return toast({ title: "Holarc AI couldn't answer", description: data?.error ?? "Please try again.", variant: "destructive" });
    setAnswer(data.answer);
  };

  const share = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("todos").insert({
      title: `Client question: ${question.slice(0, 140)}`, patient_id: patientId, user_id: user?.id,
      owner_role: "wealth_manager", workflow_id: workflowId ?? null, status: "pending", assignee: "doctor",
    });
    if (error) return toast({ title: "Couldn't share", description: error.message, variant: "destructive" });
    toast({ title: "Shared with your Wealth Manager" });
  };

  const label = "text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground";

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">Life events</h2>
        <p className="text-xs text-muted-foreground">Tell us what's changed and see how it might affect your cover.</p>
      </header>
      <div className="grid gap-6 p-5 md:grid-cols-2">
        <div className="space-y-3">
          <p className={label}>Capture an event</p>
          <div className="grid grid-cols-2 gap-2">
            <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              {EVENTS.map((e) => <option key={e}>{e}</option>)}
            </select>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <Input placeholder="Short note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="h-9 text-sm" />
          <Button size="sm" variant="outline" onClick={save} disabled={saving}>{saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Save event</Button>
        </div>
        <div className="space-y-3">
          <p className={label}>Ask Holarc AI</p>
          <Textarea rows={2} placeholder="e.g. How does having a baby affect my policies?" value={question} onChange={(e) => setQuestion(e.target.value)} className="text-sm" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={ask} disabled={asking || question.trim().length < 3}>{asking && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Ask</Button>
            {answer && <Button size="sm" variant="ghost" onClick={share}>Share with my Wealth Manager</Button>}
          </div>
          {answer && <p className="whitespace-pre-line rounded-md bg-muted/40 p-3 text-[13px] leading-relaxed text-foreground">{answer}</p>}
        </div>
      </div>
      <p className="border-t border-border px-5 py-2 text-[11px] italic text-muted-foreground">{DISCLAIMER}</p>
    </section>
  );
}
