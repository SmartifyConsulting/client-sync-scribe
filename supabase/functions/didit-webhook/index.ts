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

/** Didit's decision payload shape varies by plan/version — check the common
 *  locations for the captured ID image URLs rather than assuming one path. */
function findIdImageUrls(d: any): { front?: string; back?: string } {
  const idv = d?.id_verification ?? d?.decision?.id_verification ?? {};
  return {
    front: idv.front_image ?? idv.front_image_url ?? idv.images?.front ?? d?.front_image,
    back: idv.back_image ?? idv.back_image_url ?? idv.images?.back ?? d?.back_image,
  };
}

async function storeIdImage(admin: any, patientId: string, side: "front" | "back", url?: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const bytes = new Uint8Array(await res.arrayBuffer());
    const path = `${patientId}/${side}.${ext}`;
    const { error } = await admin.storage.from("identity-documents").upload(path, bytes, { contentType, upsert: true });
    if (error) { console.error(`Failed to store ${side} ID image`, error); return null; }
    return path;
  } catch (e) {
    console.error(`Failed to fetch ${side} ID image`, e);
    return null;
  }
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

  // Save the front/back ID images once per client so FICA doesn't need to
  // re-request them later.
  const { data: wf } = await admin.from("wealth_workflows").select("patient_id").eq("id", chk.workflow_id).maybeSingle();
  if (wf?.patient_id) {
    const { data: pat } = await admin.from("patients").select("id_document_front_path, id_document_back_path").eq("id", wf.patient_id).maybeSingle();
    if (!pat?.id_document_front_path || !pat?.id_document_back_path) {
      const urls = findIdImageUrls(d);
      const [frontPath, backPath] = await Promise.all([
        storeIdImage(admin, wf.patient_id, "front", urls.front),
        storeIdImage(admin, wf.patient_id, "back", urls.back),
      ]);
      if (frontPath || backPath) {
        await admin.from("patients").update({
          id_document_front_path: frontPath ?? pat?.id_document_front_path ?? null,
          id_document_back_path: backPath ?? pat?.id_document_back_path ?? null,
          id_document_captured_at: new Date().toISOString(),
        }).eq("id", wf.patient_id);
      }
    }
  }

  if (m.status === "in_review" || m.status === "declined") {
    await admin.from("todos").insert({
      workflow_id: chk.workflow_id, title: m.status === "declined" ? "Identity screening failed – contact the client" : "Review identity screening result",
      owner_role: "wealth_manager", status: "pending", assignee: "doctor", workflow_stage: "consultation",
    });
  }
  await admin.rpc("wealth_onboarding_refresh", { _workflow_id: chk.workflow_id });
  return json({ ok: true });
});
