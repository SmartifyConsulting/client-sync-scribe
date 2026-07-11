import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { VoiceNoteAudio } from "./VoiceNoteAudio";
import { useTranslation } from "react-i18next";

type Note = {
  id: string; audio_url: string; transcript: string | null; created_at: string;
  duration_seconds: number | null; user_id: string; provider_id: string | null;
  actor_name?: string; provider_name?: string;
};

export function IncidentVoiceNoteRecorder({
  incidentId, providerId,
}: { incidentId: string; providerId: string | null }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);

  const load = async () => {
    const { data } = await supabase.from("holarchelp_voice_notes" as any)
      .select("id, audio_url, transcript, created_at, duration_seconds, user_id, provider_id")
      .eq("incident_id", incidentId).order("created_at", { ascending: false });
    const rows = (data as any[]) ?? [];
    // Enrich with names
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
    const provIds = Array.from(new Set(rows.map((r) => r.provider_id).filter(Boolean)));
    const [{ data: profs }, { data: provs }] = await Promise.all([
      userIds.length ? supabase.from("profiles").select("id, full_name").in("id", userIds) : Promise.resolve({ data: [] as any[] }) as any,
      provIds.length ? supabase.from("holarchelp_ambulance_providers_public" as any).select("id, company_name").in("id", provIds) : Promise.resolve({ data: [] as any[] }) as any,
    ]);
    const pMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
    const cMap = new Map((provs ?? []).map((p: any) => [p.id, p.company_name]));
    setNotes(rows.map((r) => ({ ...r, actor_name: pMap.get(r.user_id), provider_name: r.provider_id ? cMap.get(r.provider_id) : undefined })));
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`vn-${incidentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_voice_notes", filter: `incident_id=eq.${incidentId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [incidentId]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => upload(stream);
      rec.start(250);
      recRef.current = rec;
      startedAtRef.current = Date.now();
      setRecording(true);
    } catch (e: any) {
      toast.error(t("voiceNotes.micPermission"));
    }
  };

  const stop = () => { recRef.current?.stop(); setRecording(false); };

  const upload = async (stream: MediaStream) => {
    if (!user) return;
    setBusy(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const dur = (Date.now() - startedAtRef.current) / 1000;

      // Guard: empty / silent recording. Don't upload, don't transcribe, don't hallucinate.
      if (blob.size < 1500 || dur < 0.5) {
        toast.message(t("voiceNotes.noneCaptured", { defaultValue: "No recording captured" }));
        return;
      }

      const path = `holarchelp/${incidentId}/${crypto.randomUUID()}.webm`;
      const { error: upErr } = await supabase.storage.from("session-audio").upload(path, blob, { contentType: "audio/webm" });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("holarchelp_voice_notes" as any).insert({
        incident_id: incidentId, user_id: user.id, provider_id: providerId,
        audio_url: path, duration_seconds: Number(dur.toFixed(1)),
      } as any);
      if (insErr) throw insErr;
      await supabase.from("holarchelp_incident_events" as any).insert({
        incident_id: incidentId, provider_id: providerId, actor_user_id: user.id,
        event_type: "voice_note", payload: { duration: Number(dur.toFixed(1)) },
      } as any);
      // best-effort transcription with retries; only persist when a real transcript comes back
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const b64 = (reader.result as string).split(",")[1];
          let text = "";
          const delays = [0, 1000, 3000];
          for (const d of delays) {
            if (d) await new Promise((r) => setTimeout(r, d));
            try {
              const { data: tx } = await supabase.functions.invoke("transcribe-audio", { body: { audio: b64 } });
              if (tx?.text) { text = String(tx.text); break; }
            } catch { /* retry */ }
          }
          if (!text) return; // never store placeholder text
          const { data: latest } = await (supabase.from("holarchelp_voice_notes" as any) as any)
            .select("id").eq("incident_id", incidentId).eq("audio_url", path).maybeSingle();
          if ((latest as any)?.id) {
            await supabase.from("holarchelp_voice_notes" as any).update({
              transcript: text,
            } as any).eq("id", (latest as any).id);
          }
        };
        reader.readAsDataURL(blob);
      } catch { /* ignore */ }
      toast.success(t("voiceNotes.saved"));
    } catch (e: any) {
      toast.error(e?.message ?? t("voiceNotes.failedSave"));
    } finally {
      stream.getTracks().forEach((t) => t.stop());
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("voiceNotes.title")}</p>
        {!recording ? (
          <Button size="sm" onClick={start} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />} {t("voiceNotes.record")}
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={stop} className="gap-1.5">
            <Square className="h-4 w-4" /> {t("voiceNotes.stop")}
          </Button>
        )}
      </div>
      <div className="mt-3 space-y-3">
        {notes.length === 0 && <p className="text-sm text-muted-foreground">{t("voiceNotes.none")}</p>}
        {notes.map((n) => (
          <div key={n.id} className="rounded-xl border p-3">
            <p className="text-xs font-semibold">
              🎤 {n.actor_name ?? t("common.unknown")} {n.provider_name ? `— ${n.provider_name}` : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {new Date(n.created_at).toLocaleString()} {n.duration_seconds ? `· ${n.duration_seconds.toFixed(1)}s` : ""}
            </p>
            {n.transcript && <p className="mt-1.5 whitespace-pre-wrap text-sm">{n.transcript}</p>}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1"><VoiceNoteAudio path={n.audio_url} /></div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={async () => {
                  toast.message(t("voiceNotes.retranscribing"));
                  try {
                    const { data: signed } = await supabase.storage.from("session-audio").createSignedUrl(n.audio_url, 120);
                    if (!signed?.signedUrl) throw new Error("Could not access audio");
                    const ar = await fetch(signed.signedUrl);
                    const blob = await ar.blob();
                    const b64 = await new Promise<string>((res, rej) => {
                      const r = new FileReader();
                      r.onloadend = () => res((r.result as string).split(",")[1] || "");
                      r.onerror = rej;
                      r.readAsDataURL(blob);
                    });
                    const { data, error } = await supabase.functions.invoke("transcribe-audio", { body: { audio: b64 } });
                    if (error || !(data as any)?.text) throw new Error("Empty transcript");
                    await supabase.from("holarchelp_voice_notes" as any).update({ transcript: String((data as any).text) } as any).eq("id", n.id);
                    toast.success(t("voiceNotes.updated"));
                  } catch (e: any) {
                    toast.error(e?.message ?? "Retry failed");
                  }
                }}
              >
                {t("voiceNotes.retry")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
