import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) throw new Error("Missing auth");

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, service);

    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData?.user) throw new Error("Invalid auth");
    const callerId = userData.user.id;
    const callerEmail = (userData.user.email || "").toLowerCase();

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Valid email required");

    // Seeded test users may switch to any other seeded test profile (including
    // Georgia Adams admin) without needing the admin role themselves. Any
    // target outside this list still requires admin.
    const REVERSE_ADMIN_EMAIL = "info@georgiaadams.co.za";
    const SEEDED_EMAILS = new Set([
      "info@georgiaadams.co.za",
      "georgia.adams@smartify.co.za",
      "sme@smartify.co.za",
      "dean.allie@gmail.com",
      "projectmanager@smartify.co.za",
      "zano@smartify.co.za",
      "renken@smartify.co.za",
      "hospital.test@holarchealth.com",
      "er.test@holarchealth.com",
      "ifeanyi.okoli@greenoriagroup.com",
      "dr.buttons@smartify.co.za",
      "dr.gianna.buttons@smartify.co.za",
      "nurse.test@holarchealth.com",

      "2348167581572@phone.holarc.local",
    ]);
    const callerIsSeeded = SEEDED_EMAILS.has(callerEmail);
    const targetIsSeeded = SEEDED_EMAILS.has(email);
    const isSeededSwitch = callerIsSeeded && targetIsSeeded;

    if (!isSeededSwitch) {
      const { data: isAdmin } = await sb.rpc("has_role", { _user_id: callerId, _role: "admin" });
      if (!isAdmin) throw new Error("Admin role required");
    }

    // Some seeded test accounts (added to the profile switcher before their
    // login was ever provisioned) don't exist yet — self-heal by creating
    // them on first switch attempt instead of requiring a separate deploy.
    const AUTO_PROVISION: Record<string, { full_name: string; role: string }> = {
      "dr.gianna.buttons@smartify.co.za": { full_name: "Dr Gianna Buttons", role: "doctor" },
    };
    if (AUTO_PROVISION[email]) {
      const { data: existing } = await sb.auth.admin.listUsers({ page: 1, perPage: 500 });
      const found = existing?.users?.find((u) => u.email?.toLowerCase() === email);
      if (!found) {
        const info = AUTO_PROVISION[email];
        const created = await sb.auth.admin.createUser({
          email,
          password: crypto.randomUUID(),
          email_confirm: true,
          user_metadata: { full_name: info.full_name },
        });
        const newUserId = created.data?.user?.id;
        if (created.error || !newUserId) throw new Error(created.error?.message ?? "Could not provision account");
        await sb.from("profiles").upsert({ id: newUserId, full_name: info.full_name, country: "South Africa" } as any, { onConflict: "id" });
        await sb.from("user_roles").upsert({ user_id: newUserId, role: info.role } as any, { onConflict: "user_id,role" });
      }
    }

    const { data, error } = await sb.auth.admin.generateLink({ type: "magiclink", email });
    if (error) throw error;

    const token_hash = (data as any)?.properties?.hashed_token ?? (data as any)?.hashed_token;
    if (!token_hash) throw new Error("Failed to mint token");

    return new Response(JSON.stringify({ email, token_hash }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
