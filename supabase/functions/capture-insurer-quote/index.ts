import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { decodePdf } from "./pdf.ts";
const Body = z.object({ workflowId: z.string().uuid(), insurer: z.string().trim().min(1).max(120), filename: z.string().min(1).max(255), base64: z.string().max(6990508) });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid quote PDF." }, 400);
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !key) return json({ error: "Service unavailable." }, 500);
    const db = createClient(url, key, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await db.auth.getUser();
    if (!user) return json({ error: "Sign in again." }, 401);
    const p = parsed.data;
    const { data: wf } = await db.from("wealth_workflows").select("id,patient_id,owner_user_id,status").eq("id", p.workflowId).maybeSingle();
    if (!wf || wf.owner_user_id !== user.id || wf.status === "cancelled") return json({ error: "Only this client's Wealth Manager can attach quotes." }, 403);
    let bytes: Uint8Array;
    try { bytes = decodePdf(p.base64); } catch (e) { return json({ error: (e as Error).message }, 400); }
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    const kind = `quote_pdf:${wf.id}:${hash}`;
    const { data: old } = await db.from("documents").select("id").eq("patient_id", wf.patient_id).eq("document_kind", kind).limit(1).maybeSingle();
    if (old) return json({ id: old.id, duplicate: true });
    const { data: docs, error: readError } = await db.from("documents").select("content,media_url").eq("patient_id", wf.patient_id);
    if (readError) return json({ error: "Could not check client storage." }, 500);
    const used = (docs ?? []).reduce((sum, d) => sum + new TextEncoder().encode(d.content ?? "").length + (d.media_url?.startsWith("data:") ? d.media_url.length : 0), 0);
    if (used + p.base64.length > 100 * 1024 * 1024) return json({ error: "Client document storage has reached 100MB." }, 413);
    // PDF bytes are kept in the existing RLS-protected document row, never a public bucket.
    const filename = p.filename.replace(/[\/\\\u0000-\u001f]/g, "_");
    const { data: doc, error } = await db.from("documents").insert({ user_id: user.id, patient_id: wf.patient_id,
      name: `${p.insurer} · ${filename}`, document_kind: kind, media_type: "application/pdf",
      media_url: `data:application/pdf;base64,${p.base64}`, content: `Quote PDF · ${p.insurer} · SHA-256 ${hash}`, source_file_name: filename,
    }).select("id").single();
    if (error) return json({ error: "Could not attach quote PDF." }, 500);
    return json({ id: doc.id });
  } catch { return json({ error: "Could not capture quote PDF." }, 500); }
});