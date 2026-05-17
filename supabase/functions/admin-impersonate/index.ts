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

    // Seeded test users may switch back to the Georgia Adams admin profile
    // without being admins themselves. Any other target requires admin role.
    const REVERSE_ADMIN_EMAIL = "info@georgiaadams.co.za";
    const SEEDED_EMAILS = new Set([
      "sme@smartify.co.za",
      "dean.allie@gmail.com",
      "projectmanager@smartify.co.za",
      "paraskevoulasoldatos@gmail.com",
      "xtina@smartify.co.za",
      "christina@smartify.co.za",
      "zano@smartify.co.za",
      "renken@smartify.co.za",
      "jeanprodromos@smartify.co.za",
      "hospital.test@holarchealth.com",
      "er.test@holarchealth.com",
    ]);
    const isReverseToAdmin = email === REVERSE_ADMIN_EMAIL && SEEDED_EMAILS.has(callerEmail);

    if (!isReverseToAdmin) {
      const { data: isAdmin } = await sb.rpc("has_role", { _user_id: callerId, _role: "admin" });
      if (!isAdmin) throw new Error("Admin role required");
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
