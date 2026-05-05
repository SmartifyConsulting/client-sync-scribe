import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { incident_id, tracking_token } = await req.json();
    if (!incident_id) {
      return new Response(JSON.stringify({ error: "incident_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    // Validate caller owns the incident
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: incident } = await supabase
      .from("holarchelp_incidents")
      .select("id, user_id, tracking_token, severity")
      .eq("id", incident_id)
      .maybeSingle();
    if (!incident || incident.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: corsHeaders });
    }

    const sevRank = (s?: string | null) => {
      switch ((s ?? "low").toLowerCase()) {
        case "critical": return 4;
        case "high": return 3;
        case "medium": return 2;
        default: return 1;
      }
    };
    const incidentRank = sevRank(incident.severity);
    const passes = (minSev?: string | null) => incidentRank >= sevRank(minSev ?? "low");

    const token = tracking_token ?? incident.tracking_token;
    const trackUrl = `${Deno.env.get("SUPABASE_URL")!.replace("supabase.co", "lovable.app")}/track/${token}`;

    // Gather recipients: emergency contacts (default) + NOK with explicit flag + profile shares with live-tracking flag
    const { data: patient } = await supabase
      .from("patients")
      .select("emergency_contact_name, emergency_contact_phone, emergency_contact_email, emergency_can_view_live_tracking, emergency_contacts, next_of_kin_name, next_of_kin_phone, next_of_kin_email, nok_can_view_live_tracking, next_of_kin_members, name")
      .eq("patient_user_id", user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    type Recip = { name: string; phone?: string; email?: string; via: string; min_severity?: string };
    const recipients: Recip[] = [];

    if (patient) {
      // primary EC (default true) — legacy fields, treat as low threshold
      if (patient.emergency_can_view_live_tracking !== false && patient.emergency_contact_name) {
        recipients.push({
          name: patient.emergency_contact_name,
          phone: patient.emergency_contact_phone || undefined,
          email: patient.emergency_contact_email || undefined,
          via: "emergency_contact",
          min_severity: "low",
        });
      }
      // additional EC list embedded on patient row
      const ecList = Array.isArray(patient.emergency_contacts) ? patient.emergency_contacts : [];
      for (const c of ecList as any[]) {
        if (c.can_view_live_tracking !== false && c.name) {
          recipients.push({ name: c.name, phone: c.phone, email: c.email, via: "emergency_contact", min_severity: c.notify_min_severity ?? "low" });
        }
      }
      // NOK only if explicit
      if (patient.nok_can_view_live_tracking === true && patient.next_of_kin_name) {
        recipients.push({
          name: patient.next_of_kin_name,
          phone: patient.next_of_kin_phone || undefined,
          email: patient.next_of_kin_email || undefined,
          via: "next_of_kin",
          min_severity: "low",
        });
      }
      const nokList = Array.isArray(patient.next_of_kin_members) ? patient.next_of_kin_members : [];
      for (const c of nokList as any[]) {
        if (c.can_view_live_tracking === true && c.name) {
          recipients.push({ name: c.name, phone: c.phone, email: c.email, via: "next_of_kin", min_severity: c.notify_min_severity ?? "low" });
        }
      }
    }

    // Standalone HolarcHelp emergency contacts table (with per-contact severity threshold)
    const { data: ecRows } = await supabase
      .from("holarchelp_emergency_contacts")
      .select("name, phone, email, notify_min_severity")
      .eq("user_id", user.id);
    for (const c of ecRows ?? []) {
      if ((c as any).name) {
        recipients.push({
          name: (c as any).name,
          phone: (c as any).phone ?? undefined,
          email: (c as any).email ?? undefined,
          via: "emergency_contact",
          min_severity: (c as any).notify_min_severity ?? "low",
        });
      }
    }

    // Profile shares with live-tracking
    const { data: shares } = await supabase
      .from("patient_profile_shares")
      .select("shared_with_email, shared_with_username")
      .eq("owner_user_id", user.id)
      .eq("can_view_live_tracking", true);
    for (const s of shares ?? []) {
      if ((s as any).shared_with_email) {
        recipients.push({ name: (s as any).shared_with_username ?? "Trusted contact", email: (s as any).shared_with_email, via: "profile_share", min_severity: "low" });
      }
    }

    // Apply severity threshold filter
    const filtered = recipients.filter((r) => passes(r.min_severity));

    // Send: prefer Resend for email; SMS provider not wired here — just log.
    const RESEND = Deno.env.get("RESEND_API_KEY");
    const sent: any[] = [];
    const patientName = patient?.name ?? "Your contact";
    const subject = `🚨 ${patientName} has triggered an SOS`;
    const html = `
      <p><strong>${patientName}</strong> has triggered an SOS via HolarcHealth.</p>
      <p>You can follow their live location here:</p>
      <p><a href="${trackUrl}" style="color:#E01837;font-weight:bold">Open live tracking</a></p>
      <p style="color:#666;font-size:12px">You're receiving this because you are listed as a trusted contact.</p>
    `;

    for (const r of filtered) {
      if (r.email && RESEND) {
        try {
          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "HolarcHealth SOS <sos@holarchealth.com>",
              to: [r.email],
              subject,
              html,
            }),
          });
          sent.push({ to: r.email, ok: resp.ok, via: r.via });
        } catch (e) {
          sent.push({ to: r.email, ok: false, error: String(e), via: r.via });
        }
      }
      // log message for SMS/whatsapp delivery to be implemented
      await supabase.from("holarchelp_messaging_log").insert({
        incident_id,
        user_id: user.id,
        recipient_name: r.name,
        recipient_phone: r.phone ?? null,
        recipient_email: r.email ?? null,
        channel: r.email ? "email" : "pending",
        status: r.email && RESEND ? "sent" : "queued",
        metadata: { tracking_url: trackUrl, via: r.via, severity: incident.severity, min_severity: r.min_severity },
      } as any).then(() => {}, () => {});
    }

    return new Response(JSON.stringify({ ok: true, sent, recipient_count: filtered.length, skipped: recipients.length - filtered.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
