// Called (fire-and-forget) by Postgres triggers on auth.users — see the
// handle_new_user() and notify_admin_on_login() functions — to email the
// admin whenever anyone signs up or logs in to Holarc Health.
import { sendEmail } from "../_shared/email.ts";

const ADMIN_EMAIL = "georgia.adams@smartify.co.za";
// Shared secret checked against the header the DB triggers send, since this
// function has no user session to verify (it's called from Postgres, not
// the browser) and therefore runs with verify_jwt = false.
const SHARED_SECRET = "holarc-admin-notify-8f2c";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-notify-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.headers.get("x-notify-secret") !== SHARED_SECRET) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const type: string = body.type === "login" ? "login" : "signup";
    const email: string = body.email || "unknown";
    const fullName: string = body.full_name || "";
    const role: string = body.role || "";
    const when = new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" });

    const subject = type === "signup"
      ? `New Holarc Health signup: ${fullName || email}`
      : `Holarc Health login: ${fullName || email}`;

    const html = `
      <div style="font-family:Arial,sans-serif;padding:16px;color:#222;">
        <p style="font-size:16px;font-weight:bold;">${type === "signup" ? "New sign-up" : "Login"} on Holarc Health</p>
        <table style="border-collapse:collapse;">
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Name</td><td>${fullName || "—"}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td>${email}</td></tr>
          ${role ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Role</td><td>${role}</td></tr>` : ""}
          <tr><td style="padding:4px 12px 4px 0;color:#666;">When</td><td>${when} (SAST)</td></tr>
        </table>
      </div>`;

    const result = await sendEmail({ to: ADMIN_EMAIL, subject, html });

    return new Response(JSON.stringify({ ok: result.ok, error: result.error }), {
      status: result.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
