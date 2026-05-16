import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "admin required" }), { status: 403, headers: corsHeaders });

    const PATIENT_USER_ID = "2490a235-2194-401e-a82a-504bd66f0e5e"; // Paraskev
    const ANDREAS_EMAIL = "andreas.soldatos.test@holarchealth.test";
    const ANDREAS_NAME = "Andreas Soldatos";
    const tempPass = "Andreas!" + Math.random().toString(36).slice(-8);

    // Find or create Andreas auth user
    let andreasId: string | null = null;
    for (let page = 1; page <= 20; page++) {
      const { data } = await (admin as any).auth.admin.listUsers({ page, perPage: 1000 });
      const users = (data?.users ?? []) as any[];
      const match = users.find((u) => String(u.email ?? "").toLowerCase() === ANDREAS_EMAIL);
      if (match) { andreasId = match.id; break; }
      if (users.length < 1000) break;
    }
    let created = false;
    if (!andreasId) {
      const { data, error } = await (admin as any).auth.admin.createUser({
        email: ANDREAS_EMAIL,
        password: tempPass,
        email_confirm: true,
        user_metadata: { full_name: ANDREAS_NAME, role: "patient" },
      });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      andreasId = data?.user?.id ?? null;
      created = true;
    }

    // Patch patient row with email
    await admin.from("patients")
      .update({ emergency_contact_email: ANDREAS_EMAIL, emergency_can_view_live_tracking: true } as any)
      .eq("patient_user_id", PATIENT_USER_ID);

    return new Response(JSON.stringify({
      ok: true,
      andreas_user_id: andreasId,
      created,
      temp_password: created ? tempPass : null,
      email: ANDREAS_EMAIL,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
