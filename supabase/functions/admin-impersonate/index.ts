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

    // Test users and admins can switch profiles. Test users can switch to any other test user.
    const SEEDED_EMAILS = new Set([
      "info@georgiaadams.co.za", // Georgia Adams (Admin)
      "sme@smartify.co.za", // Dr Dean Allie (Doctor)
      "dean.allie@gmail.com", // Dr Dean Allie (Patient)
      "zano@smartify.co.za", // Zano (Hospital)
      "renken@smartify.co.za", // Renken (ER Provider)
      "hospital.test@holarchealth.com", // Hospital Admin (Test)
      "er.test@holarchealth.com", // ER Provider (Test)
    ]);

    const isCallerSeededTest = SEEDED_EMAILS.has(callerEmail);
    const isTargetSeededTest = SEEDED_EMAILS.has(email);

    // Allow: test users switching to any seeded test user, or admins switching to anyone
    let hasPermission = false;
    if (isCallerSeededTest && isTargetSeededTest) {
      hasPermission = true; // Test users can switch between test profiles
    } else {
      const { data: isAdmin } = await sb.rpc("has_role", { _user_id: callerId, _role: "admin" });
      if (isAdmin) hasPermission = true; // Admins can switch to anyone
    }

    if (!hasPermission) throw new Error("Only test users and admins can use profile switcher");

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
