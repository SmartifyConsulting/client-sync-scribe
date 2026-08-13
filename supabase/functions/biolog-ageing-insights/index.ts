import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!LOVABLE_API_KEY) return json({ error: "AI is not configured." }, 500);

    const body = await req.json().catch(() => null);
    const assessments = Array.isArray(body?.assessments) ? body.assessments.slice(0, 10) : [];
    const entries = Array.isArray(body?.entries) ? body.entries.slice(0, 90) : [];

    if (assessments.length === 0 || entries.length < 5) return json({ story: null });

    const systemPrompt = `You write a short, plain-language "Ageing Story" from a person's own health records.

Strict rules:
- Describe only associations and patterns visible in the supplied data. Never claim one thing caused another.
- Never predict lifespan, mortality, or disease risk. Never give medical advice or a diagnosis.
- Never invent numbers. Use only the values supplied.
- Note when the data is thin, and say more data will strengthen the picture.
- Warm, factual, non-alarming. 3 short paragraphs maximum.
- Biological age values come from the person's testing provider; the app does not calculate them.

Return ONLY JSON: {"story":"..."}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify({ assessments, entries }) },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return json({ error: `Ageing story failed: ${detail || res.status}` }, res.status);
    }

    const data = await res.json();
    let parsed: { story?: string } = {};
    try {
      parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }

    return json({ story: typeof parsed.story === "string" ? parsed.story : null });
  } catch (err) {
    console.error("biolog-ageing-insights error", err);
    return json({ error: (err as Error).message || "Unexpected error." }, 500);
  }
});
