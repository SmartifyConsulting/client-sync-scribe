// Idempotently provision the developer test ER (ambulance) account for
// "National Emergency Medical Services" so the team can one-click sign in
// and test the SOS pickup → destination hospital flow.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMAIL = "ner.test@holarchealth.test";
const PASSWORD = "ErTest1234!";
const PROVIDER_ID = "5f379ceb-b139-415d-b6c7-eec18be4a625"; // NEMS, Randburg

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Find or create the auth user.
    let userId: string | null = null;
    const created = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "NEMS Dispatcher" },
    });
    if (created.data?.user) {
      userId = created.data.user.id;
    } else {
      // Already exists — locate it.
      const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list.data?.users?.find((u) => u.email?.toLowerCase() === EMAIL);
      if (!found) throw new Error(created.error?.message ?? "Could not provision user");
      userId = found.id;
      // Ensure password matches the documented dev password.
      await admin.auth.admin.updateUserById(userId, { password: PASSWORD });
    }

    // 2. Profile row.
    await admin
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: "NEMS Dispatcher",
          country: "South Africa",
          holarchelp_enabled: true,
        } as any,
        { onConflict: "id" },
      );

    // 3. Role.
    await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "ambulance_staff" } as any, {
        onConflict: "user_id,role",
      });

    // 4. Membership on the NEMS provider.
    await admin
      .from("holarchelp_ambulance_members")
      .upsert(
        {
          provider_id: PROVIDER_ID,
          user_id: userId,
          role: "admin",
          accepted_at: new Date().toISOString(),
        } as any,
        { onConflict: "provider_id,user_id" },
      );

    return new Response(
      JSON.stringify({
        ok: true,
        email: EMAIL,
        password: PASSWORD,
        user_id: userId,
        provider_id: PROVIDER_ID,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
