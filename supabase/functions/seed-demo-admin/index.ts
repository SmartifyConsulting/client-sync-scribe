// Idempotently provisions the georgia.adams@smartify.co.za demo admin login
// so it works in the Avatar/profile switcher alongside the other seeded profiles.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMAIL = "georgia.adams@smartify.co.za";
const PASSWORD = "SmartifyAdmin1234!";
const FULL_NAME = "Georgia Adams";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 1. Auth user.
    let userId: string | null = null;
    const created = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME },
    });
    if (created.data?.user) {
      userId = created.data.user.id;
    } else {
      const list = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
      const found = list.data?.users?.find((u) => u.email?.toLowerCase() === EMAIL);
      if (!found) throw new Error(created.error?.message ?? "Could not provision demo admin user");
      userId = found.id;
      await admin.auth.admin.updateUserById(userId, { password: PASSWORD });
    }

    // 2. Profile.
    await admin.from("profiles").upsert(
      { id: userId, full_name: FULL_NAME, country: "South Africa" } as any,
      { onConflict: "id" },
    );

    // 3. Admin role.
    await admin.from("user_roles").upsert(
      { user_id: userId, role: "admin" } as any,
      { onConflict: "user_id,role" },
    );

    return new Response(
      JSON.stringify({ ok: true, email: EMAIL, password: PASSWORD, user_id: userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
