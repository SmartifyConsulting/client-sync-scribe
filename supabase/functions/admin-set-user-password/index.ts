import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePassword(len = 14): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  // Guarantee one of each class
  const chars = [
    upper[buf[0] % upper.length],
    lower[buf[1] % lower.length],
    digits[buf[2] % digits.length],
    symbols[buf[3] % symbols.length],
  ];
  for (let i = 4; i < len; i++) chars.push(all[buf[i] % all.length]);
  // Shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

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
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin role required");

    const body = await req.json().catch(() => ({}));
    const email: string | undefined = body?.email?.toString().trim().toLowerCase();
    const userId: string | undefined = body?.userId?.toString();
    const explicitPassword: string | undefined = body?.password;
    const autoGenerate: boolean = body?.auto_generate === true || !explicitPassword;
    const sendByEmail: boolean = body?.send_email !== false; // default true
    const createIfMissing: boolean = body?.create_if_missing === true;
    const fullName: string | undefined = body?.full_name;

    if (!email && !userId) throw new Error("email or userId required");

    let targetId = userId ?? null;
    let targetEmail = email ?? null;

    if (!targetId && email) {
      const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list?.users.find((u) => u.email?.toLowerCase() === email);
      if (found) {
        targetId = found.id;
        targetEmail = found.email ?? email;
      }
    } else if (targetId) {
      const { data: u } = await sb.auth.admin.getUserById(targetId);
      targetEmail = u?.user?.email ?? targetEmail;
    }

    const password = autoGenerate ? generatePassword(14) : (explicitPassword as string);

    let action: "created" | "password_updated" = "password_updated";
    if (!targetId) {
      if (!createIfMissing) throw new Error(`User not found: ${email}`);
      if (!targetEmail) throw new Error("email required to create user");
      const { data: created, error: ce } = await sb.auth.admin.createUser({
        email: targetEmail,
        password,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : undefined,
      });
      if (ce) throw ce;
      targetId = created.user!.id;
      action = "created";
    } else {
      const { error: ue } = await sb.auth.admin.updateUserById(targetId, { password });
      if (ue) throw ue;
    }

    let emailed = false;
    let emailError: string | undefined;
    if (sendByEmail && targetEmail) {
      const appUrl = Deno.env.get("APP_URL") || "https://holarchealth.com";
      const subject = action === "created"
        ? "Your Holarc Health account is ready"
        : "Your Holarc Health password has been reset";
      const html = `
        <!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111">
          <div style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:28px;border-radius:12px 12px 0 0;color:white">
            <h1 style="margin:0;font-size:24px">${action === "created" ? "Welcome to Holarc Health" : "Password reset"}</h1>
          </div>
          <div style="background:#f8fafc;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
            <p>${action === "created" ? "An account has been created for you on Holarc Health." : "An administrator has reset your password."}</p>
            <p>You can sign in with the credentials below. <strong>Please change your password after your first login.</strong></p>
            <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;font-family:'SF Mono',Menlo,monospace">
              <div><strong>Email:</strong> ${targetEmail}</div>
              <div style="margin-top:8px"><strong>Password:</strong> <span style="font-size:16px">${password}</span></div>
            </div>
            <div style="text-align:center;margin:24px 0">
              <a href="${appUrl}/auth" style="background:#0d9488;color:white;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block">Sign in</a>
            </div>
            <p style="color:#64748b;font-size:12px;margin-top:24px">If you weren't expecting this email, please contact support.</p>
          </div>
        </body></html>`;
      const result = await sendEmail({ to: targetEmail, subject, html });
      emailed = result.ok;
      emailError = result.error;
    }

    return new Response(JSON.stringify({
      ok: true,
      action,
      user_id: targetId,
      email: targetEmail,
      password, // returned to admin once, for copy-to-clipboard
      emailed,
      email_error: emailError,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
