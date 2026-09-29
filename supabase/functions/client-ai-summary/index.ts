import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Body = z.object({ patientId: z.string().uuid() });
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Please sign in again." }, 401);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "A valid client is required." }, 400);
    const { patientId } = parsed.data;

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Please sign in again." }, 401);
    // Access check via RLS: caller must be able to see this client record.
    const { data: rec } = await userClient.from("patients").select("id, name").eq("id", patientId).maybeSingle();
    if (!rec) return json({ error: "You don't have access to this client." }, 403);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const [sessions, events, claims, apps] = await Promise.all([
      admin.from("sessions").select("started_at, summary").eq("patient_id", patientId).not("summary", "is", null).order("started_at", { ascending: false }).limit(30),
      admin.from("client_life_events").select("event_type, event_date, notes").eq("patient_id", patientId).order("event_date", { ascending: false }).limit(50),
      admin.from("wealth_claims").select("*").eq("patient_id", patientId).limit(20),
      admin.from("wealth_applications").select("*").eq("patient_id", patientId).limit(20),
    ]);

    const lines: string[] = [];
    for (const s of sessions.data ?? []) lines.push(`Consultation ${String(s.started_at).slice(0, 10)}: ${s.summary}`);
    for (const e of events.data ?? []) lines.push(`Life event ${e.event_date}: ${e.event_type}${e.notes ? ` — ${e.notes}` : ""}`);
    for (const c of claims.data ?? []) lines.push(`Claim: ${JSON.stringify(c).slice(0, 300)}`);
    for (const a of apps.data ?? []) lines.push(`Application/policy: ${JSON.stringify(a).slice(0, 300)}`);

    let summary = "No consultations or life events have been recorded yet.";
    if (lines.length) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")!,
          Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          stream: true,
          store: false,
          reasoning: { effort: "low" },
          instructions:
            "You are a wealth-management assistant. Write a concise client summary (max 180 words) for the client and their adviser: current situation, key life events, decisions from consultations, open items. Plain professional English, no advice, no medical wording. Use short paragraphs or bullets.",
          input: `Client: ${rec.name}\n\n${lines.join("\n")}`,
        }),
      });
      if (!res.ok || !res.body) {
        const status = res.status;
        const msg = status === 429 ? "Too many requests — try again shortly." : status === 402 ? "AI credits have run out." : "The summary couldn't be generated.";
        return json({ error: msg }, status >= 400 ? status : 500);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", out = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() ?? "";
        for (const line of parts) {
          if (!line.startsWith("data:")) continue;
          const d = line.slice(5).trim();
          if (!d || d === "[DONE]") continue;
          try {
            const ev = JSON.parse(d);
            if (ev.type === "response.output_text.delta") out += ev.delta;
          } catch { /* partial */ }
        }
      }
      if (out.trim()) summary = out.trim();
    }

    const now = new Date().toISOString();
    const { data: existing } = await admin.from("client_financial_profiles").select("id").eq("patient_id", patientId).maybeSingle();
    if (existing) await admin.from("client_financial_profiles").update({ ai_summary: summary, ai_summary_updated_at: now }).eq("patient_id", patientId);
    else await admin.from("client_financial_profiles").insert({ patient_id: patientId, ai_summary: summary, ai_summary_updated_at: now });

    return json({ summary, updatedAt: now });
  } catch (e) {
    console.error(e);
    return json({ error: "The summary couldn't be generated. Please try again." }, 500);
  }
});
