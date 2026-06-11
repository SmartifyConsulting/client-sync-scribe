// Public endpoint (no JWT): given an identifier (email or phone), confirm we can
// proceed to the TOTP step. Always returns the same generic shape so an attacker
// cannot probe for which accounts exist.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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
  // Phone: strip everything but digits and + ; map to synthetic email used at signup.
  const cleaned = s.startsWith("+") ? "+" + s.slice(1).replace(/\D/g, "") : s.replace(/\D/g, "");
  const digits = cleaned.replace(/\D/g, "");
  return `${digits}@phone.holarc.local`;
}

async function tooManyAttempts(ip: string, idHash: string): Promise<boolean> {
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

  try {
    const { identifier } = await req.json();
    if (typeof identifier !== "string" || !identifier.trim()) {
      return json({ ok: false, error: "Identifier required" }, 400);
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const email = normalizeIdentifier(identifier);
    const idHash = await sha256(email);

    if (await tooManyAttempts(ip, idHash)) {
      return json({ ok: false, error: "Too many attempts. Please wait 15 minutes." }, 429);
    }

    // Generic success message regardless of whether the user exists or has TOTP.
    // We still record an attempt for rate-limiting.
    await admin.from("auth_recovery_attempts").insert({ ip, identifier_hash: idHash, success: false });
    return json({ ok: true, message: "If this account exists, enter the 6-digit code from your authenticator app." });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
