import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You read a patient's PRIVATE emotional journal and produce an extremely conservative, sanitised clinical note.

Hard rules:
- NEVER repeat names, people, places, employers, events, quotes or any identifying specifics.
- Abstract everything to a general theme. Example: "father and daughter had a fight" -> "internal family conflict".
- The metaphysical note offers a tentative symbolic/emotional association for physical pains the patient reports ("may be associated with ..."). It is never a cause, never a diagnosis, never treatment advice.
- SILENCE IS THE DEFAULT. If the journal is thin, trivial, or nothing substantial emerges, return empty strings for every field.
- Keep each field to one short sentence.

Return strict JSON:
{"theme":"","metaphysical_note":"","entries":[{"id":"","summation":""}]}
Where "summation" is a one-line generalised summary of that entry (no specifics), or "" when nothing substantial.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const patientId: string | null = typeof body?.patientId === "string" ? body.patientId : null;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Only ever read the CALLER'S OWN journal.
    const { data: entries } = await admin
      .from("patient_emotional_journal")
      .select("id, entry_date, body")
      .eq("patient_user_id", user.id)
      .order("entry_date", { ascending: false })
      .limit(30);

    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({ theme: "", metaphysical_note: "", entries: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve the patient record owned by this user (used for clinician-visible insights).
    let resolvedPatientId = patientId;
    if (resolvedPatientId) {
      const { data: owned } = await admin
        .from("patients")
        .select("id")
        .eq("id", resolvedPatientId)
        .eq("patient_user_id", user.id)
        .maybeSingle();
      if (!owned) resolvedPatientId = null;
    }
    if (!resolvedPatientId) {
      const { data: own } = await admin
        .from("patients")
        .select("id")
        .eq("patient_user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      resolvedPatientId = own?.id ?? null;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const journalText = entries
      .map((e: any) => `[id:${e.id}] ${e.entry_date}: ${String(e.body).slice(0, 2000)}`)
      .join("\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: journalText },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429 || aiRes.status === 402) {
      return new Response(JSON.stringify({ error: aiRes.status === 429 ? "Rate limit exceeded, please try again shortly." : "AI credits exhausted." }), {
        status: aiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) throw new Error(`AI gateway error ${aiRes.status}`);

    const aiJson = await aiRes.json();
    let parsed: any = {};
    try {
      parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }

    const theme = String(parsed.theme || "").trim();
    const note = String(parsed.metaphysical_note || "").trim();
    const perEntry: any[] = Array.isArray(parsed.entries) ? parsed.entries : [];
    const validIds = new Set(entries.map((e: any) => e.id));

    // Replace previous insights for this user with the fresh, sanitised set.
    await admin.from("patient_emotional_insights").delete().eq("patient_user_id", user.id);

    const rows: any[] = [];
    for (const pe of perEntry) {
      const summation = String(pe?.summation || "").trim();
      if (!summation || !validIds.has(pe?.id)) continue;
      rows.push({
        patient_user_id: user.id,
        patient_id: resolvedPatientId,
        entry_id: pe.id,
        summation,
        source_entry_count: entries.length,
      });
    }
    if (theme || note) {
      rows.push({
        patient_user_id: user.id,
        patient_id: resolvedPatientId,
        entry_id: null,
        theme: theme || null,
        metaphysical_note: note || null,
        source_entry_count: entries.length,
      });
    }
    if (rows.length) await admin.from("patient_emotional_insights").insert(rows);

    return new Response(JSON.stringify({ theme, metaphysical_note: note, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
