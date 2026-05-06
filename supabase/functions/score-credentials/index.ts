import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Kind = "doctor" | "hospital" | "ambulance";

async function aiScore(profile: Record<string, unknown>): Promise<number> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return 3;
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Score a healthcare provider's credentials from 1.0 to 5.0 based on completeness and credibility of fields. Consider presence of license/registration numbers, specialty, address, contact details, ownership type and bio. Return ONLY the numeric score." },
        { role: "user", content: JSON.stringify(profile) },
      ],
      tools: [{
        type: "function",
        function: {
          name: "set_score",
          description: "Set the credibility score for a provider",
          parameters: {
            type: "object",
            properties: { score: { type: "number", minimum: 1, maximum: 5 } },
            required: ["score"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "set_score" } },
    }),
  });
  if (!resp.ok) return 3;
  const data = await resp.json();
  try {
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = JSON.parse(args);
    const s = Number(parsed.score);
    if (Number.isFinite(s)) return Math.max(1, Math.min(5, s));
  } catch { /* fall through */ }
  return 3;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { kind, id }: { kind: Kind; id: string } = await req.json();
    if (!kind || !id) throw new Error("kind and id required");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const table = kind === "doctor" ? "profiles" : kind === "hospital" ? "holarchelp_hospitals" : "holarchelp_ambulance_providers";
    const { data: row, error } = await sb.from(table).select("*").eq("id", id).maybeSingle();
    if (error || !row) throw new Error("provider not found");

    const score = await aiScore(row);
    await sb.from(table).update({ credential_score: score, credential_score_updated_at: new Date().toISOString() }).eq("id", id);

    return new Response(JSON.stringify({ score }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
