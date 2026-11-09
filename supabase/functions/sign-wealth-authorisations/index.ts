import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Body = z.object({
  workflowId: z.string().uuid(), recommendationId: z.string().uuid(),
  signerName: z.string().trim().min(2).max(200),
  bankName: z.string().trim().min(2).max(100), accountHolder: z.string().trim().min(2).max(200),
  accountNumber: z.string().regex(/^\d{6,20}$/), collectionDay: z.number().int().min(1).max(31),
  debitConsent: z.literal(true), declarationConsent: z.literal(true),
  signatureImage: z.string().regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/).max(500_000),
  quoteSnapshot: z.array(z.object({ id: z.string().uuid(), insurer: z.string(), product: z.string(), monthly_premium: z.number().positive() })).min(1),
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map(b => b.toString(16).padStart(2, "0")).join("");
const money = (n: number) => `R ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use the signing form to continue." }, 405);
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Please sign in again." }, 401);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Complete your bank details and confirm both declarations before signing." }, 400);
    const p = parsed.data;
    const url = Deno.env.get("SUPABASE_URL")!;
    const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: session } = await user.auth.getUser(auth.replace("Bearer ", ""));
    if (!session?.user) return json({ error: "Please sign in again." }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: wf } = await admin.from("wealth_workflows").select("patient_id").eq("id", p.workflowId).maybeSingle();
    if (!wf) return json({ error: "This workflow is not available." }, 403);
    const { data: client } = await admin.from("clients").select("patient_user_id").eq("id", wf.patient_id).maybeSingle();
    if (client?.patient_user_id !== session.user.id) return json({ error: "Only the linked client can authorise and sign." }, 403);
    const signedAt = new Date().toISOString();
    const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "").split(",")[0].trim() || null;
    const total = p.quoteSnapshot.reduce((sum, q) => sum + q.monthly_premium, 0);
    const premiums = p.quoteSnapshot.map(q => `<li>${esc(q.insurer)} · ${esc(q.product)} — ${money(q.monthly_premium)} /month</li>`).join("");
    const bank = `<p>Bank: ${esc(p.bankName)}<br/>Account holder: ${esc(p.accountHolder)}<br/>Account ending: ${esc(p.accountNumber.slice(-4))}<br/>Preferred collection day: ${p.collectionDay}</p>`;
    const texts = [
      { doc_type: "debit_order", title: "Debit order mandate", body: `${bank}<ul>${premiums}</ul><p>Agreed total monthly premium: ${money(total)}</p><p>I authorise collection of the agreed monthly premiums from my nominated account, subject to the insurer's accepted mandate and collection arrangements. My preferred collection day is recorded above.</p>` },
      { doc_type: "life_declaration", title: "Life assured declaration", body: "<p>I declare that the information I have provided is true, correct and complete to the best of my knowledge. I will disclose material changes before the insurer issues cover.</p><p>This acknowledgement does not replace insurer-specific declarations, underwriting questions or acceptance of an application.</p>" },
    ];
    const documents = await Promise.all(texts.map(async d => {
      const content = `<div id="holarc-document"><h2>Elysian Financial Services · ${d.title}</h2><p>${esc(p.signerName)}</p>${d.body}</div>`;
      const contentHash = await sha(content);
      const seal = await sha([contentHash, await sha(p.signatureImage), session.user.id, signedAt, ip ?? ""].join("|"));
      const stamp = `<section><img src="${p.signatureImage}" alt="Client signature" width="220"/><p>${esc(p.signerName)} · Signed ${signedAt}</p><p>Seal: ${seal}</p></section>`;
      return { ...d, content_html: content, content_hash: contentHash, filed_html: content.replace(/<\/div>$/, `${stamp}</div>`), signature_image: p.signatureImage, signer_name: p.signerName, signer_ip: ip, user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null, signed_at: signedAt, seal_hash: seal };
    }));
    const { data, error } = await admin.rpc("wealth_sign_authorisations", { _workflow_id: p.workflowId, _signer_id: session.user.id, _recommendation_id: p.recommendationId, _quote_snapshot: [...p.quoteSnapshot].sort((a, b) => a.id.localeCompare(b.id)), _documents: documents });
    if (error) return json({ error: error.message }, 409);
    return json({ signed: data });
  } catch {
    return json({ error: "Your authorisations were not saved. Please try again." }, 500);
  }
});