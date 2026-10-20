import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

// Encrypts/decrypts broker portal credentials (AES-256-GCM). This is the ONLY
// place plaintext passwords/pins are ever handled server-side; nothing else
// should read/write broker_integration_credentials directly.
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("protector_status") }),
  z.object({ action: z.literal("set_protector"), passcode: z.string().min(4).max(100), currentPasscode: z.string().max(100).optional() }),
  z.object({ action: z.literal("reset_protector"), accountPassword: z.string().min(1), newPasscode: z.string().min(4).max(100) }),
  z.object({ action: z.literal("reauth"), passcode: z.string().min(1) }),
  z.object({ action: z.literal("list") }),
  z.object({ action: z.literal("reveal"), integrationId: z.string().min(1), token: z.string().min(1) }),
  z.object({
    action: z.literal("save"),
    integrationId: z.string().min(1),
    username: z.string().trim().max(200).optional().nullable(),
    fields: z.record(z.string(), z.string().max(500)), // e.g. { password: "...", pin: "..." }
    token: z.string().min(1),
  }),
  z.object({ action: z.literal("toggle"), integrationId: z.string().min(1), isEnabled: z.boolean() }),
]);

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const REAUTH_TTL_MS = 10 * 60 * 1000;

// ---- re-auth token: HMAC-signed `${brokerUserId}.${exp}`, base64url ----
async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlToBytes = (s: string) => {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

async function signToken(secret: string, brokerUserId: string) {
  const exp = Date.now() + REAUTH_TTL_MS;
  const payload = `${brokerUserId}.${exp}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${b64url(new Uint8Array(sig))}`;
}

async function verifyToken(secret: string, token: string, brokerUserId: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [uid, expStr, sigB64] = parts;
  if (uid !== brokerUserId) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const key = await hmacKey(secret);
  const expected = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${uid}.${expStr}`));
  const expectedB64 = b64url(new Uint8Array(expected));
  // constant-time-ish compare
  if (expectedB64.length !== sigB64.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedB64.length; i++) diff |= expectedB64.charCodeAt(i) ^ sigB64.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- AES-256-GCM for credential payloads ----
async function aesKey(secretB64: string) {
  const raw = Uint8Array.from(atob(secretB64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptJson(secretB64: string, data: unknown): Promise<string> {
  const key = await aesKey(secretB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);
  return b64url(combined);
}

async function decryptJson(secretB64: string, blob: string): Promise<Record<string, string>> {
  const key = await aesKey(secretB64);
  const combined = b64urlToBytes(blob);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Invalid request." }, 400);
    const p = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const encryptionKey = Deno.env.get("CREDENTIALS_ENCRYPTION_KEY");
    const reauthSecret = Deno.env.get("CREDENTIALS_ENCRYPTION_KEY"); // reuse as HMAC secret too

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized." }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    if (p.action === "protector_status") {
      const { data: row } = await admin
        .from("broker_security_settings")
        .select("password_protector_hash")
        .eq("broker_user_id", user.id)
        .maybeSingle();
      return json({ isSet: !!row?.password_protector_hash });
    }

    if (p.action === "set_protector") {
      const { data: row } = await admin
        .from("broker_security_settings")
        .select("password_protector_hash")
        .eq("broker_user_id", user.id)
        .maybeSingle();

      if (row?.password_protector_hash) {
        if (!p.currentPasscode) return json({ error: "Current Password Protector required." }, 401);
        if ((await sha256Hex(p.currentPasscode)) !== row.password_protector_hash) {
          return json({ error: "Current Password Protector is incorrect." }, 401);
        }
      }

      const newHash = await sha256Hex(p.passcode);
      const { error } = await admin
        .from("broker_security_settings")
        .upsert({ broker_user_id: user.id, password_protector_hash: newHash }, { onConflict: "broker_user_id" });
      if (error) return json({ error: "Could not save Password Protector." }, 500);
      return json({ ok: true });
    }

    if (p.action === "reset_protector") {
      // Forgot the Password Protector: fall back to confirming the account login password.
      const { data: userRow } = await admin.auth.admin.getUserById(user.id);
      const email = userRow?.user?.email;
      if (!email) return json({ error: "Could not verify account." }, 400);

      const verifyClient = createClient(supabaseUrl, anonKey);
      const { error: signInError } = await verifyClient.auth.signInWithPassword({ email, password: p.accountPassword });
      if (signInError) return json({ error: "Incorrect account password." }, 401);

      const newHash = await sha256Hex(p.newPasscode);
      const { error } = await admin
        .from("broker_security_settings")
        .upsert({ broker_user_id: user.id, password_protector_hash: newHash }, { onConflict: "broker_user_id" });
      if (error) return json({ error: "Could not reset Password Protector." }, 500);
      return json({ ok: true });
    }

    if (p.action === "reauth") {
      const { data: row } = await admin
        .from("broker_security_settings")
        .select("password_protector_hash")
        .eq("broker_user_id", user.id)
        .maybeSingle();
      if (!row?.password_protector_hash) return json({ error: "Password Protector not set up yet." }, 400);
      if ((await sha256Hex(p.passcode)) !== row.password_protector_hash) {
        return json({ error: "Incorrect Password Protector." }, 401);
      }

      if (!reauthSecret) return json({ error: "Server misconfigured." }, 500);
      const token = await signToken(reauthSecret, user.id);
      return json({ token, expiresInMs: REAUTH_TTL_MS });
    }

    if (p.action === "list") {
      const { data: rows, error } = await admin
        .from("broker_integration_credentials")
        .select("integration_id, is_enabled, username, status, updated_at, encrypted_credentials")
        .eq("broker_user_id", user.id);
      if (error) return json({ error: "Could not load integrations." }, 500);

      const credentials = (rows ?? []).map((r) => ({
        integration_id: r.integration_id,
        is_enabled: r.is_enabled,
        status: r.status,
        updated_at: r.updated_at,
        has_credentials: !!r.encrypted_credentials,
      }));
      return json({ credentials });
    }

    if (p.action === "toggle") {
      const { error } = await admin
        .from("broker_integration_credentials")
        .upsert(
          { broker_user_id: user.id, integration_id: p.integrationId, is_enabled: p.isEnabled },
          { onConflict: "broker_user_id,integration_id" },
        );
      if (error) return json({ error: "Could not update integration." }, 500);
      return json({ ok: true });
    }

    // reveal/save require a valid re-auth token
    if (!reauthSecret || !(await verifyToken(reauthSecret, p.token, user.id))) {
      return json({ error: "Re-authentication required or expired." }, 401);
    }
    if (!encryptionKey) return json({ error: "Server misconfigured." }, 500);

    if (p.action === "reveal") {
      const { data: row, error } = await admin
        .from("broker_integration_credentials")
        .select("username, encrypted_credentials")
        .eq("broker_user_id", user.id)
        .eq("integration_id", p.integrationId)
        .maybeSingle();
      if (error) return json({ error: "Could not load credentials." }, 500);
      if (!row?.encrypted_credentials) return json({ username: row?.username ?? null, fields: {} });

      const fields = await decryptJson(encryptionKey, row.encrypted_credentials);
      return json({ username: row.username, fields });
    }

    if (p.action === "save") {
      const encrypted = await encryptJson(encryptionKey, p.fields);
      const { error } = await admin
        .from("broker_integration_credentials")
        .upsert(
          {
            broker_user_id: user.id,
            integration_id: p.integrationId,
            username: p.username ?? null,
            encrypted_credentials: encrypted,
            status: "configured",
          },
          { onConflict: "broker_user_id,integration_id" },
        );
      if (error) return json({ error: "Could not save credentials." }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? "Unexpected error." }, 500);
  }
});
