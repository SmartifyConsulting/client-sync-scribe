import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, FileText, Keyboard, Loader2, Mail, Mic, Pause, Play, RotateCcw, Send, Share2, Sparkles, Square, Trash2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { safeInvoke } from "@/services/edge/safeInvoke";
import { useMaeveSession } from "../hooks/useMaeveSession";
import { useMaeveVoice } from "../hooks/useMaeveVoice";
import { processLabel, stateLabel } from "../lib/processes";
import { CLIENT_FALLBACK, looksLikeAdvice } from "../lib/suggestionDetector";
import { buildTranscript, downloadTranscript, shareTranscript, transcriptFileName } from "../lib/transcript";
import { downloadTranscriptPdf } from "../lib/maevePdf";
import { deleteMaeveSession } from "../lib/deleteSession";
import { supabase } from "@/integrations/supabase/client";
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
import { SessionTitleEditor } from "./SessionTitleEditor";
import { MaeveVoicePicker } from "./MaeveVoicePicker";

import holarcLogoAsset from "@/assets/holarc-health-logo.png.asset.json";

const logo = holarcLogoAsset.url;

interface Props {
  sessionId: string;
  /** Skips the mode picker when the patient already chose how to continue. */
  initialMode?: "type" | "talk";
}

type MaeveMode = "type" | "talk";
const MODE_KEY = "maeve-mode";

