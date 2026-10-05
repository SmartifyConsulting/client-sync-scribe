import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { sendEmail } from "../_shared/email.ts";

/** Step 3 (schedules/policies/claims history) and Step 4 (quotes): the broker
 *  sends one email per selected insurer, reply-to their own intake mailbox,
 *  tagged with a token so the reply can be matched back to this client and
 *  request kind when it lands in receive-email-document. */
const Body = z.object({
  workflowId: z.string().uuid(),
  patientId: z.string().uuid(),
  kind: z.enum(["schedules_claims", "quotes"]),
  insurers: z.array(z.object({ name: z.string().min(1), address: z.string().email() })).min(1),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(10_000),
  templateId: z.string().uuid().optional().nullable(),
  attachedDocumentIds: z.array(z.string().uuid()).optional().default([]),
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const newToken = () => {
  const b = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Please sign in again." }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: ce } = await userClient.auth.getClaims(auth.slice(7));
    if (ce || !claims?.claims) return json({ error: "Please sign in again." }, 401);
    const uid = claims.claims.sub as string;

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Some details are missing or invalid." }, 400);
    const p = parsed.data;

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: wf } = await admin.from("wealth_workflows").select("id,patient_id,owner_user_id").eq("id", p.workflowId).maybeSingle();
    if (!wf || wf.owner_user_id !== uid || wf.patient_id !== p.patientId) return json({ error: "This client's workflow doesn't belong to you." }, 403);

    const { data: profile } = await admin.from("profiles").select("full_name, mailbox_alias, mailbox_id").eq("id", uid).maybeSingle();
    const replyTo = profile?.mailbox_alias
      ? `${profile.mailbox_alias}@inbox.holarc.health`
      : profile?.mailbox_id ? `docs-${String(profile.mailbox_id).slice(0, 8)}@inbox.holarc.health` : undefined;

    const token = newToken();
    const taggedSubject = `${p.subject} [REF:${token}]`;

    let attachments: { filename: string; content: string; contentType?: string }[] | undefined;
    if (p.attachedDocumentIds.length) {
      const { data: docs } = await admin.from("documents").select("id,name,media_url,content").in("id", p.attachedDocumentIds).eq("patient_id", p.patientId);
      attachments = [];
      for (const d of docs ?? []) {
        if (!d.media_url) continue;
        try {
          const res = await fetch(d.media_url);
          if (!res.ok) continue;
          const bytes = new Uint8Array(await res.arrayBuffer());
          let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
          attachments.push({ filename: d.name || `document-${d.id}`, content: btoa(bin) });
        } catch { /* skip unreachable attachment */ }
      }
    }

    const results: { insurer: string; ok: boolean }[] = [];
    for (const ins of p.insurers) {
      const r = await sendEmail({
        to: { email: ins.address, name: ins.name },
        subject: taggedSubject,
        text: p.body,
        replyTo,
        attachments: attachments?.length ? attachments : undefined,
      });
      results.push({ insurer: ins.name, ok: r.ok });
    }

    const { data: reqRow, error: iErr } = await admin.from("wealth_document_requests").insert({
      workflow_id: p.workflowId, patient_id: p.patientId, broker_user_id: uid, kind: p.kind,
      template_id: p.templateId ?? null, insurer_names: p.insurers.map((i) => i.name),
      attached_document_ids: p.attachedDocumentIds, reply_token: token,
    }).select("id").single();
    if (iErr || !reqRow) { console.error(iErr); return json({ error: "The request was sent, but we couldn't record it. Please note the insurers manually." }, 500); }

    const failed = results.filter((r) => !r.ok).map((r) => r.insurer);
    return json({ ok: true, requestId: reqRow.id, sent: results.length - failed.length, failed });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
