import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Not authenticated" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const callerId = userData.user.id;

    const body = await req.json().catch(() => null);
    const provider_id = body?.provider_id as string | undefined;
    const provider_type = body?.provider_type as "hospital" | "ambulance" | undefined;
    const email = String(body?.email ?? "").trim().toLowerCase();
    const name = body?.name ? String(body.name).trim().slice(0, 200) : null;

    if (!provider_id || (provider_type !== "hospital" && provider_type !== "ambulance"))
      return json({ error: "provider_id and provider_type required" }, 400);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return json({ error: "Valid email required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Authorise: caller must be owner OR existing admin
    const rpcName = provider_type === "hospital" ? "is_hospital_admin" : "is_ambulance_admin";
    const rpcArg = provider_type === "hospital" ? "_hospital_id" : "_provider_id";
    const { data: okData, error: okErr } = await admin.rpc(rpcName, {
      [rpcArg]: provider_id,
      _user_id: callerId,
    } as any);
    if (okErr) return json({ error: okErr.message }, 500);
    if (!okData) return json({ error: "Only the owner or an existing admin can invite" }, 403);

    // Look up an existing user with this email via the auth admin API
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existingUser = list?.users?.find(
      (u) => (u.email ?? "").toLowerCase() === email,
    ) ?? null;

    const table =
      provider_type === "hospital"
        ? "holarchelp_hospital_members"
        : "holarchelp_ambulance_members";
    const fkCol = provider_type === "hospital" ? "hospital_id" : "provider_id";

    // Already a member?
    if (existingUser) {
      const { data: dup } = await admin
        .from(table)
        .select("id")
        .eq(fkCol, provider_id)
        .eq("user_id", existingUser.id)
        .maybeSingle();
      if (dup) return json({ error: "This user is already an administrator." }, 409);
    }

    const inviteToken = crypto.randomUUID();
    const row: Record<string, unknown> = {
      [fkCol]: provider_id,
      role: "admin",
      invited_email: email,
      invited_name: name,
      invited_by: callerId,
      invite_token: inviteToken,
      invite_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };
    if (existingUser) {
      row.user_id = existingUser.id;
      row.accepted_at = new Date().toISOString();
    }

    const { error: insErr } = await admin.from(table).insert(row);
    if (insErr) {
      if (insErr.code === "23505") return json({ error: "An invite already exists for this email." }, 409);
      return json({ error: insErr.message }, 500);
    }

    // If user does not yet exist, send a magic-link / invite email via Supabase Auth
    if (!existingUser) {
      const origin = req.headers.get("origin") ?? "https://holarchealth.com";
      try {
        await admin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: name },
          redirectTo: `${origin}/auth?mode=signup`,
        });
      } catch (e) {
        console.error("inviteUserByEmail failed", e);
        // Non-fatal — the pending row is created and link_pending_provider_admin_invites
        // trigger will activate the admin when they sign up.
      }
    }

    return json({ ok: true, linked: !!existingUser });
  } catch (e) {
    console.error("invite-provider-admin error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
