import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RawRole = "doctor" | "patient" | "admin" | "hospital_staff" | "ambulance_staff" | "blood_bank" | "pharmacy_staff" | "nurse";
const VALID: RawRole[] = ["doctor", "patient", "admin", "hospital_staff", "ambulance_staff", "blood_bank", "pharmacy_staff", "nurse"];
const EMERGENCY: RawRole[] = ["hospital_staff", "ambulance_staff", "blood_bank", "pharmacy_staff"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdminRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!isAdminRow) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const userId: string = body.userId;
    const role: RawRole = body.role;
    if (!userId || !VALID.includes(role)) return json({ error: "Invalid input" }, 400);

    // Replace user_roles for this user with the single chosen role
    await admin.from("user_roles").delete().eq("user_id", userId);
    const { error: insErr } = await admin.from("user_roles").insert({ user_id: userId, role });
    if (insErr) return json({ error: insErr.message }, 500);

    // Set profiles.role to canonical bucket
    let profileRole: RawRole | null = role;
    if (EMERGENCY.includes(role)) profileRole = null; // emergency resolves via user_roles
    const { error: profErr } = await admin.from("profiles").update({ role: profileRole as any }).eq("id", userId);
    if (profErr) return json({ error: profErr.message }, 500);

    return json({ ok: true, role });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
