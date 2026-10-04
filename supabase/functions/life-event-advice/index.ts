import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Body = z.object({ patientId: z.string().uuid(), question: z.string().min(3).max(1000) });
const DISCLAIMER = "This is general guidance, not financial advice. Please speak to your Wealth Manager before making changes.";
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Please sign in again." }, 401);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Please type a question (3–1000 characters)." }, 400);
    const { patientId, question } = parsed.data;

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Please sign in again." }, 401);
    const { data: rec } = await userClient.from("patients").select("id, name").eq("id", patientId).maybeSingle();
    if (!rec) return json({ error: "You don't have access to this record." }, 403);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const [prof, events, apps] = await Promise.all([
      admin.from("client_financial_profiles").select("*").eq("patient_id", patientId).maybeSingle(),
      admin.from("client_life_events").select("event_type, event_date, notes").eq("patient_id", patientId).order("event_date", { ascending: false }).limit(20),
      admin.from("wealth_applications").select("product_type, provider_name, status, premium, cover_amount").eq("patient_id", patientId).limit(20),
    ]);
    const p: any = prof.data ?? {};
    const context = [
      `Portfolio: ${JSON.stringify(p.risk_portfolio ?? p.existing_risk ?? {}).slice(0, 1500)}`,
      `Investments: ${JSON.stringify(p.investments ?? {}).slice(0, 1000)}`,
      `Goals: ${JSON.stringify(p.goals ?? {}).slice(0, 500)}`,
      `Estate: ${JSON.stringify(p.estate ?? {}).slice(0, 500)}`,
      `Policies/applications: ${JSON.stringify(apps.data ?? []).slice(0, 1500)}`,
      `Life events: ${(events.data ?? []).map((e) => `${e.event_date} ${e.event_type}${e.notes ? ` (${e.notes})` : ""}`).join("; ")}`,
    ].join("\n");

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
          "You are Elysian AI, a South African wealth-management guide. Explain in plain, calm English (max 170 words) how the client's life event or question could affect their existing cover, investments, beneficiaries and estate plan, using their data where relevant. Give general guidance and questions to raise with their broker only — never recommend specific products, providers or amounts. No markdown headings; short paragraphs or simple dashes.",
        input: `Client: ${rec.name}\n${context}\n\nQuestion: ${question}`,
      }),
    });
    if (!res.ok || !res.body) {
      const s = res.status;
      return json({ error: s === 429 ? "Too many requests — try again shortly." : s === 402 ? "AI credits have run out." : "Elysian AI couldn't answer right now." }, s >= 400 ? s : 500);
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
        try { const ev = JSON.parse(d); if (ev.type === "response.output_text.delta") out += ev.delta; } catch { /* partial */ }
      }
    }
    const answer = (out.trim() || "I couldn't form an answer to that. Try rephrasing your question.").replace(/\*\*/g, "");
    return json({ answer: `${answer}\n\n${DISCLAIMER}` });
  } catch (e) {
    console.error(e);
    return json({ error: "Elysian AI couldn't answer right now. Please try again." }, 500);
  }
});