export function MaeveChat({ sessionId, initialMode }: Props) {
  const navigate = useNavigate();
  const { session, messages, loading, thinking, error, send, reload } = useMaeveSession(sessionId);
  const [input, setInput] = useState("");
  const [showWhat, setShowWhat] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mode, setMode] = useState<MaeveMode | null>(
    () => initialMode ?? (localStorage.getItem(MODE_KEY) as MaeveMode | null) ?? null,
  );
  const [muted, setMuted] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [makingPdf, setMakingPdf] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmMessageId, setConfirmMessageId] = useState<string | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const openedRef = useRef(false);
  const spokenRef = useRef<string | null>(null);
  const autoListenRef = useRef<() => void>(() => {});

  // Hands-free: as soon as Maeve stops speaking, the microphone opens itself.
  const voice = useMaeveVoice({ onSpeechEnd: () => autoListenRef.current() });

  const chooseMode = (next: MaeveMode) => {
    localStorage.setItem(MODE_KEY, next);
    setMode(next);
  };

  const startOpening = useCallback(() => {
    openedRef.current = true;
    send("", true);
  }, [send]);

  useEffect(() => {
    if (loading || openedRef.current || !mode) return;
    if (messages.length === 0) startOpening();
  }, [loading, messages.length, mode, startOpening]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, thinking]);

  useEffect(() => {
    if (!thinking && mode === "type") inputRef.current?.focus();
  }, [thinking, sessionId, mode]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Read Maeve's newest reply aloud in talk mode.
  useEffect(() => {
    if (mode !== "talk" || thinking) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (spokenRef.current === last.id) return;
    spokenRef.current = last.id;
    if (muted) {
      // Muted: skip straight to listening so talk mode stays hands-free.
      autoListenRef.current();
      return;
    }
    const body = looksLikeAdvice(last.content) ? CLIENT_FALLBACK : last.content;
    voice.speak(body);
  }, [messages, mode, muted, thinking, voice]);

  const handleMic = async () => {
    if (thinking || voice.transcribing) return;
    if (!voice.recording) {
      const ok = await voice.startRecording();
      if (!ok) toast.error("Microphone unavailable — you can keep typing instead.");
      return;
    }
    if (voice.paused) {
      voice.resumeRecording();
      return;
    }
    const text = await voice.stopRecordingAndTranscribe();
    if (!text) {
      toast.error("I didn't catch that — try again.");
      return;
    }
    await send(text);
  };

  // Kept in a ref so the voice hook can trigger it without re-subscribing.
  autoListenRef.current = () => {
    if (mode !== "talk" || thinking || voice.recording || voice.transcribing) return;
    if (session?.status === "closed") return;
    void voice.startRecording();
  };


  // Leaving the screen (tab hidden, window blurred, navigating away) pauses the
  // recording and mutes the microphone. The exploration stays open so the
  // patient can come back and carry on where they left off.
  const pauseRef = useRef(voice.pauseRecording);
  pauseRef.current = voice.pauseRecording;
  useEffect(() => {
    const pause = () => {
      if (pauseRef.current()) toast("Paused — tap resume when you're ready.");
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pause);
    window.addEventListener("pagehide", pause);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pause);
      window.removeEventListener("pagehide", pause);
    };
  }, []);


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
    // Always release the microphone when the exploration ends.
    voice.stopSpeaking();
    voice.releaseMicrophone();
    const { error: err } = await safeInvoke("ask-maeve-summary", { session_id: sessionId });
    setClosing(false);
    if (err) {
      toast.error(err);
      return;
    }
    await reload();
    if (messages.length > 0) {
      const ok = await downloadTranscriptPdf(session, messages);
      toast[ok ? "success" : "error"](
        ok ? "Exploration closed — PDF saved to your device" : "Exploration closed, but the PDF could not be created",
      );
    }
  };

  const transcriptText = () => buildTranscript(session, messages);

  const saveTranscript = () => {
    if (messages.length === 0) return;
    downloadTranscript(transcriptText(), transcriptFileName(session));
    toast.success("Transcript saved to your device");
  };

  const savePdf = async () => {
    if (messages.length === 0 || makingPdf) return;
    setMakingPdf(true);
    const ok = await downloadTranscriptPdf(session, messages);
    setMakingPdf(false);
    toast[ok ? "success" : "error"](ok ? "PDF saved to your device" : "Could not create the PDF");
  };

  const share = async () => {
    if (messages.length === 0) return;
    const result = await shareTranscript(transcriptText(), session?.title || "Ask Maeve exploration");
    if (result === "copied") toast.success("Transcript copied — paste it into WhatsApp, email or notes");
    if (result === "failed") toast.error("Sharing isn't available here — try saving the transcript instead");
  };

  const emailTranscript = async () => {
    if (messages.length === 0 || emailing) return;
    setEmailing(true);
    const { data } = await supabase.auth.getUser();
    const to = data.user?.email;
    if (!to) {
      setEmailing(false);
      toast.error("No email address on your account");
      return;
    }
    const { error: err } = await safeInvoke("send-document-email", {
      to,
      subject: `Your Ask Maeve transcript — ${new Date(session?.created_at ?? Date.now()).toLocaleDateString()}`,
      documentName: session?.title || "Ask Maeve exploration",
      documentContent: transcriptText(),
      senderName: "Ask Maeve",
    });
    setEmailing(false);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success(`Transcript emailed to ${to}`);
  };

  const removeSession = async () => {
    setDeleting(true);
    const ok = await deleteMaeveSession(sessionId);
    setDeleting(false);
    if (!ok) {
      toast.error("Could not delete this exploration");
      return;
    }
    setConfirmDelete(false);
    toast.success("Exploration deleted");
    navigate("/ask-maeve");
  };

  const removeMessage = async (messageId: string) => {
    setDeletingMessage(true);
    const { error: err } = await supabase.from("ask_maeve_messages").delete().eq("id", messageId);
    setDeletingMessage(false);
    if (err) {
      toast.error("Could not delete that message");
      return;
    }
    setConfirmMessageId(null);
    toast.success("Message deleted");
    reload();
  };

  const currentProcess = processLabel(
    [...messages].reverse().find((m) => m.process_key)?.process_key,
  );
  const current = stateLabel(session?.conversation_state);

  if (!mode) {
    return (
      <div className="mx-auto w-full max-w-2xl px-1 py-8">
        <div className="flex justify-center pb-5">
          <img src={logo} alt="Holarc Health" className="h-24 w-auto" />
        </div>
        <h1 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
          <Sparkles className="h-5 w-5 text-maeve" />
          Ask Maeve
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          How would you like to explore today? You can change this at any time.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => chooseMode("type")}
            className="rounded-2xl border border-border p-5 text-left transition hover:border-maeve"
          >
            <Keyboard className="h-6 w-6 text-maeve" />
            <p className="mt-3 text-sm font-semibold text-foreground">Type</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Write your answers in your own time. Best when you have no privacy, or when you'd rather stay quiet.
            </p>
          </button>
          <button
            onClick={() => chooseMode("talk")}
            className="rounded-2xl border border-border p-5 text-left transition hover:border-maeve"
          >
            <Mic className="h-6 w-6 text-maeve" />
            <p className="mt-3 text-sm font-semibold text-foreground">Talk and listen</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Speak your answers and hear Maeve's questions read aloud. Audio lets you close your eyes and sink into
              the process, so the conscious mind isn't distracted by a screen or keyboard. Because this work asks you
              to imagine, remember and visualise, listening and speaking usually goes much deeper.
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-11rem)] w-full max-w-3xl flex-col">
      <div className="flex justify-center pb-3">
        <img src={logo} alt="Holarc Health" className="h-24 w-auto" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <Sparkles className="h-5 w-5 text-maeve" />
            Ask Maeve
          </h1>
          <div className="mt-1">
            <div className="flex items-center gap-1.5">
              <SessionTitleEditor sessionId={sessionId} title={session?.title} onRenamed={() => reload()} />
              <button
                aria-label="Delete this exploration"
                onClick={() => setConfirmDelete(true)}
                className="rounded-full border border-border p-1 text-muted-foreground transition hover:border-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
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
          <button
            onClick={() => {
              voice.stopSpeaking();
              chooseMode(mode === "talk" ? "type" : "talk");
            }}
            className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:border-maeve hover:text-maeve-dark"
          >
            {mode === "talk" ? <Keyboard className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
            {mode === "talk" ? "Type instead" : "Talk instead"}
          </button>
          {mode === "talk" && (
            <>
              <MaeveVoicePicker
                voiceId={voice.voiceId}
                onChange={(id, label) => {
                  voice.setVoiceId(id, label);
                  voice.speak("This is how I'll sound.", id);
                }}
                onPreview={(id) => voice.speak("This is how I'll sound.", id)}
              />
              <button
                onClick={() => {
                  if (!muted) voice.stopSpeaking();
                  setMuted((v) => !v);
                }}
                className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:border-maeve hover:text-maeve-dark"
              >
                {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                {muted ? "Muted" : "Voice on"}
              </button>
            </>
          )}

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
            const full = isMaeve && looksLikeAdvice(m.content) ? CLIENT_FALLBACK : m.content;
            // While Maeve is speaking, her words type themselves onto the
            // screen in time with the audio.
            const isBeingSpoken = isMaeve && voice.speaking && voice.speakingText === full;
            const body = isBeingSpoken
              ? full.slice(0, Math.max(1, Math.round(full.length * voice.speechProgress)))
              : full;
            return (
              <div
                key={m.id}
                className={cn("group flex items-start gap-1.5", isMaeve ? "justify-start" : "justify-end")}
              >
                {!isMaeve && (
                  <button
                    aria-label="Delete this message"
                    onClick={() => setConfirmMessageId(m.id)}
                    className="mt-2 rounded-full border border-transparent p-1 text-muted-foreground opacity-0 transition focus:opacity-100 group-hover:opacity-100 hover:border-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
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
                {isMaeve && (
                  <button
                    aria-label="Delete this message"
                    onClick={() => setConfirmMessageId(m.id)}
                    className="mt-2 rounded-full border border-transparent p-1 text-muted-foreground opacity-0 transition focus:opacity-100 group-hover:opacity-100 hover:border-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
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
          {closing ? "Closing…" : "Stop and close (saves PDF)"}
        </button>
        <button
          onClick={() => navigate("/ask-maeve")}
          className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-maeve hover:text-maeve-dark"
        >
          All explorations
        </button>
      </div>

      {/* Transcript actions */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          disabled={messages.length === 0}
          onClick={saveTranscript}
          className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-maeve hover:text-maeve-dark disabled:opacity-50"
        >
          <Download className="h-3 w-3" /> Save transcript
        </button>
        <button
          disabled={messages.length === 0 || makingPdf}
          onClick={savePdf}
          className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-maeve hover:text-maeve-dark disabled:opacity-50"
        >
          {makingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />} Save PDF
        </button>
        <button
          disabled={messages.length === 0}
          onClick={share}
          className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-maeve hover:text-maeve-dark disabled:opacity-50"
        >
          <Share2 className="h-3 w-3" /> Share
        </button>
        <button
          disabled={messages.length === 0 || emailing}
          onClick={emailTranscript}
          className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-maeve hover:text-maeve-dark disabled:opacity-50"
        >
          {emailing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />} Email to me
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" /> Delete exploration
        </button>
        <span className="text-[11px] text-muted-foreground">
          Once you share or email it, this conversation leaves your private space.
        </span>
      </div>

      <AlertDialog
        open={confirmMessageId !== null}
        onOpenChange={(open) => !open && setConfirmMessageId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be permanently removed from this exploration, and from any summary or PDF made from here on.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingMessage}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingMessage}
              onClick={(e) => {
                e.preventDefault();
                if (confirmMessageId) removeMessage(confirmMessageId);
              }}
            >
              {deletingMessage ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this exploration?</AlertDialogTitle>
            <AlertDialogDescription>
              The whole conversation will be permanently removed. Save or share the transcript first if you'd like to
              keep it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={removeSession} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Failed opening — visible error with a retry instead of an empty screen */}
      {error && messages.length === 0 && !thinking && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2">
          <p className="text-xs text-foreground">Maeve could not start this exploration.</p>
          <Button size="sm" variant="outline" onClick={startOpening} className="h-7 gap-1 text-xs">
            <RotateCcw className="h-3 w-3" /> Try again
          </Button>
        </div>
      )}

      {/* Composer */}
      {mode === "talk" ? (
        <div className="mt-2 flex flex-col items-center gap-2 border-t border-border pt-3">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleMic}
              disabled={thinking || voice.transcribing}
              className={cn(
                "h-16 w-16 rounded-full",
                voice.recording && !voice.paused
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-maeve text-maeve-foreground hover:bg-maeve-dark",
              )}
            >
              {voice.transcribing ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : voice.paused ? (
                <Play className="h-6 w-6" />
              ) : voice.recording ? (
                <Send className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>
            {voice.recording && !voice.paused && (
              <button
                onClick={() => voice.pauseRecording()}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-maeve hover:text-maeve-dark"
              >
                <Pause className="h-3.5 w-3.5" /> Pause
              </button>
            )}
            <button
              disabled={closing}
              onClick={closeSession}
              className="flex items-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-destructive hover:text-destructive disabled:opacity-50"
            >
              <Square className="h-3.5 w-3.5" /> {closing ? "Stopping…" : "Stop"}
            </button>
          </div>
          {voice.recording && voice.liveText && (
            <p className="max-w-xl rounded-xl bg-muted/60 px-3 py-2 text-center text-[13px] italic leading-relaxed text-foreground">
              {voice.liveText}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            {voice.transcribing
              ? "Listening back…"
              : voice.paused
                ? "Paused — the microphone is off. Tap play to carry on."
                : voice.recording
                  ? "I'm listening — tap send when you're done, or pause to step away"
                  : voice.speaking
                    ? "Maeve is speaking — the microphone opens as soon as she finishes."
                    : "Tap to speak. Stop ends the exploration, saves the PDF and releases the microphone."}
          </p>

          {voice.speaking && (
            <button
              onClick={voice.stopSpeaking}
              className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:border-maeve hover:text-maeve-dark"
            >
              Stop audio
            </button>
          )}
        </div>
      ) : (
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
      )}

    </div>
  );
}
