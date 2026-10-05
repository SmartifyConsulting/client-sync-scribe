import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({
  patientId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  text: z.string().max(200_000).optional(),
});

const PROMPT = `You extract a South African client's financial facts from a Wealth Manager consultation transcript or notes.
Return ONLY a JSON object with these keys (omit anything not stated; never invent numbers; amounts are plain numbers in Rand):
{
 "cash_flow": {"gross_income","net_salary","fixed_expenses","discretionary_expenses","tax_bracket" (one of "18%","26%","31%","36%","39%","41%","45%")},
 "assets_liabilities": {"items":[{"kind" (one of "Property","Vehicle","Cash / savings","Other asset","Home loan (bond)","Vehicle finance","Credit card","Personal loan","Other debt"),"description","value"}]},
 "risk_portfolio": {"policies":[{"kind" (one of "Life cover","Disability","Income protection","Severe illness","Short-term (assets)","Funeral"),"insurer","cover","premium"}]},
 "investments": {"holdings":[{"kind" (one of "Retirement annuity","Pension fund","Provident fund","Preservation fund","Tax-free savings","Unit trusts","Endowment","Other"),"provider","value","contribution"}]},
 "goals_risk": {"retirement_age","retirement_income","risk_profile" (one of "Conservative","Moderately conservative","Moderate","Moderately aggressive","Aggressive"),"goals"},
 "estate": {"will_status" (one of "No will","Will in place","Will outdated"),"will_date","executor","trusts"},
 "general_notes": "Any other comment, context or remark from the meeting that doesn't fit one of the fields above — omit this key entirely if there's nothing like that."
}
Monthly figures unless stated otherwise. Keep it concise.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Please sign in again." }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: ce } = await user.auth.getClaims(auth.slice(7));
    if (ce || !claims?.claims) return json({ error: "Please sign in again." }, 401);
    const uid = claims.claims.sub as string;

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid request" }, 400);
    const { patientId, sessionId, text } = parsed.data;

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: pat } = await admin.from("patients").select("id,user_id").eq("id", patientId).maybeSingle();
    if (!pat || pat.user_id !== uid) return json({ error: "Only this client's Wealth Manager can capture their financial information." }, 403);

    let source = text?.trim() ?? "";
    if (!source && sessionId) {
      const { data: s } = await admin.from("sessions").select("transcript,notes,summary,patient_id").eq("id", sessionId).maybeSingle();
      if (!s || s.patient_id !== patientId) return json({ error: "That consultation doesn't belong to this client." }, 400);
      source = [s.transcript, s.notes, s.summary].filter(Boolean).join("\n\n");
    }
    if (source.length < 40) return json({ error: "The consultation has no transcript or notes yet. Record or type notes first." }, 400);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI is not configured." }, 500);
    const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: [{ role: "system", content: PROMPT }, { role: "user", content: source.slice(0, 120_000) }],
        text: { format: { type: "json_object" } },
      }),
    });
    if (r.status === 429) return json({ error: "Too many requests. Please try again in a minute." }, 429);
    if (r.status === 402) return json({ error: "AI credits have run out. Please top up to continue." }, 402);
    if (!r.ok) { console.error("AI error", r.status, await r.text()); return json({ error: "Couldn't read the consultation. Please try again." }, r.status === 403 ? 403 : 502); }
    const out = await r.json();
    const raw: string = out.output_text ??
      (out.output ?? []).flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? "").join("");
    let facts: Record<string, any>;
    try { facts = JSON.parse(raw.replace(/^```json|```$/g, "").trim()); }
    catch { return json({ error: "Couldn't read the consultation. Please try again." }, 502); }

    const keys = ["cash_flow", "assets_liabilities", "risk_portfolio", "investments", "goals_risk", "estate"];
    const { data: existing } = await admin.from("client_financial_profiles").select("*").eq("patient_id", patientId).maybeSingle();
    const row: Record<string, any> = { patient_id: patientId, updated_by: uid, extracted_at: new Date().toISOString(), extracted_from_session_id: sessionId ?? null };
    for (const k of keys) if (facts[k] && typeof facts[k] === "object") row[k] = { ...(existing?.[k] ?? {}), ...facts[k] };
    if (typeof facts.general_notes === "string" && facts.general_notes.trim()) {
      row.general_notes = existing?.general_notes ? `${existing.general_notes}\n\n${facts.general_notes.trim()}` : facts.general_notes.trim();
    }
    const { error } = await admin.from("client_financial_profiles").upsert(row, { onConflict: "patient_id" });
    if (error) { console.error(error); return json({ error: "Couldn't save the financial information." }, 500); }
    return json({ ok: true, sections: keys.filter((k) => row[k]) });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
