import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { PF_HOST, PF_MERCHANT_ID, PF_MERCHANT_KEY, PF_MODE, signApi, signOrdered } from "../_shared/payfast.ts";

const Body = z.object({ pricing_id: z.string().uuid(), return_url: z.string().url() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Please sign in again." }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: plan } = await admin.from("pricing_config").select("*").eq("id", parsed.data.pricing_id).maybeSingle();
    if (!plan || plan.currency !== "ZAR") return json({ error: "That plan is not available." }, 400);

    // Cancel any existing PayFast subscription so the client isn't billed twice
    const { data: existing } = await admin.from("subscriptions").select("id, payfast_token")
      .eq("user_id", user.id).eq("provider", "payfast").in("status", ["active", "past_due"]);
    for (const ex of existing ?? []) {
      if (ex.payfast_token) {
        const h = { "merchant-id": PF_MERCHANT_ID, version: "v1", timestamp: new Date().toISOString().slice(0, 19) };
        const r = await fetch(`https://api.payfast.co.za/subscriptions/${ex.payfast_token}/cancel${PF_MODE === "sandbox" ? "?testing=true" : ""}`,
          { method: "PUT", headers: { ...h, signature: await signApi(h) } });
        if (!r.ok) { console.error(await r.text()); return json({ error: "Couldn't cancel your current plan. Please try again." }, 502); }
      }
      await admin.from("subscriptions").update({ status: "cancelled" }).eq("id", ex.id);
    }

    const { data: sub, error } = await admin.from("subscriptions").insert({
      user_id: user.id, plan_type: plan.role, billing_cycle: plan.billing_cycle, status: "pending",
      provider: "payfast", amount: plan.price, pricing_id: plan.id,
    }).select("id").single();
    if (error) throw error;

    const amount = Number(plan.price).toFixed(2);
    const ret = new URL(parsed.data.return_url);
    const pairs: [string, string][] = [
      ["merchant_id", PF_MERCHANT_ID],
      ["merchant_key", PF_MERCHANT_KEY],
      ["return_url", `${ret.origin}${ret.pathname}?billing=success`],
      ["cancel_url", `${ret.origin}${ret.pathname}?billing=cancelled`],
      ["notify_url", `${url}/functions/v1/payfast-itn`],
      ["email_address", user.email ?? ""],
      ["m_payment_id", sub.id],
      ["amount", amount],
      ["item_name", `Holarc Wealth ${plan.name}`.slice(0, 100)],
      ["custom_str1", user.id],
      ["subscription_type", "1"],
      ["recurring_amount", amount],
      ["frequency", "3"],
      ["cycles", "0"],
    ];
    const signature = await signOrdered(pairs);
    const fields = Object.fromEntries(pairs.filter(([, v]) => v !== ""));
    return json({ action: `https://${PF_HOST}/eng/process`, fields: { ...fields, signature } });
  } catch (e) {
    console.error(e);
    return json({ error: "Could not start checkout. Please try again." }, 500);
  }
});
