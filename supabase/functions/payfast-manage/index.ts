import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { PF_MERCHANT_ID, PF_MODE, signApi } from "../_shared/payfast.ts";

const Body = z.object({ subscription_id: z.string().uuid(), action: z.enum(["cancel"]) });

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
    const { data: sub } = await admin.from("subscriptions").select("*")
      .eq("id", parsed.data.subscription_id).eq("user_id", user.id).maybeSingle();
    if (!sub?.payfast_token) return json({ error: "No active PayFast subscription found." }, 404);

    const headers = { "merchant-id": PF_MERCHANT_ID, version: "v1", timestamp: new Date().toISOString().slice(0, 19) };
    const signature = await signApi(headers);
    const res = await fetch(
      `https://api.payfast.co.za/subscriptions/${sub.payfast_token}/cancel${PF_MODE === "sandbox" ? "?testing=true" : ""}`,
      { method: "PUT", headers: { ...headers, signature } },
    );
    if (!res.ok) { console.error(await res.text()); return json({ error: "PayFast could not cancel the subscription." }, 502); }
    await admin.from("subscriptions").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", sub.id);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
