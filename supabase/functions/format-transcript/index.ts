import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

/**
 * Splits a meeting transcript into speaker-labelled turns (Wealth Manager vs
 * Client) so the client can render a two-colour PDF. Best-effort: if the AI
 * call fails, the caller falls back to one plain block.
 */
const Body = z.object({ text: z.string().min(1).max(200_000) });

const PROMPT = `You split a wealth-management meeting transcript into speaker turns.
The two speakers are the Wealth Manager (the broker/advisor running the meeting) and the Client.
Return ONLY a JSON object: {"segments": [{"speaker": "broker" | "client", "text": "..."}]}
Keep each segment's wording verbatim from the transcript — do not summarise or invent content.
If you truly cannot tell who is speaking for a stretch, label it "client".`;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Please sign in again." }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: ce } = await userClient.auth.getClaims(auth.slice(7));
    if (ce || !claims?.claims) return json({ error: "Please sign in again." }, 401);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Invalid request" }, 400);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI is not configured." }, 500);
    const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: [{ role: "system", content: PROMPT }, { role: "user", content: parsed.data.text.slice(0, 120_000) }],
        text: { format: { type: "json_object" } },
      }),
    });
    if (r.status === 429) return json({ error: "Too many requests. Please try again in a minute." }, 429);
    if (r.status === 402) return json({ error: "AI credits have run out. Please top up to continue." }, 402);
    if (!r.ok) { console.error("AI error", r.status, await r.text()); return json({ error: "Couldn't format the transcript." }, 502); }
    const out = await r.json();
    const raw: string = out.output_text ?? (out.output ?? []).flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? "").join("");
    let parsedOut: { segments?: { speaker: string; text: string }[] };
    try { parsedOut = JSON.parse(raw.replace(/^```json|```$/g, "").trim()); }
    catch { return json({ error: "Couldn't format the transcript." }, 502); }

    const segments = (parsedOut.segments ?? [])
      .filter((s) => s && typeof s.text === "string" && s.text.trim())
      .map((s) => ({ speaker: s.speaker === "broker" ? "broker" : "client", text: s.text.trim() }));
    if (!segments.length) return json({ error: "Couldn't format the transcript." }, 502);
    return json({ segments });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
