import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const COVER_TYPES = ["Car", "Home", "Life", "Disability", "Severe Illness", "Other"];
const Body = z.object({ workflow_id: z.string().uuid() });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Please sign in again." }, 401);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: ce } = await sb.auth.getClaims(auth.slice(7));
    if (ce || !claims?.claims?.sub) return json({ error: "Please sign in again." }, 401);
    const uid = claims.claims.sub;
    const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", uid);
    if (!roles?.some((r: any) => r.role === "doctor" || r.role === "admin")) return json({ error: "Only Wealth Managers can rank quotes." }, 403);

    const p = Body.safeParse(await req.json());
    if (!p.success) return json({ error: "Missing workflow." }, 400);
    const { data: quotes, error: qe } = await sb.from("wealth_quotes").select("id,insurer,product,cover_type,monthly_premium,cover_amount,excess,commentary").eq("workflow_id", p.data.workflow_id);
    if (qe) return json({ error: qe.message }, 400);
    if (!quotes?.length) return json({ error: "No quotes to rank yet. Add the returned quotes first." }, 400);

    const prompt = `You are a South African insurance broker's assistant. For each quote, assign a cover_type from ${COVER_TYPES.join(", ")} (use the given cover_type if set). Then, within EACH cover_type folder, choose the top 3 quotes (fewer if the folder has fewer) for the client. Brokers weigh: cheapest monthly premium, the value of the excess (lower excess is better for short-term cover), cover amount, and any other significant game-changing variable favourable to the client. For each top-3 quote give ai_rank (1-3) and a concise one or two sentence reason in plain English explaining WHY, comparing to the alternatives. Quotes not in the top 3 get ai_rank null and reason null.\n\nQuotes:\n${JSON.stringify(quotes)}`;

    const ai = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")!, "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: [{ role: "user", content: prompt }],
        stream: true, store: false,
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "rank", strict: true, schema: {
          type: "object", additionalProperties: false, required: ["quotes"],
          properties: { quotes: { type: "array", items: { type: "object", additionalProperties: false,
            required: ["id", "cover_type", "ai_rank", "reason"],
            properties: {
              id: { type: "string" }, cover_type: { type: "string", enum: COVER_TYPES },
              ai_rank: { type: ["integer", "null"] }, reason: { type: ["string", "null"] },
            } } } },
        } } },
      }),
    });
    if (ai.status === 429) return json({ error: "Elysian AI is busy. Please try again in a minute." }, 429);
    if (ai.status === 402) return json({ error: "AI credits have run out. Please top up to continue." }, 402);
    if (!ai.ok || !ai.body) return json({ error: "Elysian AI couldn't rank the quotes. Please try again." }, 500);
    // Consume SSE stream, collecting output text deltas.
    let text = "", buf = "";
    const reader = ai.body.pipeThrough(new TextDecoderStream()).getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try { const ev = JSON.parse(d); if (ev.type === "response.output_text.delta") text += ev.delta ?? ""; } catch { /* partial */ }
      }
    }
    const args = JSON.parse(text || "{}");
    const ids = new Set(quotes.map((q: any) => q.id));
    for (const r of args.quotes ?? []) {
      if (!ids.has(r.id)) continue;
      const top = r.ai_rank && r.ai_rank <= 3;
      await sb.from("wealth_quotes").update({
        cover_type: COVER_TYPES.includes(r.cover_type) ? r.cover_type : "Other",
        ai_rank: top ? r.ai_rank : null, ai_reason: top ? r.reason : null,
        rank: top ? r.ai_rank : null, selected: !!top, broker_overridden: false,
      }).eq("id", r.id);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Something went wrong." }, 500);
  }
});
