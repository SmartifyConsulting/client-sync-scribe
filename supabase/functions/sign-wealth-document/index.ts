import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

// Signs the Disclosure Agreement or LOA: records signer, time, IP and a SHA-256 seal. Signed rows are never updated.
const Body = z.object({
  workflowId: z.string().uuid(),
  docType: z.enum(["disclosure", "loa"]),
  title: z.string().min(1).max(200),
  contentHtml: z.string().min(20).max(6_000_000),
  signatureImage: z.string().startsWith("data:image/").max(500_000),
  signerName: z.string().min(1).max(200),
});
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const sha = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Please sign in again." }, 401);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Please draw your signature before signing." }, 400);
    const p = parsed.data;
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Please sign in again." }, 401);
    const { data: wf } = await userClient.from("wealth_workflows").select("id, patient_id").eq("id", p.workflowId).maybeSingle();
    if (!wf) return json({ error: "You don't have access to this workflow." }, 403);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: pat } = await admin.from("patients").select("user_id, patient_user_id").eq("id", wf.patient_id).maybeSingle();
    if ((pat?.patient_user_id ?? pat?.user_id) !== u.user.id) return json({ error: "Only the client can sign this document." }, 403);
    const { data: existing } = await admin.from("wealth_signed_documents").select("id").eq("workflow_id", p.workflowId).eq("doc_type", p.docType).maybeSingle();
    if (existing) return json({ error: "This document is already signed." }, 409);

    const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "").split(",")[0].trim() || null;
    const signedAt = new Date().toISOString();
    const contentHash = await sha(p.contentHtml);
    const sealHash = await sha([contentHash, await sha(p.signatureImage), u.user.id, signedAt, ip ?? ""].join("|"));
    const { data, error } = await admin.from("wealth_signed_documents").insert({
      workflow_id: p.workflowId, patient_id: wf.patient_id, doc_type: p.docType, title: p.title, content_html: p.contentHtml,
      content_hash: contentHash, signature_image: p.signatureImage, signer_user_id: u.user.id, signer_name: p.signerName,
      signer_ip: ip, user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null, signed_at: signedAt, seal_hash: sealHash,
    }).select("id, doc_type, signed_at, seal_hash, signer_ip").single();
    if (error) throw error;
    // Auto-file the signed copy in the client's Documents.
    const at = new Date(signedAt).toLocaleString("en-ZA");
    await admin.from("documents").insert({
      user_id: pat?.user_id ?? u.user.id, patient_id: wf.patient_id, patient_name: p.signerName,
      name: `${p.title} (signed) — ${p.signerName}`, template_name: p.title,
      content: `${p.contentHtml}<div style="padding:24px 60px"><img src="${p.signatureImage.startsWith("data:") ? p.signatureImage : `data:image/png;base64,${p.signatureImage}`}" style="height:60px"/><p><b>${p.signerName}</b> · Digitally signed ${at}${ip ? ` · IP ${ip}` : ""}</p><p style="font-family:monospace;font-size:10px">Seal ${sealHash}</p></div>`,
      document_kind: `${p.docType}_signed`, record_date: signedAt.slice(0, 10),
    });
    await admin.rpc("wealth_onboarding_refresh", { _workflow_id: p.workflowId });
    return json({ signed: data });
  } catch (e) {
    console.error(e);
    return json({ error: "We couldn't save your signature. Please try again." }, 500);
  }
});
