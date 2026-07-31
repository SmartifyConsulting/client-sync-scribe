import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "info@georgiaadams.co.za";

const KIND_LABEL: Record<string, string> = {
  hospital: "Hospital",
  esp: "Emergency Service Provider",
  insurance: "Insurance Company",
  pharmacy: "Pharmacy",
};

interface Payload {
  kind: "hospital" | "esp" | "insurance" | "pharmacy";
  providerId: string;
}

const KIND_TABLE: Record<string, { table: string; nameCol: string; addressCol: string }> = {
  hospital: { table: "holarchelp_hospitals", nameCol: "name", addressCol: "address" },
  esp: { table: "holarchelp_ambulance_providers", nameCol: "company_name", addressCol: "base_address" },
  insurance: { table: "holarchelp_insurance_providers", nameCol: "company_name", addressCol: "base_address" },
  pharmacy: { table: "holarchelp_pharmacies", nameCol: "name", addressCol: "address" },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    if (!body?.kind || !body?.providerId || !UUID_RE.test(body.providerId)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!KIND_LABEL[body.kind] || !KIND_TABLE[body.kind]) {
      return new Response(JSON.stringify({ error: "Invalid kind" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- Authentication: caller must be signed in ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = jwt
      ? await supabase.auth.getUser(jwt)
      : { data: { user: null }, error: new Error("missing token") } as any;
    const caller = userData?.user;
    if (userErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Authorization: caller must own the referenced provider record ---
    const cfg = KIND_TABLE[body.kind];
    const { data: provider, error: provErr } = await supabase
      .from(cfg.table)
      .select("*")
      .eq("id", body.providerId)
      .maybeSingle();

    if (provErr) throw provErr;
    if (!provider || (provider as any).owner_id !== caller.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All display values come from the verified DB row, never from the client.
    const verified = {
      orgName: (provider as any)[cfg.nameCol] as string,
      address: (provider as any)[cfg.addressCol] as string | null,
      registrationNumber: (provider as any).registration_number as string | null,
      orgEmail: (provider as any).contact_email as string | null,
      orgPhone: (provider as any).contact_phone as string | null,
      adminName: (provider as any).admin_full_name as string | null,
      adminEmail: (provider as any).admin_email as string | null,
      adminPhone: (provider as any).admin_phone as string | null,
    };

    // Create approval token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from("provider_approval_tokens")
      .insert({ provider_kind: body.kind, provider_id: body.providerId })
      .select("token")
      .single();
    if (tokenErr) throw tokenErr;

    const token = tokenRow.token;
    const origin =
      req.headers.get("origin") ||
      Deno.env.get("APP_PUBLIC_ORIGIN") ||
      "https://holarchealth.com";
    const approveUrl = `${origin}/admin/provider-approval?token=${token}&action=approve`;
    const rejectUrl = `${origin}/admin/provider-approval?token=${token}&action=reject`;

    const kindLabel = KIND_LABEL[body.kind];
    const subject = `New ${kindLabel} application — ${verified.orgName}`;


    const esc = (s: string | null | undefined) =>
      String(s ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
      );

    const html = `
<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;font-family:Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #e5e7eb">
          <h1 style="margin:0;font-size:20px">New ${esc(kindLabel)} application</h1>
          <p style="margin:6px 0 0;color:#64748b;font-size:14px">Awaiting your approval — Holarc Health</p>
        </td></tr>
        <tr><td style="padding:20px 28px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.55">
            <tr><td style="padding:4px 0;color:#64748b;width:160px">Organisation</td><td><strong>${esc(verified.orgName)}</strong></td></tr>
            <tr><td style="padding:4px 0;color:#64748b">Type</td><td>${esc(kindLabel)}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b">Registration #</td><td>${esc(verified.registrationNumber)}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b">Address</td><td>${esc(verified.address)}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b">Org email</td><td>${esc(verified.orgEmail)}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b">Org phone</td><td>${esc(verified.orgPhone)}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b">Administrator</td><td>${esc(verified.adminName)}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b">Admin email</td><td>${esc(verified.adminEmail)}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b">Admin phone</td><td>${esc(verified.adminPhone)}</td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:8px 28px 28px">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding:0 8px"><a href="${approveUrl}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px">✓ Approve</a></td>
            <td style="padding:0 8px"><a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px">✕ Reject</a></td>
          </tr></table>
          <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">This link expires in 30 days and can be used once.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const text = `New ${kindLabel} application: ${verified.orgName}
Administrator: ${verified.adminName} <${verified.adminEmail}>
Registration #: ${verified.registrationNumber ?? ""}

Approve: ${approveUrl}
Reject:  ${rejectUrl}`;

    const result = await sendEmail({
      to: ADMIN_EMAIL,
      subject,
      html,
      text,
      replyTo: verified.adminEmail ?? undefined,
    });

    if (!result.ok) {
      console.error("notify-provider-application email failed", result);
      return new Response(JSON.stringify({ error: result.error ?? "Email send failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-provider-application error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
