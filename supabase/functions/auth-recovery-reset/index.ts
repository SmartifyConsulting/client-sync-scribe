// Public endpoint (no JWT): verify a TOTP code against the user's enrolled
// authenticator factor; on success, set a new password via the admin API.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import * as OTPAuth from "npm:otpauth@9.3.6";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeIdentifier(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  if (s.includes("@")) return s.toLowerCase();
  const cleaned = s.startsWith("+") ? "+" + s.slice(1).replace(/\D/g, "") : s.replace(/\D/g, "");
  const digits = cleaned.replace(/\D/g, "");
  return `${digits}@phone.holarc.local`;
}

function validPassword(pw: string): string | null {
  if (typeof pw !== "string" || pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password must contain a letter and a number";
  return null;
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  // listUsers paginates 50/page; iterate up to a sane cap.
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) return null;
    const hit = data.users.find((u) => (u.email || "").toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function rateLimited(ip: string, idHash: string): Promise<boolean> {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count: ipCount } = await admin
    .from("auth_recovery_attempts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since)
    .eq("ip", ip);
  if ((ipCount ?? 0) >= 10) return true;
  const { count: idCount } = await admin
    .from("auth_recovery_attempts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since)
    .eq("identifier_hash", idHash);
  return (idCount ?? 0) >= 5;
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
    const { identifier, code, newPassword } = await req.json();
    if (typeof identifier !== "string" || typeof code !== "string" || typeof newPassword !== "string") {
      return json({ ok: false, error: "Missing fields" }, 400);
    }
    const cleanCode = code.replace(/\D/g, "");
    if (cleanCode.length !== 6) return json({ ok: false, error: "Enter the 6-digit code" }, 400);
    const pwErr = validPassword(newPassword);
    if (pwErr) return json({ ok: false, error: pwErr }, 400);

    const email = normalizeIdentifier(identifier);
    const idHash = await sha256(email);
    const codeHash = await sha256(`${email}:${cleanCode}`);

    if (await rateLimited(ip, idHash)) {
      return json({ ok: false, error: "Too many attempts. Please wait 15 minutes." }, 429);
    }

    // Look up user + verified TOTP factor secret. Generic error if either missing.
    const userId = await findUserIdByEmail(email);
    let totpSecret: string | null = null;
    if (userId) {
      const { data: factors } = await admin
        .schema("auth" as any)
        .from("mfa_factors")
        .select("secret,status,factor_type")
        .eq("user_id", userId)
        .eq("factor_type", "totp")
        .eq("status", "verified")
        .limit(1);
      const factor = (factors as Array<{ secret: string }> | null)?.[0];
      totpSecret = factor?.secret ?? null;
    }

    const recordFailure = async () => {
      await admin.from("auth_recovery_attempts").insert({ ip, identifier_hash: idHash, code_hash: codeHash, success: false });
      await admin.from("auth_recovery_audit").insert({ user_id: userId, ip, user_agent: userAgent, success: false });
    };

    if (!userId || !totpSecret) {
      await recordFailure();
      return json({ ok: false, error: "That didn't match. Check your code and try again." }, 400);
    }

    // Prevent replay of the exact same code (within the rate-limit window).
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: replayCount } = await admin
      .from("auth_recovery_attempts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .eq("identifier_hash", idHash)
      .eq("code_hash", codeHash);
    if ((replayCount ?? 0) > 0) {
      await recordFailure();
      return json({ ok: false, error: "Code already used. Wait for the next one and try again." }, 400);
    }

    // Verify TOTP with ±1 step window for clock skew.
    const totp = new OTPAuth.TOTP({
      issuer: "Holarc Health",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(totpSecret),
    });
    const delta = totp.validate({ token: cleanCode, window: 1 });
    if (delta === null) {
      await recordFailure();
      return json({ ok: false, error: "That didn't match. Check your code and try again." }, 400);
    }

    // TOTP verified — update password.
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (updErr) {
      await recordFailure();
      return json({ ok: false, error: updErr.message }, 400);
    }

    await admin.from("auth_recovery_attempts").insert({ ip, identifier_hash: idHash, code_hash: codeHash, success: true });
    await admin.from("auth_recovery_audit").insert({ user_id: userId, ip, user_agent: userAgent, success: true });
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
