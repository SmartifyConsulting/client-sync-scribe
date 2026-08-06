// Idempotently provisions the demo nurse login and links it to an existing
// hospital_nurses record so the nurse portal (My Shift / My Patients) works.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMAIL = "nurse.test@holarchealth.com";
const PASSWORD = "NurseTest1234!";
const NURSE_NAME = "Nomvula Dlamini";

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
      user_metadata: { full_name: NURSE_NAME },
    });
    if (created.data?.user) {
      userId = created.data.user.id;
    } else {
      const list = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
      const found = list.data?.users?.find((u) => u.email?.toLowerCase() === EMAIL);
      if (!found) throw new Error(created.error?.message ?? "Could not provision nurse user");
      userId = found.id;
      await admin.auth.admin.updateUserById(userId, { password: PASSWORD });
    }

    // 2. Profile (role stays unset — the nurse role lives in user_roles).
    await admin.from("profiles").upsert(
      { id: userId, full_name: NURSE_NAME, country: "South Africa" } as any,
      { onConflict: "id" },
    );

    // 3. Nurse role.
    await admin.from("user_roles").upsert(
      { user_id: userId, role: "nurse" } as any,
      { onConflict: "user_id,role" },
    );

    // 4. Link the nurse record.
    const { data: nurse } = await admin
      .from("hospital_nurses")
      .select("id, hospital_id")
      .eq("full_name", NURSE_NAME)
      .limit(1)
      .maybeSingle();

    if (nurse?.id) {
      await admin.from("hospital_nurses").update({ linked_user_id: userId }).eq("id", nurse.id);
    }

    return new Response(
      JSON.stringify({ ok: true, email: EMAIL, password: PASSWORD, user_id: userId, nurse_id: nurse?.id ?? null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
