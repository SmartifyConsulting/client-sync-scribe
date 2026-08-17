// Idempotently provisions the "Dr Gianna Buttons" seeded doctor login so she
// appears (with a working account) in the profile switcher alongside the
// other seeded test profiles.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMAIL = "dr.gianna.buttons@smartify.co.za";
const PASSWORD = "GiannaButtons1234!";
const DOCTOR_NAME = "Dr Gianna Buttons";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    let userId: string | null = null;
    const created = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: DOCTOR_NAME },
    });
    if (created.data?.user) {
      userId = created.data.user.id;
    } else {
      const list = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
      const found = list.data?.users?.find((u) => u.email?.toLowerCase() === EMAIL);
      if (!found) throw new Error(created.error?.message ?? "Could not provision doctor user");
      userId = found.id;
      await admin.auth.admin.updateUserById(userId, { password: PASSWORD });
    }

    await admin.from("profiles").upsert(
      { id: userId, full_name: DOCTOR_NAME, country: "South Africa" } as any,
      { onConflict: "id" },
    );

    await admin.from("user_roles").upsert(
      { user_id: userId, role: "doctor" } as any,
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
