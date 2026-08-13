import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { safeInvoke } from "@/services/edge/safeInvoke";
import { useMaeveSession } from "../hooks/useMaeveSession";
import { processLabel, stateLabel } from "../lib/processes";
import { CLIENT_FALLBACK, looksLikeAdvice } from "../lib/suggestionDetector";

interface Props {
  sessionId: string;
}

export function MaeveChat({ sessionId }: Props) {
  const navigate = useNavigate();
  const { session, messages, loading, thinking, error, send, reload } = useMaeveSession(sessionId);
  const [input, setInput] = useState("");
  const [showWhat, setShowWhat] = useState(false);
  const [closing, setClosing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const openedRef = useRef(false);

  useEffect(() => {
    if (loading || openedRef.current) return;
    if (messages.length === 0) {
      openedRef.current = true;
      send("", true);
    }
  }, [loading, messages.length, send]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, thinking]);

  useEffect(() => {
    if (!thinking) inputRef.current?.focus();
  }, [thinking, sessionId]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const submit = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    await send(text);
  };

  const control = async (text: string) => {
    if (thinking) return;
    await send(text);
  };

  const closeSession = async () => {
    setClosing(true);
    const { error: err } = await safeInvoke("ask-maeve-summary", { session_id: sessionId });
    setClosing(false);
    if (err) {
      toast.error(err);
      return;
    }
    await reload();
  };

  const currentProcess = processLabel(
    [...messages].reverse().find((m) => m.process_key)?.process_key,
  );
  const current = stateLabel(session?.conversation_state);

  return (
    <div className="mx-auto flex h-[calc(100vh-11rem)] w-full max-w-3xl flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <Sparkles className="h-5 w-5 text-maeve" />
            Ask Maeve
          </h1>
          <p className="text-xs text-muted-foreground">
            {session?.status === "closed" ? "Exploration closed" : "Exploration in progress"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {currentProcess && (
            <span className="rounded-full bg-maeve/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-maeve-dark">
              {currentProcess.name}
            </span>
          )}
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {current.name}
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        Maeve is a facilitation tool, not a clinician. She asks questions and reflects your own words — she does not
        give advice, opinions or diagnoses. Anything clinical belongs with your healthcare professional. This
        conversation is private to you.
      </p>

      {/* What are we doing? */}
      <div className="mt-2">
        <button
          onClick={() => setShowWhat((v) => !v)}
          className="text-[11px] font-semibold text-maeve-dark underline-offset-4 hover:underline"
        >
          What are we doing?
        </button>
        {showWhat && (
          <p className="mt-1 rounded-lg border border-maeve/40 bg-maeve/5 px-3 py-2 text-xs text-foreground">
            {currentProcess?.plain ?? current.plain}
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="mt-3 flex-1 space-y-4 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          messages.map((m) => {
            const isMaeve = m.role === "assistant";
            const body = isMaeve && looksLikeAdvice(m.content) ? CLIENT_FALLBACK : m.content;
            return (
              <div key={m.id} className={cn("flex", isMaeve ? "justify-start" : "justify-end")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
                    isMaeve
                      ? m.is_safety_response
                        ? "border border-destructive/40 bg-destructive/5 text-foreground"
                        : "border border-maeve/30 bg-maeve/5 text-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {body}
                </div>
              </div>
            );
          })
        )}
        {thinking && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-maeve/30 bg-maeve/5 px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-maeve" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-maeve [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-maeve [animation-delay:300ms]" />
            </div>
          </div>
        )}
        {session?.session_summary && (
          <div className="rounded-2xl border border-maeve/40 bg-maeve/10 px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">
            {session.session_summary}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[
          { label: "Pause", text: "I'd like to pause for a moment." },
          { label: "Change direction", text: "I'd like to change direction." },
          { label: "I'd rather not answer that", text: "I'd rather not answer that." },
          { label: "Start again", text: "I'd like to start again." },
        ].map((c) => (
          <button
            key={c.label}
            disabled={thinking}
            onClick={() => control(c.text)}
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-maeve hover:text-maeve-dark disabled:opacity-50"
          >
            {c.label}
          </button>
        ))}
        <button
          disabled={thinking || closing}
          onClick={closeSession}
          className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-maeve hover:text-maeve-dark disabled:opacity-50"
        >
          {closing ? "Closing…" : "Stop and close"}
        </button>
        <button
          onClick={() => navigate("/ask-maeve")}
          className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-maeve hover:text-maeve-dark"
        >
          All explorations
        </button>
      </div>

      {/* Composer */}
      <div className="mt-2 flex items-end gap-2 border-t border-border pt-3">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder="Take your time…"
          className="min-h-[52px] resize-none text-[15px]"
        />
        <Button onClick={submit} disabled={thinking || !input.trim()} className="h-[52px] px-4">
          {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
