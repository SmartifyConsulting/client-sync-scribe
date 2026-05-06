import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RL = new Map<string, { c: number; t: number }>();
function rateLimited(ip: string) {
  const now = Date.now();
  const entry = RL.get(ip);
  if (!entry || now - entry.t > 60_000) { RL.set(ip, { c: 1, t: now }); return false; }
  entry.c++;
  return entry.c > 5;
}

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (rateLimited(ip)) return bad("Too many requests", 429);

    const body = await req.json().catch(() => null);
    if (!body) return bad("invalid body");

    const type = body.type;
    if (type !== "hospital" && type !== "ambulance") return bad("type must be hospital or ambulance");
    const ownership = body.ownership;
    if (ownership !== "public" && ownership !== "private") return bad("ownership must be public or private");

    const company_name = (body.company_name ?? "").toString().trim();
    const email = (body.email ?? "").toString().trim().toLowerCase();
    const password = (body.password ?? "").toString();
    const first_name = (body.first_name ?? "").toString().trim();
    const last_name = (body.last_name ?? "").toString().trim();

    if (!company_name || company_name.length > 200) return bad("company_name required");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("invalid email");
    if (!password || password.length < 6) return bad("password must be at least 6 characters");
    if (!first_name || !last_name) return bad("contact first and last name required");

    const registration_number = body.registration_number ? String(body.registration_number).slice(0, 100) : null;
    const address = body.address ? String(body.address).slice(0, 500) : null;
    const city = body.city ? String(body.city).slice(0, 100) : null;
    const country = body.country ? String(body.country).slice(0, 100) : "South Africa";
    const phone = body.phone ? String(body.phone).slice(0, 50) : null;
    const latitude = typeof body.latitude === "number" ? body.latitude : null;
    const longitude = typeof body.longitude === "number" ? body.longitude : null;

    const fullName = `${first_name} ${last_name}`.trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: created, error: signErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name: fullName },
    });
    if (signErr || !created?.user) {
      console.error("createUser error", signErr);
      const code = (signErr as any)?.code;
      if (code === "email_exists" || /already been registered/i.test(signErr?.message ?? "")) {
        return bad("An account with this email already exists. Please sign in instead, or use a different contact email.", 409);
      }
      return bad(signErr?.message ?? "signup failed", 400);
    }
    const userId = created.user.id;

    await supabase.from("profiles").update({ full_name: fullName, mobile_number: phone }).eq("id", userId);

    if (type === "hospital") {
      const { error } = await supabase.from("holarchelp_hospitals").insert({
        owner_id: userId,
        name: company_name,
        registration_number,
        contact_email: email,
        contact_phone: phone,
        address,
        city,
        country,
        latitude,
        longitude,
        ownership,
        status: "pending",
      });
      if (error) {
        console.error("hospital insert error", error);
        return bad(error.message, 500);
      }
    } else {
      const { error } = await supabase.from("holarchelp_ambulance_providers").insert({
        owner_id: userId,
        company_name,
        registration_number,
        contact_email: email,
        contact_phone: phone,
        base_address: address,
        city,
        country,
        latitude,
        longitude,
        ownership,
        status: "pending",
      });
      if (error) {
        console.error("ambulance insert error", error);
        return bad(error.message, 500);
      }
    }

    return new Response(JSON.stringify({ user_id: userId }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("register-emergency-provider error", e);
    return bad(e instanceof Error ? e.message : "Unknown", 500);
  }
});
