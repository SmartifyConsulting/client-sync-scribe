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
    const entries = Array.isArray(body?.entries) ? body.entries.slice(0, 90) : [];
    const existing: string[] = Array.isArray(body?.existing) ? body.existing : [];

    if (entries.length < 5) {
      return json({ suggestions: [] });
    }

    const systemPrompt = `You review a person's daily health check-ins and suggest correlations worth tracking.

Each suggestion must use:
- input_variable: one of "food", "exercise", "medication", a rating key present in the data, or a specific item as "food:<name>", "exercise:<name>", "medication:<name>".
- outcome_variables: one or two rating keys that appear in the data.

Do not repeat these already-tracked correlations: ${existing.join("; ") || "none"}.
Suggest at most 4, only where the data actually hints at a pattern. Never give medical advice or a diagnosis.
Return ONLY JSON: {"suggestions":[{"title":"","input_variable":"","outcome_variables":[],"rationale":""}]}`;

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
          { role: "user", content: JSON.stringify(entries) },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return json({ error: `Suggestions failed: ${detail || res.status}` }, res.status);
    }

    const data = await res.json();
    let parsed: { suggestions?: unknown[] } = {};
    try {
      parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }

    return json({ suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [] });
  } catch (err) {
    console.error("biolog-suggest-correlations error", err);
    return json({ error: (err as Error).message || "Unexpected error." }, 500);
  }
});
