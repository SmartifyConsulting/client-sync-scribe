import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TRANSCRIPT_CHARS = 12000;

const SYSTEM = `You extract rapport signals from a clinical consultation transcript.

Rules — follow exactly:
- Only quote the PATIENT, never the clinician.
- Quotes must be VERBATIM and short (max 20 words). Never paraphrase or invent wording.
- Never include clinical, diagnostic, symptom, medication or treatment content in a quote or label.
- Only return lines that clearly show HOW the person communicates or what builds their trust.
- If nothing clear appears, return an empty list.

For each quote give a plain-language signal_label (max 6 words, e.g. "Wants a clear, direct position")
and supports_pattern, an integer 1-9 from this internal map:
1 correctness/standards, 2 helping others, 3 achievement/progress, 4 authenticity/being understood,
5 information/space, 6 security/preparing for risk, 7 options/positivity, 8 control/directness,
9 harmony/avoiding conflict.

Return at most 3 items.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const supaAuth = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supaAuth.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const session_id: string | undefined = body?.session_id;
    if (!session_id) return json({ error: "session_id required" }, 400);

    const supa = createClient(SUPABASE_URL, SERVICE);

    // The caller must be able to see the session (owner of the session record).
    const { data: session } = await supaAuth
      .from("sessions")
      .select("id, patient_id, transcript, created_at, started_at")
      .eq("id", session_id)
      .maybeSingle();

    if (!session?.patient_id) return json({ error: "Session not found" }, 404);
    const transcript = (session.transcript || "").trim();
    if (transcript.length < 200) return json({ inserted: 0, reason: "transcript too short" });

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: transcript.slice(0, MAX_TRANSCRIPT_CHARS) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_evidence",
            description: "Report rapport evidence quotes",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      quote: { type: "string" },
                      signal_label: { type: "string" },
                      supports_pattern: { type: "integer" },
                    },
                    required: ["quote", "signal_label", "supports_pattern"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["items"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_evidence" } },
      }),
    });

    if (resp.status === 429) return json({ error: "Rate limited" }, 429);
    if (resp.status === 402) return json({ error: "AI credits exhausted" }, 402);
    if (!resp.ok) return json({ error: `AI error ${resp.status}` }, 502);

    const ai = await resp.json();
    const args = ai?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let items: any[] = [];
    try {
      items = JSON.parse(args || "{}")?.items ?? [];
    } catch {
      items = [];
    }

    const sessionDate = session.started_at || session.created_at || new Date().toISOString();
    const rows = items
      .filter((i) => typeof i?.quote === "string" && i.quote.trim().length > 5)
      .slice(0, 3)
      .map((i) => ({
        patient_id: session.patient_id,
        session_id: session.id,
        quote: i.quote.trim().slice(0, 300),
        signal_label: String(i.signal_label || "Communication signal").slice(0, 80),
        supports_pattern:
          Number.isInteger(i.supports_pattern) && i.supports_pattern >= 1 && i.supports_pattern <= 9
            ? i.supports_pattern
            : null,
        session_date: sessionDate,
        source: "transcript",
      }));

    if (rows.length === 0) return json({ inserted: 0 });

    // Verbatim guard: drop anything not present in the transcript.
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    const haystack = norm(transcript);
    const verified = rows.filter((r) => haystack.includes(norm(r.quote)));
    if (verified.length === 0) return json({ inserted: 0, reason: "no verbatim match" });

    // Re-running for a session replaces its previous evidence.
    await supa.from("patient_relationship_evidence").delete().eq("session_id", session.id);
    const { error } = await supa.from("patient_relationship_evidence").insert(verified);
    if (error) console.error("insert error", error);

    return json({ inserted: verified.length });
  } catch (e) {
    console.error("extract-relationship-evidence error", e);
    return json({ error: "Unexpected error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
