// Authenticated endpoint: generates a fresh set of 8 one-time backup codes for the
// currently signed-in user. Old (unused) codes are invalidated. Plaintext codes are
// returned ONCE in the response; only SHA-256 hashes are persisted.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BACKUP_CODE_COUNT = 8;
// Crockford-ish base32: avoid 0/O/1/I confusion.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const chars: string[] = [];
  for (const b of bytes) chars.push(ALPHABET[b % ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}`;
}

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

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
    const userId = claims.claims.sub as string;

    // Wipe any prior codes (used or unused) and replace with a fresh set.
    await admin.from("mfa_backup_codes").delete().eq("user_id", userId);

    const plaintext: string[] = [];
    const rows: Array<{ user_id: string; code_hash: string }> = [];
    while (plaintext.length < BACKUP_CODE_COUNT) {
      const code = genCode();
      if (plaintext.includes(code)) continue;
      plaintext.push(code);
      rows.push({ user_id: userId, code_hash: await sha256(code) });
    }

    const { error: insErr } = await admin.from("mfa_backup_codes").insert(rows);
    if (insErr) return json({ ok: false, error: insErr.message }, 500);

    return json({ ok: true, codes: plaintext });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
