import { createClient } from "npm:@supabase/supabase-js@2";
import { PF_HOST, PF_MERCHANT_ID, pfEncode, signOrdered } from "../_shared/payfast.ts";

const ok = () => new Response("OK", { status: 200 });

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok();
  const raw = await req.text();
  const pairs: [string, string][] = [];
  for (const part of raw.split("&")) {
    if (!part) continue;
    const [k, v = ""] = part.split("=");
    pairs.push([decodeURIComponent(k), decodeURIComponent(v.replace(/\+/g, " "))]);
  }
  const data = Object.fromEntries(pairs);
  const signed = pairs.filter(([k]) => k !== "signature");

  // 1. Signature
  if ((await signOrdered(signed)) !== data.signature) { console.error("bad signature"); return ok(); }
  // 2. Merchant
  if (data.merchant_id !== PF_MERCHANT_ID) { console.error("bad merchant"); return ok(); }
  // 3. Server-side validation with PayFast
  const body = signed.map(([k, v]) => `${k}=${pfEncode(v)}`).join("&");
  const vr = await fetch(`https://${PF_HOST}/eng/query/validate`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
  });
  if ((await vr.text()).trim() !== "VALID") { console.error("validate failed"); return ok(); }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: sub } = await admin.from("subscriptions").select("*").eq("id", data.m_payment_id).maybeSingle();
  if (!sub) { console.error("unknown subscription", data.m_payment_id); return ok(); }
  // 4. Amount
  if (Math.abs(Number(data.amount_gross) - Number(sub.amount)) > 0.01) { console.error("amount mismatch"); return ok(); }

  const status = data.payment_status;
  const now = new Date();
  const next = new Date(now); next.setMonth(next.getMonth() + 1);
  const upd: Record<string, unknown> = { updated_at: now.toISOString() };
  if (data.token) upd.payfast_token = data.token;
  if (status === "COMPLETE") {
    Object.assign(upd, { status: "active", is_trial: false, current_period_start: now.toISOString(), current_period_end: next.toISOString() });
  } else if (status === "CANCELLED") upd.status = "cancelled";
  else if (status === "FAILED") upd.status = "past_due";
  await admin.from("subscriptions").update(upd).eq("id", sub.id);

  if (data.pf_payment_id) {
    await admin.from("payment_history").upsert({
      user_id: sub.user_id, subscription_id: sub.id, payfast_payment_id: data.pf_payment_id, provider: "payfast",
      amount: Number(data.amount_gross), currency: "ZAR", description: data.item_name, status: status.toLowerCase(),
    }, { onConflict: "payfast_payment_id", ignoreDuplicates: true });
  }
  return ok();
});
