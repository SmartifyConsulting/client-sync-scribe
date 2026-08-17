import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Keyboard, Loader2, Mic, Sparkles, Square, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { safeInvoke } from "@/services/edge/safeInvoke";
import { useMaeveSession } from "../hooks/useMaeveSession";
import { useMaeveVoice } from "../hooks/useMaeveVoice";
import { CLIENT_FALLBACK, looksLikeAdvice } from "../lib/suggestionDetector";
import { SessionTitleEditor } from "./SessionTitleEditor";
import holarcLogoAsset from "@/assets/holarc-health-logo.png.asset.json";

const logo = holarcLogoAsset.url;

interface Props {
  sessionId: string;
  onContinue: (mode: "talk" | "type") => void;
}

/**
 * Recap of a past exploration: overarching summary, collapsed transcript and
 * the choice to carry on by voice or by typing.
 */
export function MaeveRecap({ sessionId, onContinue }: Props) {
  const navigate = useNavigate();
  const { session, messages, loading, reload } = useMaeveSession(sessionId);
  const voice = useMaeveVoice();
  const [summary, setSummary] = useState<string | null>(null);
  const [summarising, setSummarising] = useState(false);
  const [openTranscript, setOpenTranscript] = useState(false);
  const requestedRef = useRef(false);

  const stored = session?.session_summary ?? null;
  const text = summary ?? stored;

  useEffect(() => {
    if (loading || requestedRef.current) return;
    if (stored || messages.length === 0) return;
    requestedRef.current = true;
    setSummarising(true);
    safeInvoke("ask-maeve-summary", { session_id: sessionId, mode: "recap" }).then(({ data, error }: any) => {
      setSummarising(false);
      if (error) return;
      setSummary(data?.summary ?? null);
      reload();
    });
  }, [loading, stored, messages.length, sessionId, reload]);

  const toggleSpeak = () => {
    if (voice.speaking) {
      voice.stopSpeaking();
      return;
    }
    if (!text) {
      toast("There's nothing to read out yet.");
      return;
    }
    voice.speak(text);
  };

  const startContinue = (mode: "talk" | "type") => {
    voice.stopSpeaking();
    onContinue(mode);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const closed = session?.status === "closed";

  return (
    <div className="mx-auto w-full max-w-3xl px-1 pb-10">
      <div className="flex justify-center pb-4 pt-2">
        <img src={logo} alt="Holarc Health" className="h-24 w-auto" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <Sparkles className="h-5 w-5 text-maeve" />
            Ask Holarc
          </h1>
          <div className="mt-1">
            <SessionTitleEditor sessionId={sessionId} title={session?.title} onRenamed={() => reload()} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date(session?.created_at ?? Date.now()).toLocaleDateString()} ·{" "}
            {closed ? "Exploration closed" : "Exploration in progress"}
          </p>
        </div>
        <button
          onClick={() => navigate("/ask-maeve")}
          className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-maeve hover:text-maeve-dark"
        >
          All explorations
        </button>
      </div>

      {/* Overarching summary */}
      <div className="mt-4 rounded-2xl border border-maeve/40 bg-maeve/5 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-maeve-dark">Where we got to</p>
          <button
            onClick={toggleSpeak}
            className="flex shrink-0 items-center gap-1 rounded-full border border-maeve/40 px-2.5 py-1 text-[11px] font-semibold text-maeve-dark transition hover:bg-maeve/10"
          >
            {voice.speaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            {voice.speaking ? "Stop" : "Read this to me"}
          </button>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
          {summarising ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Gathering what you explored…
            </span>
          ) : (
            text || "This exploration hasn't started yet."
          )}
        </p>
      </div>

      {/* Collapsed transcript */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-border">
        <button
          onClick={() => setOpenTranscript((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-foreground transition hover:bg-muted/50"
        >
          <span>Transcript ({messages.length} messages)</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", openTranscript && "rotate-180")} />
        </button>
        {openTranscript && (
          <div className="max-h-[45vh] space-y-3 overflow-y-auto border-t border-border px-4 py-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing was said in this exploration.</p>
            ) : (
              messages.map((m) => {
                const isMaeve = m.role === "assistant";
                const body = isMaeve && looksLikeAdvice(m.content) ? CLIENT_FALLBACK : m.content;
                return (
                  <div key={m.id} className={cn("flex", isMaeve ? "justify-start" : "justify-end")}>
                    <div
                      className={cn(
                        "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
                        isMaeve
                          ? "border border-maeve/30 bg-maeve/5 text-foreground"
                          : "bg-primary text-primary-foreground",
                      )}
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-wider opacity-70">
                        {isMaeve ? "Angel" : "You"} · {new Date(m.created_at).toLocaleDateString()}
                      </span>
                      {body}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Continue */}
      <div className="mt-5">
        <p className="text-sm font-semibold text-foreground">
          {closed ? "Would you like to reopen and continue?" : "Would you like to continue?"}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => startContinue("talk")}
            className="rounded-2xl border border-border p-5 text-left transition hover:border-maeve"
          >
            <Mic className="h-6 w-6 text-maeve" />
            <p className="mt-3 text-sm font-semibold text-foreground">Continue with voice</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Speak your answers and hear Angel read hers aloud. Your microphone is only asked for when you tap this.
            </p>
          </button>
          <button
            onClick={() => startContinue("type")}
            className="rounded-2xl border border-border p-5 text-left transition hover:border-maeve"
          >
            <Keyboard className="h-6 w-6 text-maeve" />
            <p className="mt-3 text-sm font-semibold text-foreground">Continue with typing</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Carry on in writing, in your own time and without anyone overhearing.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
