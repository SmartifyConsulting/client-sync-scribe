import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

// Starts (action=start) or re-checks (action=refresh) a Didit KYC / AML / PEP session for a client's workflow.
const Body = z.object({ workflowId: z.string().uuid(), action: z.enum(["start", "refresh"]).default("start"), returnUrl: z.string().url().optional() });
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const API = "https://verification.didit.me/v2";

export function mapDidit(d: any) {
  const s = String(d?.status ?? "").toLowerCase();
  const status = s === "approved" ? "approved" : s === "declined" ? "declined" : s.includes("review") ? "in_review"
    : s.includes("abandon") || s.includes("expired") ? "abandoned" : "started";
  const aml = d?.aml ?? d?.decision?.aml;
  const hits = aml?.total_hits ?? aml?.hits?.length ?? 0;
  const amlResult = aml ? (hits > 0 ? `${hits} possible match${hits === 1 ? "" : "es"}` : "Clear") : null;
  const pepHit = (aml?.hits ?? []).some((h: any) => JSON.stringify(h).toLowerCase().includes("pep"));
  const pepResult = aml ? (pepHit ? "Possible PEP match" : "Not a PEP") : null;
  return { status, aml_result: amlResult, pep_result: pepResult };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Please sign in again." }, 401);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Invalid request." }, 400);
    const { workflowId, action, returnUrl } = parsed.data;
    const apiKey = Deno.env.get("DIDIT_API_KEY");
    const didWf = Deno.env.get("DIDIT_WORKFLOW_ID");
    if (!apiKey || !didWf) return json({ error: "Identity screening is not set up yet. Please ask your Wealth Manager." }, 503);

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Please sign in again." }, 401);
    const { data: wf } = await userClient.from("wealth_workflows").select("id, patient_id").eq("id", workflowId).maybeSingle();
    if (!wf) return json({ error: "You don't have access to this workflow." }, 403);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "refresh") {
      const { data: chk } = await admin.from("wealth_kyc_checks").select("*").eq("workflow_id", workflowId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!chk?.session_id) return json({ check: null });
      const r = await fetch(`${API}/session/${chk.session_id}/decision/`, { headers: { "x-api-key": apiKey } });
      if (!r.ok) return json({ check: chk });
      const d = await r.json();
      const m = mapDidit(d);
      const { data: upd } = await admin.from("wealth_kyc_checks").update({ ...m, raw: d, decided_at: m.status === "started" ? null : new Date().toISOString() })
        .eq("id", chk.id).select().single();
      await admin.rpc("wealth_onboarding_refresh", { _workflow_id: workflowId });
      return json({ check: upd });
    }

    const r = await fetch(`${API}/session/`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ workflow_id: didWf, vendor_data: workflowId, callback: returnUrl }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("didit create failed", r.status, d);
      return json({ error: "We couldn't start the identity check. Please try again in a moment." }, 502);
    }
    const { data: chk } = await admin.from("wealth_kyc_checks").insert({
      workflow_id: workflowId, patient_id: wf.patient_id, session_id: d.session_id, session_url: d.url ?? d.verification_url, status: "started", raw: d,
    }).select().single();
    return json({ check: chk, url: d.url ?? d.verification_url });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
