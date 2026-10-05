import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export type MessageKind = "chat" | "change_request" | "counter" | "accept" | "redraft";
export interface WealthMessage {
  id: string; patient_id: string; sender_id: string; body: string; kind: MessageKind;
  recommendation_id: string | null; read_at: string | null; created_at: string;
}

const KIND_LABEL: Record<MessageKind, string> = {
  chat: "", change_request: "Change requested", counter: "Counter-proposal", accept: "Agreed", redraft: "ROA redrafted",
};

export function useMessages(patientId?: string | null, recommendationId?: string | null) {
  const qc = useQueryClient();
  const key = ["wealth-messages", patientId, recommendationId ?? "all"];
  const q = useQuery({
    queryKey: key,
    enabled: !!patientId,
    queryFn: async () => {
      let r = (supabase as any).from("wealth_messages").select("*").eq("patient_id", patientId).order("created_at");
      if (recommendationId) r = r.eq("recommendation_id", recommendationId);
      const { data, error } = await r;
      if (error) throw error;
      return (data ?? []) as WealthMessage[];
    },
  });
  useEffect(() => {
    if (!patientId) return;
    const ch = supabase.channel(`wm-${patientId}-${recommendationId ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wealth_messages", filter: `patient_id=eq.${patientId}` },
        () => qc.invalidateQueries({ queryKey: ["wealth-messages", patientId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [patientId, recommendationId, qc]);
  return q;
}

export async function sendMessage(patientId: string, body: string, kind: MessageKind = "chat", recommendationId?: string | null) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await (supabase as any).from("wealth_messages").insert({
    patient_id: patientId, sender_id: user?.id, body, kind, recommendation_id: recommendationId ?? null,
  });
  if (error) throw error;
}

const time = (d: string) => new Date(d).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** WhatsApp-style thread. Wealth Manager bubbles use the blue owner colour, client bubbles the green owner colour. */
export function MessageThread({ patientId, advisorUserId, names, recommendationId, compact, footer, hideComposer }: {
  patientId: string; advisorUserId?: string | null; names: { advisor: string; client: string };
  recommendationId?: string | null; compact?: boolean; footer?: React.ReactNode; hideComposer?: boolean;
}) {
  const { data: msgs = [], isLoading } = useMessages(patientId, recommendationId);
  const [me, setMe] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);
  useEffect(() => {
    if (msgs.some((m) => !m.read_at && m.sender_id !== me) && me) {
      (supabase as any).rpc("wealth_messages_mark_read", { _patient: patientId }).then(() => {});
    }
  }, [msgs, me, patientId]);

  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try { await sendMessage(patientId, body, recommendationId ? (me === advisorUserId ? "counter" : "change_request") : "chat", recommendationId); setText(""); }
    catch (e: any) { toast({ title: "Message not sent", description: e?.message ?? "Please check your connection and try again.", variant: "destructive" }); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("flex-1 space-y-2 overflow-y-auto rounded-lg bg-muted/40 p-3", compact ? "max-h-72" : "")}>
        {isLoading && <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />}
        {!isLoading && msgs.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">No messages yet. Everything said here is kept on record.</p>
        )}
        {msgs.map((m) => {
          const mine = m.sender_id === me;
          const isAdvisor = m.sender_id === advisorUserId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm",
                isAdvisor ? "bg-[hsl(var(--owner-advisor)/0.12)] border border-[hsl(var(--owner-advisor)/0.35)]" : "bg-[hsl(var(--owner-client)/0.12)] border border-[hsl(var(--owner-client)/0.35)]",
                mine ? "rounded-br-sm" : "rounded-bl-sm")}>
                <div className="mb-0.5 flex items-center gap-2 text-2xs font-semibold text-muted-foreground">
                  <span>{isAdvisor ? names.advisor : names.client}</span>
                  {KIND_LABEL[m.kind] && <span className="rounded-full bg-background px-1.5 py-0.5 font-medium">{KIND_LABEL[m.kind]}</span>}
                </div>
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">{m.body}</p>
                <div className="mt-1 flex items-center justify-end gap-1 text-2xs text-muted-foreground">
                  {time(m.created_at)}
                  {mine && (m.read_at ? <CheckCheck className="h-3 w-3 text-[hsl(var(--owner-advisor))]" /> : <Check className="h-3 w-3" />)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {!hideComposer && (
        <div className="mt-2 flex items-end gap-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={compact ? 2 : 2} placeholder="Type a message"
            className="min-h-[44px] resize-none text-sm"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} />
          <Button size="icon" className="h-11 w-11 shrink-0 rounded-full" disabled={busy || !text.trim()} onClick={submit} aria-label="Send">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}
      {footer}
      <p className="mt-1.5 text-2xs text-muted-foreground">Messages are kept on record for compliance and cannot be edited or deleted.</p>
    </div>
  );
}
