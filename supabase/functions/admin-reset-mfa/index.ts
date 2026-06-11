// Admin-only: full account-access reset for a user who lost both their phone and
// backup codes. Unenrols every TOTP factor, wipes backup codes, and sets a
// temporary password that's returned to the admin once for secure delivery.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEMP_PW_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function genTempPassword(len = 14): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += TEMP_PW_CHARS[b % TEMP_PW_CHARS.length];
  // Ensure at least one letter + one digit to satisfy validators.
  return out.slice(0, len - 2) + "a4";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }
    const adminUserId = claims.claims.sub as string;

    // Authorize: caller must have admin role.
    const { data: isAdminData, error: roleErr } = await admin.rpc("has_role", {
      _user_id: adminUserId,
      _role: "admin",
    });
    if (roleErr || !isAdminData) {
      return json({ ok: false, error: "Forbidden" }, 403);
    }

    const body = await req.json();
    const targetUserId: string | undefined = body?.user_id;
    if (!targetUserId || typeof targetUserId !== "string") {
      return json({ ok: false, error: "user_id is required" }, 400);
    }

    // 1. Unenrol every TOTP factor by deleting the rows in auth.mfa_factors.
    const { error: delFactorErr } = await admin
      .schema("auth" as any)
      .from("mfa_factors")
      .delete()
      .eq("user_id", targetUserId)
      .eq("factor_type", "totp");
    if (delFactorErr) {
      return json({ ok: false, error: `Could not clear MFA: ${delFactorErr.message}` }, 500);
    }

    // 2. Wipe backup codes.
    await admin.from("mfa_backup_codes").delete().eq("user_id", targetUserId);

    // 3. Set a temporary password.
    const tempPassword = genTempPassword(14);
    const { error: updErr } = await admin.auth.admin.updateUserById(targetUserId, {
      password: tempPassword,
    });
    if (updErr) {
      return json({ ok: false, error: updErr.message }, 500);
    }

    // 4. Audit log.
    await admin.from("auth_recovery_audit").insert({
      user_id: targetUserId,
      ip,
      user_agent: `admin_reset by=${adminUserId} ${userAgent}`.slice(0, 500),
      success: true,
    });

    return json({ ok: true, temp_password: tempPassword });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
