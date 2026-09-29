import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Receives Didit decision webhooks. Verifies the HMAC signature, stores the result, and moves Step 1 on if ready.
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function mapDidit(d: any) {
  const s = String(d?.status ?? "").toLowerCase();
  const status = s === "approved" ? "approved" : s === "declined" ? "declined" : s.includes("review") ? "in_review"
    : s.includes("abandon") || s.includes("expired") ? "abandoned" : "started";
  const aml = d?.decision?.aml ?? d?.aml;
  const hits = aml?.total_hits ?? aml?.hits?.length ?? 0;
  const pepHit = (aml?.hits ?? []).some((h: any) => JSON.stringify(h).toLowerCase().includes("pep"));
  return {
    status,
    aml_result: aml ? (hits > 0 ? `${hits} possible match${hits === 1 ? "" : "es"}` : "Clear") : null,
    pep_result: aml ? (pepHit ? "Possible PEP match" : "Not a PEP") : null,
  };
}

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const raw = await req.text();
  const secret = Deno.env.get("DIDIT_WEBHOOK_SECRET");
  if (!secret) return json({ error: "not configured" }, 503);
  const sig = req.headers.get("x-signature") ?? "";
  const ts = Number(req.headers.get("x-timestamp") ?? 0);
  if (!sig || (await hmac(secret, raw)) !== sig) return json({ error: "bad signature" }, 401);
  if (ts && Math.abs(Date.now() / 1000 - ts) > 300) return json({ error: "stale" }, 401);

  const d = JSON.parse(raw);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: chk } = await admin.from("wealth_kyc_checks").select("id, workflow_id").eq("session_id", d.session_id).maybeSingle();
  if (!chk) return json({ ok: true, ignored: true });
  const m = mapDidit(d);
  await admin.from("wealth_kyc_checks").update({ ...m, raw: d, decided_at: m.status === "started" ? null : new Date().toISOString() }).eq("id", chk.id);
  if (m.status === "in_review" || m.status === "declined") {
    await admin.from("todos").insert({
      workflow_id: chk.workflow_id, title: m.status === "declined" ? "Identity screening failed – contact the client" : "Review identity screening result",
      owner_role: "wealth_manager", status: "pending", assignee: "doctor", workflow_stage: "consultation",
    });
  }
  await admin.rpc("wealth_onboarding_refresh", { _workflow_id: chk.workflow_id });
  return json({ ok: true });
});
