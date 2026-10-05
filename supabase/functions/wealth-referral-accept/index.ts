import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

/** Broker accepts a pending referral: creates the real client (patients) record
 *  and starts their wealth workflow, owned by the broker, then links it back
 *  to the referral and marks it accepted. Rejecting a referral is a plain
 *  RLS update from the client and doesn't need this function. */
const Body = z.object({ referralId: z.string().uuid() });

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
    const uid = claims.claims.sub as string;

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Invalid request" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ref } = await admin.from("wealth_referrals").select("*").eq("id", parsed.data.referralId).maybeSingle();
    if (!ref || ref.broker_user_id !== uid) return json({ error: "Referral not found." }, 404);
    if (ref.status === "accepted") return json({ ok: true, patientId: ref.patient_id });
    if (ref.status !== "pending") return json({ error: "This referral has already been responded to." }, 409);

    const { data: pat, error: pErr } = await admin.from("patients").insert({
      user_id: uid, name: ref.client_name, email: ref.client_email || null, phone: ref.client_phone || null,
      notes: ref.specific_need ? `Referred client need: ${ref.specific_need}` : null, referred_by: "Referral Agent",
    }).select("id").single();
    if (pErr || !pat) { console.error(pErr); return json({ error: "We couldn't create the client record. Please try again." }, 500); }

    const { data: wf, error: wErr } = await admin.from("wealth_workflows").insert({ patient_id: pat.id, owner_user_id: uid }).select("id").single();
    if (wErr || !wf) { console.error(wErr); return json({ error: "Client created, but the workflow couldn't start. Please try again." }, 500); }
    await admin.from("wealth_workflow_transitions").insert({
      workflow_id: wf.id, from_stage: null, to_stage: "consultation", actor_type: "user", actor_user_id: uid, reason: "Referred client accepted",
    });

    const { error: uErr } = await admin.from("wealth_referrals").update({
      status: "accepted", patient_id: pat.id, workflow_id: wf.id, decided_at: new Date().toISOString(),
    }).eq("id", ref.id);
    if (uErr) { console.error(uErr); return json({ error: "Client created, but the referral couldn't be updated." }, 500); }

    return json({ ok: true, patientId: pat.id, workflowId: wf.id });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
