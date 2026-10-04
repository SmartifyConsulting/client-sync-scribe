import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_BYTES = 14 * 1024 * 1024;
const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Wealth Manager records a client meeting in the Live Workspace. We transcribe it,
 * save it as a consultation (sessions row) for that client, and return the id so
 * extract-financials can fill in the client's financial information from it.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Please sign in again." }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: ce } = await userClient.auth.getClaims(auth.slice(7));
    if (ce || !claims?.claims) return json({ error: "Please sign in again." }, 401);
    const uid = claims.claims.sub as string;

    const form = await req.formData();
    const patientId = String(form.get("patientId") ?? "");
    const file = form.get("file");
    if (!UUID.test(patientId)) return json({ error: "Invalid client." }, 400);
    if (!(file instanceof File) || !file.size) return json({ error: "The recording is empty. Please record again." }, 400);
    if (file.size > MAX_BYTES) return json({ error: "The recording is too long (over about 60 minutes). Record shorter parts." }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: pat } = await admin.from("patients").select("id,user_id,name").eq("id", patientId).maybeSingle();
    if (!pat || pat.user_id !== uid) return json({ error: "Only this client's Wealth Manager can record the meeting." }, 403);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Transcription isn't set up yet." }, 500);
    const audio = new File([await file.arrayBuffer()], "meeting.webm", { type: "audio/webm" });
    const fd = new FormData();
    fd.append("model", "google/gemini-3.5-transcribe");
    fd.append("file", audio, audio.name);
    fd.append("response_format", "json");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd,
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("transcribe failed", r.status, t);
      const msg = r.status === 402 ? "AI credits have run out. Please top up and try again."
        : r.status === 429 ? "Too many requests right now. Please try again in a minute."
        : "We couldn't transcribe the recording. Your audio was not saved — please try again.";
      return json({ error: msg }, r.status === 402 || r.status === 429 ? r.status : 502);
    }
    const out = await r.json();
    const text = String(out?.text ?? "").trim();
    if (!text) return json({ error: "No speech was heard in the recording. Check your microphone and try again." }, 422);

    const { data: s, error: se } = await admin.from("sessions").insert({
      user_id: uid, patient_id: patientId, title: "Financial health meeting", transcript: text, status: "completed",
    }).select("id").single();
    if (se) { console.error(se); return json({ error: "The transcript couldn't be saved. Please try again." }, 500); }
    return json({ ok: true, sessionId: s.id, chars: text.length });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong while processing the recording. Please try again." }, 500);
  }
});
